"""
Video Processing Pipeline - Phase 2 + Phase 3A

Orchestrates: Video Ingestion → Detection → Tracking → Event Detection → QSurface Generation → DB Storage

Phase 2: YOLOv8s detection + ByteTrack tracking
Phase 3A: Event detection + QSurface generation

Follows PCOS Pipeline Templates and Vision Standards.
"""
import cv2
import logging
from typing import Any, List, Optional
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

    async def process_video_refiq(
        self,
        video_path: str,
        game_id: UUID,
        job_id: UUID,
        db: AsyncSession
    ) -> dict:
        """
        RefIQ v1.0 Compliant Video Processing Pipeline.

        Phase 13.1 Implementation:
        1. Detection (YOLOv8s)
        2. Tracking (ByteTrack)
        3. Event Detection
        4. EventReasoning Generation (replaces qsurfaces)
        5. SkillDNA Profile Updates (unified tables)
        6. Clip Generation
        7. PCOS Event Emission
        8. Job/Game Status Updates

        Args:
            video_path: path to video file
            game_id: Game database ID
            job_id: IngestionJob ID
            db: database session

        Returns:
            Processing statistics
        """
        from ..models import (
            Game, Event, EventType, EventReasoning, ReasoningType, Perspective,
            SkillDNAProfile, SkillDNAProfileUpdate, SubjectType, ProcessingStatus,
            IngestionJob, IngestionStatus, PcosEvent, Clip, ClipCreatedBy
        )
        from datetime import datetime

        if not self.detector or not self.tracker or not self.event_detector:
            await self.initialize(game_id)

        logger.info(f"RefIQ Processing video: {video_path}")

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
            "event_reasoning_generated": 0,
            "skilldna_updates": 0,
            "clips_generated": 0
        }

        frame_idx = 0
        batch = []
        batch_start_frame = 0

        # STEP 4: Detection + Tracking
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            batch.append(frame)
            frame_idx += 1

            # Process batch when full or at end
            if len(batch) >= settings.FRAME_BATCH_SIZE or frame_idx == total_frames:
                await self._process_batch_refiq(
                    batch, batch_start_frame, game_id, db, stats
                )
                batch = []
                batch_start_frame = frame_idx

            if frame_idx % 100 == 0:
                logger.info(f"RefIQ Progress: {frame_idx}/{total_frames} frames")

        cap.release()

        # Update game status to "processing_skilldna"
        from sqlalchemy import select, update
        await db.execute(
            update(Game)
            .where(Game.id == game_id)
            .values(
                processing_status=ProcessingStatus.processing_skilldna,
                updated_at=datetime.utcnow()
            )
        )
        await db.commit()

        # STEP 8: Process SkillDNA updates using new unified tables
        logger.info("RefIQ: Starting SkillDNA processing with unified tables...")
        try:
            skilldna_stats = await self._process_skilldna_refiq(game_id, db)
            stats.update(skilldna_stats)
            logger.info(f"RefIQ SkillDNA processing complete: {skilldna_stats}")
        except Exception as e:
            logger.error(f"RefIQ SkillDNA processing failed: {e}", exc_info=True)

        # Update game status to "generating_clips"
        await db.execute(
            update(Game)
            .where(Game.id == game_id)
            .values(
                processing_status=ProcessingStatus.generating_clips,
                updated_at=datetime.utcnow()
            )
        )
        await db.commit()

        # STEP 6: Generate clips for events
        logger.info("RefIQ: Starting clip generation...")
        from ..media.clip_extractor import ClipExtractor, create_clip_request_from_event

        clip_extractor = ClipExtractor(output_dir=settings.CLIP_OUTPUT_DIR)

        try:
            # Load all events for this game
            events_result = await db.execute(
                select(Event).where(Event.game_id == game_id)
            )
            events = events_result.scalars().all()

            clips_generated = 0
            for event in events:
                event_type_str = event.event_type.value if hasattr(event.event_type, 'value') else str(event.event_type)

                if event_type_str in ['candidate_foul', 'ref_mechanics', 'crew_rotation']:
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

                    clip_result = clip_extractor.extract_clip(clip_request)

                    if clip_result.success:
                        # Store clip with RefIQ-compliant fields
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
                            tags=[event_type_str],
                            created_by=ClipCreatedBy.system
                        )
                        db.add(clip_db)
                        clips_generated += 1

            await db.commit()
            stats['clips_generated'] = clips_generated
            logger.info(f"RefIQ Clip generation complete: {clips_generated} clips")

        except Exception as e:
            logger.error(f"RefIQ Clip generation failed: {e}", exc_info=True)

        # STEP 9: Finalize - Update game and job status to completed
        await db.execute(
            update(Game)
            .where(Game.id == game_id)
            .values(
                processing_status=ProcessingStatus.completed,
                updated_at=datetime.utcnow()
            )
        )
        await db.execute(
            update(IngestionJob)
            .where(IngestionJob.id == job_id)
            .values(
                status=IngestionStatus.completed,
                finished_at=datetime.utcnow()
            )
        )

        # Emit final PCOS event: INGESTION.COMPLETED
        pcos_complete = PcosEvent(
            event_type="OFFICIATING.INGESTION.COMPLETED",
            source="refiq_ingestion",
            payload={
                "game_id": str(game_id),
                "job_id": str(job_id),
                "stats": stats
            },
            correlation_id=str(job_id)
        )
        db.add(pcos_complete)
        await db.commit()

        logger.info(f"RefIQ Video processing complete: {stats}")
        return stats

    async def _process_batch_refiq(
        self,
        frames: List,
        start_frame: int,
        game_id: UUID,
        db: AsyncSession,
        stats: dict
    ):
        """
        Process batch of frames with RefIQ v1.0 compliant output.

        Uses event_reasoning instead of qsurfaces table.
        """
        from ..models import EventReasoning, ReasoningType, Perspective
        import json

        # Phase 2: Detect
        detections_batch = self.detector.detect_batch(frames, start_frame)

        # Phase 2: Track each frame + Phase 3A: Detect events
        for frame_idx, frame_dets in enumerate(detections_batch):
            current_frame = start_frame + frame_idx
            timestamp = current_frame / 30.0

            # Update tracker
            tracks = self.tracker.update(frame_dets, current_frame)

            # Store tracks in DB
            for track in tracks:
                await self._store_track(track, game_id, db)

            # Phase 3A: Event detection
            events = await self.event_detector.process_frame(tracks, current_frame, timestamp)

            # Store events and generate EventReasoning (RefIQ v1.0)
            for event in events:
                # Store event in DB
                event_db = await self._store_event(event, game_id, db)

                # STEP 7: Generate EventReasoning (replaces QSurfaces)
                qsurfaces = await self.qsurface_generator.generate_all_surfaces(event, tracks)

                # Store as EventReasoning instead of QSurface
                for qsurface in qsurfaces:
                    await self._store_event_reasoning(qsurface, event_db.id, game_id, db)

                stats["event_reasoning_generated"] += len(qsurfaces)

            stats["events_detected"] += len(events)
            stats["detections_total"] += len(frame_dets)
            stats["frames_processed"] += 1

        stats["actors_tracked"] = self.tracker.get_track_count()

    async def _store_event_reasoning(
        self,
        qsurface: Any,
        event_id: UUID,
        game_id: UUID,
        db: AsyncSession
    ):
        """
        Store QSurface as EventReasoning (RefIQ v1.0).

        Phase 13.1: Replaces _store_qsurface() which wrote to legacy qsurfaces table.
        """
        from ..models import EventReasoning, ReasoningType, Perspective

        surface_type_str = getattr(qsurface, 'surface_type', 'unknown')

        # Map surface types to Perspective enum
        perspective_map = {
            'referee_view': Perspective.referee,
            'coach_view': Perspective.coach,
            'player_view': Perspective.player,
            'league_view': Perspective.league
        }

        perspective = perspective_map.get(surface_type_str, Perspective.neutral)

        # Build payload from QSurface data
        payload = qsurface.model_dump() if hasattr(qsurface, 'model_dump') else {}

        event_reasoning = EventReasoning(
            game_id=game_id,
            event_id=event_id,
            reasoning_type=ReasoningType.qsurface,
            perspective=perspective,
            payload=payload,
            created_by="system"
        )

        db.add(event_reasoning)
        await db.commit()

    async def _process_skilldna_refiq(
        self,
        game_id: UUID,
        db: AsyncSession
    ) -> dict:
        """
        Process SkillDNA using RefIQ v1.0 unified tables.

        Writes to:
        - skilldna_profiles (unified)
        - skilldna_profile_updates (delta tracking)

        Phase 13.1: Replaces legacy RefereeSkillProfile, PlayerSkillProfile, etc.
        """
        from ..models import (
            Event, EventReasoning, Actor, ActorType,
            SkillDNAProfile, SkillDNAProfileUpdate, SubjectType, SportType
        )
        from sqlalchemy import select
        from collections import defaultdict
        import json

        stats = {
            "skilldna_profiles_updated": 0,
            "skilldna_updates_created": 0
        }

        # Load events and reasoning
        events_result = await db.execute(
            select(Event).where(Event.game_id == game_id)
        )
        all_events = events_result.scalars().all()

        reasoning_result = await db.execute(
            select(EventReasoning).where(EventReasoning.game_id == game_id)
        )
        all_reasoning = reasoning_result.scalars().all()

        # Load actors
        actors_result = await db.execute(
            select(Actor).where(Actor.game_id == game_id)
        )
        all_actors = actors_result.scalars().all()

        # Get game sport type
        from ..models import Game
        game_result = await db.execute(select(Game).where(Game.id == game_id))
        game = game_result.scalar_one_or_none()
        sport = game.sport if game else SportType.basketball

        # Process referee SkillDNA
        referees = [a for a in all_actors if a.actor_type == ActorType.referee]
        for referee in referees:
            ref_id = referee.id

            # Get referee-perspective reasoning
            ref_reasoning = [
                r for r in all_reasoning
                if r.perspective.value == 'referee'
            ]

            if not ref_reasoning:
                continue

            # Aggregate metrics from reasoning payloads
            mechanics_scores = []
            visibility_scores = []

            for r in ref_reasoning:
                payload = r.payload or {}
                if 'mechanics_score' in payload:
                    mechanics_scores.append(payload['mechanics_score'])
                if 'visibility_score' in payload:
                    visibility_scores.append(payload['visibility_score'])

            if not mechanics_scores:
                continue

            avg_mechanics = sum(mechanics_scores) / len(mechanics_scores)
            avg_visibility = sum(visibility_scores) / len(visibility_scores) if visibility_scores else 0.5

            # Create/Update unified SkillDNA profile
            existing_profile = await db.execute(
                select(SkillDNAProfile).where(
                    SkillDNAProfile.subject_type == SubjectType.referee,
                    SkillDNAProfile.subject_id == ref_id
                )
            )
            profile = existing_profile.scalar_one_or_none()

            profile_vector = {
                "mechanics_score": avg_mechanics,
                "visibility_score": avg_visibility,
                "games_count": 1
            }

            if not profile:
                profile = SkillDNAProfile(
                    subject_type=SubjectType.referee,
                    subject_id=ref_id,
                    sport=sport,
                    profile_vector=profile_vector,
                    twin_alignment=0.0,
                    profile_metadata={"source": "refiq_v1"}
                )
                db.add(profile)
                await db.flush()
            else:
                # Incremental update
                old_vector = profile.profile_vector or {}
                n = old_vector.get('games_count', 0)
                profile.profile_vector = {
                    "mechanics_score": (old_vector.get('mechanics_score', 0) * n + avg_mechanics) / (n + 1),
                    "visibility_score": (old_vector.get('visibility_score', 0) * n + avg_visibility) / (n + 1),
                    "games_count": n + 1
                }

            stats["skilldna_profiles_updated"] += 1

            # Create SkillDNA update record
            update_record = SkillDNAProfileUpdate(
                profile_id=profile.id,
                game_id=game_id,
                delta_vector={
                    "mechanics_delta": avg_mechanics,
                    "visibility_delta": avg_visibility
                },
                twin_delta=None
            )
            db.add(update_record)
            stats["skilldna_updates_created"] += 1

        # Process player SkillDNA
        players = [a for a in all_actors if a.actor_type == ActorType.player]
        for player in players:
            player_id = player.id

            # Get player-perspective reasoning
            player_reasoning = [
                r for r in all_reasoning
                if r.perspective.value == 'player'
            ]

            if not player_reasoning:
                continue

            # Aggregate metrics
            decision_scores = []
            risk_factors = []

            for r in player_reasoning:
                payload = r.payload or {}
                if 'decision_quality_score' in payload:
                    decision_scores.append(payload['decision_quality_score'])
                if 'risk_factor' in payload:
                    risk_factors.append(payload['risk_factor'])

            if not decision_scores:
                continue

            avg_decision = sum(decision_scores) / len(decision_scores)
            avg_risk = sum(risk_factors) / len(risk_factors) if risk_factors else 0.5

            # Create/Update unified SkillDNA profile
            existing_profile = await db.execute(
                select(SkillDNAProfile).where(
                    SkillDNAProfile.subject_type == SubjectType.player,
                    SkillDNAProfile.subject_id == player_id
                )
            )
            profile = existing_profile.scalar_one_or_none()

            profile_vector = {
                "decision_quality": avg_decision,
                "risk_index": avg_risk,
                "games_count": 1
            }

            if not profile:
                profile = SkillDNAProfile(
                    subject_type=SubjectType.player,
                    subject_id=player_id,
                    sport=sport,
                    profile_vector=profile_vector,
                    twin_alignment=0.0,
                    profile_metadata={"source": "refiq_v1"}
                )
                db.add(profile)
                await db.flush()
            else:
                old_vector = profile.profile_vector or {}
                n = old_vector.get('games_count', 0)
                profile.profile_vector = {
                    "decision_quality": (old_vector.get('decision_quality', 0) * n + avg_decision) / (n + 1),
                    "risk_index": (old_vector.get('risk_index', 0) * n + avg_risk) / (n + 1),
                    "games_count": n + 1
                }

            stats["skilldna_profiles_updated"] += 1

            # Create update record
            update_record = SkillDNAProfileUpdate(
                profile_id=profile.id,
                game_id=game_id,
                delta_vector={
                    "decision_delta": avg_decision,
                    "risk_delta": avg_risk
                },
                twin_delta=None
            )
            db.add(update_record)
            stats["skilldna_updates_created"] += 1

        await db.commit()
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
