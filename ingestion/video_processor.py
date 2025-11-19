"""
Video Processing Pipeline - Phase 2 + Phase 3A

Orchestrates: Video Ingestion → Detection → Tracking → Event Detection → QSurface Generation → DB Storage

Phase 2: YOLOv8s detection + ByteTrack tracking
Phase 3A: Event detection + QSurface generation

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
from ..analysis.event_detector import EventDetector
from ..analysis.qsurface_generator import QSurfaceGenerator
from ..models import Game, Actor, Detection as DBDetection, ActorType, Event, EventType, QSurface, SurfaceType
from ..config import settings

logger = logging.getLogger(__name__)


class VideoProcessor:
    """
    Video processing pipeline: Detection → Tracking → Event Detection → QSurface Generation → Storage.

    Phase 2 Implementation:
    - Frame-by-frame or batched processing
    - YOLOv8s detection
    - ByteTrack tracking
    - Database persistence

    Phase 3A Implementation:
    - Event detection (fouls, mechanics, rotations)
    - QSurface generation (4 persona types)
    - Event/QSurface database storage
    """

    def __init__(self):
        """Initialize processor with detector, tracker, event detector, and qsurface generator"""
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
        self.event_detector: Optional[EventDetector] = None
        self.qsurface_generator: Optional[QSurfaceGenerator] = None

    async def initialize(self, game_id: UUID):
        """Initialize models and analysis components

        Args:
            game_id: Game UUID for event detector initialization
        """
        logger.info("Initializing perception + analysis pipeline...")

        # Initialize detector
        self.detector = Detector(self.detector_config)
        self.detector.load_model()

        # Initialize tracker
        self.tracker = Tracker(self.tracker_config)

        # Initialize event detector (Phase 3A)
        self.event_detector = EventDetector(game_id=str(game_id))

        # Initialize QSurface generator (Phase 3A)
        self.qsurface_generator = QSurfaceGenerator()

        logger.info("Perception + analysis pipeline ready")

    async def process_video(
        self,
        video_path: str,
        game_id: UUID,
        db: AsyncSession
    ) -> dict:
        """
        Process video file: detect → track → analyze events → generate QSurfaces → store.

        Phase 2 + 3A Pipeline:
        1. Detection (YOLOv8s)
        2. Tracking (ByteTrack)
        3. Event Detection (Heuristic-based)
        4. QSurface Generation (4 persona types)
        5. Database Storage

        Args:
            video_path: path to video file
            game_id: Game database ID
            db: database session

        Returns:
            Processing statistics
        """
        if not self.detector or not self.tracker or not self.event_detector:
            await self.initialize(game_id)

        logger.info(f"Processing video: {video_path} (Phase 2 + 3A pipeline)")

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
            "actors_tracked": 0,
            "events_detected": 0,
            "qsurfaces_generated": 0
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

        # Update game status to "processing_skilldna"
        from sqlalchemy import select, update
        await db.execute(
            update(Game)
            .where(Game.id == game_id)
            .values(processing_status="processing_skilldna")
        )
        await db.commit()

        # Phase 3B-2: Process SkillDNA updates
        logger.info("Starting SkillDNA processing...")
        from ..analysis.skilldna_adapter import SkillDNAAdapter

        skilldna_adapter = SkillDNAAdapter(db, str(game_id))
        try:
            skilldna_stats = await skilldna_adapter.process_game()
            stats.update(skilldna_stats)
            logger.info(f"SkillDNA processing complete: {skilldna_stats}")
        except Exception as e:
            logger.error(f"SkillDNA processing failed: {e}", exc_info=True)
            # Continue anyway - SkillDNA is optional

        # Update game status to "generating_clips"
        await db.execute(
            update(Game)
            .where(Game.id == game_id)
            .values(processing_status="generating_clips")
        )
        await db.commit()

        # Phase 4: Generate clips for events
        logger.info("Starting clip generation...")
        from ..media.clip_extractor import ClipExtractor, create_clip_request_from_event
        from ..models import Clip

        clip_extractor = ClipExtractor(output_dir=settings.CLIP_OUTPUT_DIR)

        try:
            # Load all events for this game
            events_result = await db.execute(
                select(Event).where(Event.game_id == game_id)
            )
            events = events_result.scalars().all()

            clips_generated = 0
            for event in events:
                # Generate clip for candidate_foul, ref_mechanics, and crew_rotation events
                event_type_str = event.event_type.value if hasattr(event.event_type, 'value') else str(event.event_type)

                if event_type_str in ['candidate_foul', 'ref_mechanics', 'crew_rotation']:
                    # Create clip request
                    clip_request = create_clip_request_from_event(
                        game_id=str(game_id),
                        event_id=str(event.id),
                        video_path=video_path,
                        event_timestamp=event.timestamp,
                        event_type=event_type_str,
                        clip_dir=settings.CLIP_OUTPUT_DIR,
                        padding_before=3.0,
                        padding_after=5.0
                    )

                    # Extract clip
                    clip_result = clip_extractor.extract_clip(clip_request)

                    if clip_result.success:
                        # Store clip in database
                        clip_db = Clip(
                            id=UUID(clip_result.clip_id),
                            game_id=game_id,
                            start_time=clip_result.start_time,
                            end_time=clip_result.end_time,
                            start_frame=int(clip_result.start_time * fps),
                            end_frame=int(clip_result.end_time * fps),
                            clip_path=clip_result.file_path,
                            thumbnail_path=clip_result.thumbnail_path,
                            event_anchor_id=event.id,
                            related_events=[str(event.id)],
                            clip_category=event_type_str,
                            tags=[event_type_str]
                        )
                        db.add(clip_db)
                        clips_generated += 1

            await db.commit()
            stats['clips_generated'] = clips_generated
            logger.info(f"Clip generation complete: {clips_generated} clips")

        except Exception as e:
            logger.error(f"Clip generation failed: {e}", exc_info=True)
            # Continue anyway - clips are optional

        # Update game status to "completed"
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
        """
        Process batch of frames: Detection → Tracking → Event Detection → QSurface Generation → Storage

        Phase 2 + 3A: Complete pipeline
        """
        # Phase 2: Detect
        detections_batch = self.detector.detect_batch(frames, start_frame)

        # Phase 2: Track each frame + Phase 3A: Detect events
        for frame_idx, frame_dets in enumerate(detections_batch):
            current_frame = start_frame + frame_idx
            timestamp = current_frame / 30.0  # Assume 30 FPS (Phase 4+: get from video metadata)

            # Update tracker
            tracks = self.tracker.update(frame_dets, current_frame)

            # Store tracks in DB
            for track in tracks:
                await self._store_track(track, game_id, db)

            # Phase 3A: Event detection
            events = await self.event_detector.process_frame(tracks, current_frame, timestamp)

            # Store events and generate QSurfaces
            for event in events:
                # Store event in DB
                event_db = await self._store_event(event, game_id, db)

                # Generate QSurfaces for this event
                qsurfaces = await self.qsurface_generator.generate_all_surfaces(event, tracks)

                # Store QSurfaces in DB
                for qsurface in qsurfaces:
                    await self._store_qsurface(qsurface, event_db.id, db)

                stats["qsurfaces_generated"] += len(qsurfaces)

            stats["events_detected"] += len(events)
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

    async def _store_event(self, event: Any, game_id: UUID, db: AsyncSession) -> Event:
        """
        Store event in database.

        Phase 3A: Store candidate fouls, mechanics events, rotation events

        Args:
            event: CandidateFoulEvent, RefMechanicsEvent, or CrewRotationEvent
            game_id: Game UUID
            db: Database session

        Returns:
            Stored Event database object
        """
        import json

        event_type_str = getattr(event, 'event_type', 'unknown')

        # Map event types to EventType enum
        event_type_map = {
            'candidate_foul': 'candidate_foul',
            'ref_mechanics': 'referee_mechanics',
            'crew_rotation': 'crew_rotation'
        }

        event_type = EventType(event_type_map.get(event_type_str, 'candidate_foul'))

        # Create Event DB object
        event_db = Event(
            id=getattr(event, 'id', None),
            game_id=game_id,
            event_type=event_type,
            timestamp=getattr(event, 'timestamp', 0.0),
            frame_number=getattr(event, 'frame_number', 0),
            confidence=getattr(event, 'confidence', None),
            metadata=getattr(event, 'metadata', {})
        )

        db.add(event_db)
        await db.commit()
        await db.refresh(event_db)

        return event_db

    async def _store_qsurface(self, qsurface: Any, event_id: UUID, db: AsyncSession) -> QSurface:
        """
        Store QSurface in database.

        Phase 3A: Store all 4 surface types (referee, coach, player, league)

        Args:
            qsurface: RefereeQSurface, CoachQSurface, PlayerQSurface, or LeagueQSurface
            event_id: Event UUID
            db: Database session

        Returns:
            Stored QSurface database object
        """
        import json

        surface_type_str = getattr(qsurface, 'surface_type', 'unknown')

        # Map surface types to SurfaceType enum
        surface_type_map = {
            'referee_view': 'referee_view',
            'coach_view': 'coach_view',
            'player_view': 'player_view',
            'league_view': 'league_view'
        }

        surface_type = SurfaceType(surface_type_map.get(surface_type_str, 'referee_view'))

        # Create QSurface DB object
        qsurface_db = QSurface(
            id=getattr(qsurface, 'id', None),
            event_id=event_id,
            surface_type=surface_type,
            persona_id=getattr(qsurface, 'persona_id', 'unknown'),
            scores=getattr(qsurface, 'metadata', {}),  # Store all metadata as scores
            interpretation=surface_type_str,  # Store surface type as interpretation
            metadata=qsurface.model_dump()  # Store full QSurface data as JSON
        )

        db.add(qsurface_db)
        await db.commit()

        return qsurface_db


# Global processor instance
_processor: Optional[VideoProcessor] = None


async def get_processor() -> VideoProcessor:
    """Get or create global processor instance"""
    global _processor
    if _processor is None:
        _processor = VideoProcessor()
        # Note: initialize() is called with game_id in process_video()
    return _processor
