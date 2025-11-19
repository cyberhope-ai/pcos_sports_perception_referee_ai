"""
Video Processing Pipeline - Phase 2

Orchestrates: Video Ingestion → Detection → Tracking → DB Storage

Follows PCOS Pipeline Templates and Vision Standards.
"""
import cv2
import logging
from typing import List, Optional
from pathlib import Path
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from ..perception.detector import Detector, DetectorConfig
from ..tracking.tracker import Tracker, TrackerConfig
from ..models import Game, Actor, Detection as DBDetection, ActorType
from ..config import settings

logger = logging.getLogger(__name__)


class VideoProcessor:
    """
    Video processing pipeline: Detection → Tracking → Storage.

    Phase 2 Implementation:
    - Frame-by-frame or batched processing
    - YOLOv8s detection
    - ByteTrack tracking
    - Database persistence
    """

    def __init__(self):
        """Initialize processor with detector and tracker"""
        # Detector config from settings
        self.detector_config = DetectorConfig(
            model_path=settings.YOLO_MODEL_PATH,
            device=settings.VISION_DEVICE,
            confidence_threshold=settings.DETECTOR_CONFIDENCE,
            iou_threshold=settings.DETECTOR_IOU,
            max_detections=settings.DETECTOR_MAX_DET,
            imgsz=settings.DETECTOR_IMGSZ,
            half=settings.VISION_USE_FP16
        )

        # Tracker config from settings
        self.tracker_config = TrackerConfig(
            track_thresh=settings.TRACKER_TRACK_THRESH,
            match_thresh=settings.TRACKER_MATCH_THRESH,
            track_buffer=settings.TRACKER_BUFFER,
            trajectory_history_length=settings.TRACKER_TRAJECTORY_LENGTH
        )

        self.detector: Optional[Detector] = None
        self.tracker: Optional[Tracker] = None

    async def initialize(self):
        """Initialize models"""
        logger.info("Initializing perception pipeline...")

        # Initialize detector
        self.detector = Detector(self.detector_config)
        self.detector.load_model()

        # Initialize tracker
        self.tracker = Tracker(self.tracker_config)

        logger.info("Perception pipeline ready")

    async def process_video(
        self,
        video_path: str,
        game_id: UUID,
        db: AsyncSession
    ) -> dict:
        """
        Process video file: detect → track → store.

        Args:
            video_path: path to video file
            game_id: Game database ID
            db: database session

        Returns:
            Processing statistics
        """
        if not self.detector or not self.tracker:
            await self.initialize()

        logger.info(f"Processing video: {video_path}")

        # Open video
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise RuntimeError(f"Cannot open video: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        logger.info(f"Video: {total_frames} frames @ {fps} FPS")

        # Processing stats
        stats = {
            "frames_processed": 0,
            "detections_total": 0,
            "actors_tracked": 0
        }

        frame_idx = 0
        batch = []
        batch_start_frame = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            batch.append(frame)
            frame_idx += 1

            # Process batch when full or at end
            if len(batch) >= settings.FRAME_BATCH_SIZE or frame_idx == total_frames:
                await self._process_batch(
                    batch, batch_start_frame, game_id, db, stats
                )
                batch = []
                batch_start_frame = frame_idx

            if frame_idx % 100 == 0:
                logger.info(f"Progress: {frame_idx}/{total_frames} frames")

        cap.release()

        # Update game status
        from sqlalchemy import select, update
        await db.execute(
            update(Game)
            .where(Game.id == game_id)
            .values(processing_status="completed")
        )
        await db.commit()

        logger.info(f"Video processing complete: {stats}")
        return stats

    async def _process_batch(
        self,
        frames: List,
        start_frame: int,
        game_id: UUID,
        db: AsyncSession,
        stats: dict
    ):
        """Process batch of frames"""
        # Detect
        detections_batch = self.detector.detect_batch(frames, start_frame)

        # Track each frame
        for frame_idx, frame_dets in enumerate(detections_batch):
            current_frame = start_frame + frame_idx

            # Update tracker
            tracks = self.tracker.update(frame_dets, current_frame)

            # Store detections in DB (Phase 2: basic storage)
            for track in tracks:
                await self._store_track(track, game_id, db)

            stats["detections_total"] += len(frame_dets)
            stats["frames_processed"] += 1

        stats["actors_tracked"] = self.tracker.get_track_count()

    async def _store_track(self, track, game_id: UUID, db: AsyncSession):
        """
        Store or update tracked actor in database.

        Phase 2: Simple actor creation/update.
        Phase 3+: Add detection records, trajectory updates.
        """
        from sqlalchemy import select

        # Check if actor exists
        result = await db.execute(
            select(Actor).where(
                Actor.game_id == game_id,
                Actor.id == str(track.track_id)
            )
        )
        actor = result.scalar_one_or_none()

        if not actor:
            # Create new actor
            actor = Actor(
                id=str(track.track_id),
                game_id=game_id,
                actor_type=ActorType(track.actor_type),
                trajectory=[],
                bounding_boxes=[],
                first_seen_frame=track.frame_number,
                last_seen_frame=track.frame_number,
                confidence_avg=track.confidence
            )
            db.add(actor)
        else:
            # Update existing
            actor.last_seen_frame = track.frame_number
            actor.confidence_avg = (
                (actor.confidence_avg + track.confidence) / 2
                if actor.confidence_avg else track.confidence
            )

        await db.commit()


# Global processor instance
_processor: Optional[VideoProcessor] = None


async def get_processor() -> VideoProcessor:
    """Get or create global processor instance"""
    global _processor
    if _processor is None:
        _processor = VideoProcessor()
        await _processor.initialize()
    return _processor
