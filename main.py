"""
FastAPI Main Application

PCOS Sports Perception Referee AI - API Server
"""
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from contextlib import asynccontextmanager
import logging

from .config import settings
from .database import init_db, close_db, get_db
from .models import Game

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown"""
    # Startup
    logger.info("Starting PCOS Sports Perception Referee AI...")
    await init_db()
    logger.info("Database initialized")

    # Phase 13.3: Run system validation on startup
    try:
        from .system_validator import run_full_validation, ValidationStatus
        logger.info("Running system validation...")
        validation_report = await run_full_validation()

        if validation_report.overall_status == ValidationStatus.ERROR:
            logger.warning(f"System validation completed with errors: {validation_report.blocking_issues}")
        elif validation_report.overall_status == ValidationStatus.WARNING:
            logger.info("System validation completed with warnings")
        else:
            logger.info("System validation passed - all systems ready")

        # Store validation report for API access
        app.state.system_validation = validation_report

    except Exception as e:
        logger.error(f"System validation failed: {e}")
        app.state.system_validation = None

    yield
    # Shutdown
    logger.info("Shutting down...")
    await close_db()


# Create FastAPI app
app = FastAPI(
    title="PCOS Sports Perception Referee AI",
    description="RefQuest Sports AI Officiating Engine - PCOS-native microservice",
    version="0.1.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "pcos_sports_perception_referee_ai",
        "version": "0.1.0"
    }


# =========================================================================
# Phase 13.3: System Validation Endpoints
# =========================================================================

@app.get(f"{settings.API_PREFIX}/system/validate")
async def validate_system(force_refresh: bool = False, request: Request = None):
    """
    Run or retrieve system validation results.

    Phase 13.3: System Dependency Validator - checks all dependencies:
    - GPU & NVIDIA driver
    - CUDA via PyTorch
    - FFmpeg & NVENC
    - YOLO model
    - yt-dlp for YouTube
    - Required directories
    - RefIQ database schema
    - MCP Kernel connectivity

    Query params:
    - force_refresh: If true, run fresh validation instead of using cache

    Returns complete validation report with status for each dependency.
    """
    from .system_validator import run_full_validation, get_cached_validation_results

    # Check for cached results if not forcing refresh
    if not force_refresh:
        cached = get_cached_validation_results()
        if cached:
            return cached.to_dict()

        # Also check app state for startup validation
        if hasattr(request.app.state, 'system_validation') and request.app.state.system_validation:
            return request.app.state.system_validation.to_dict()

    # Run fresh validation
    report = await run_full_validation()

    # Update app state
    if request:
        request.app.state.system_validation = report

    return report.to_dict()


@app.get(f"{settings.API_PREFIX}/system/validate/ingestion")
async def validate_ingestion_preflight():
    """
    Quick preflight check before ingestion.

    Only checks critical dependencies needed for video ingestion:
    - FFmpeg
    - yt-dlp
    - Required directories

    Returns simple pass/fail with details.
    """
    from .system_validator import run_ingestion_preflight, ValidationStatus

    result = await run_ingestion_preflight()

    if result.status == ValidationStatus.ERROR:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "System not ready for ingestion",
                "message": result.message,
                "issues": result.details.get("issues", []),
            }
        )

    return {
        "status": "ready",
        "message": result.message,
        "details": result.details,
    }


# API v1 routes
@app.get(f"{settings.API_PREFIX}/games")
async def list_games(db: AsyncSession = Depends(get_db)):
    """List all games"""
    from sqlalchemy import select
    result = await db.execute(select(Game))
    games = result.scalars().all()
    return {"games": [{"id": str(g.id), "sport": g.sport, "status": g.processing_status} for g in games]}


@app.get(f"{settings.API_PREFIX}/games/{{game_id}}/video")
async def stream_game_video(
    game_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Stream video file for a game with Range header support.

    PCOS v1.2 Canonical: API-based video retrieval (NOT raw file paths)
    """
    from sqlalchemy import select
    from fastapi.responses import FileResponse, StreamingResponse
    from fastapi import Request
    from pathlib import Path
    from uuid import UUID
    import os

    # Get game record
    result = await db.execute(select(Game).where(Game.id == UUID(game_id)))
    game = result.scalar_one_or_none()

    if not game:
        raise HTTPException(status_code=404, detail=f"Game {game_id} not found")

    if not game.video_path:
        raise HTTPException(status_code=404, detail=f"No video file for game {game_id}")

    video_path = Path(game.video_path)
    if not video_path.exists():
        raise HTTPException(status_code=404, detail=f"Video file not found on disk")

    # Get file size
    file_size = video_path.stat().st_size

    # Handle Range requests for video streaming
    range_header = request.headers.get('range')

    if range_header:
        # Parse Range header
        range_match = range_header.replace('bytes=', '').split('-')
        start = int(range_match[0]) if range_match[0] else 0
        end = int(range_match[1]) if len(range_match) > 1 and range_match[1] else file_size - 1

        # Create partial content response
        def iterfile():
            with open(video_path, 'rb') as video:
                video.seek(start)
                remaining = end - start + 1
                while remaining > 0:
                    chunk_size = min(8192, remaining)
                    data = video.read(chunk_size)
                    if not data:
                        break
                    remaining -= len(data)
                    yield data

        headers = {
            'Content-Range': f'bytes {start}-{end}/{file_size}',
            'Accept-Ranges': 'bytes',
            'Content-Length': str(end - start + 1),
            'Content-Type': 'video/mp4',
        }

        return StreamingResponse(iterfile(), status_code=206, headers=headers)

    # No Range header - return full file
    return FileResponse(
        video_path,
        media_type='video/mp4',
        headers={'Accept-Ranges': 'bytes'}
    )


@app.post(f"{settings.API_PREFIX}/ingest/video")
async def ingest_video(
    file: UploadFile = File(...),
    sport: str = Form("basketball"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: AsyncSession = Depends(get_db)
):
    """
    Ingest a video file for processing via multipart/form-data upload.

    Phase 2: Triggers YOLOv8s detection + ByteTrack tracking pipeline.

    PCOS v1.2 Canonical: Multipart file upload (NOT server-side file paths)
    """
    from .models import Game, SportType
    from .ingestion.video_processor import get_processor
    import uuid
    import aiofiles
    from pathlib import Path

    # Validate file type
    if not file.content_type or not file.content_type.startswith('video/'):
        raise HTTPException(status_code=400, detail="File must be a video")

    # Create storage directory if it doesn't exist
    storage_dir = Path(settings.VIDEO_STORAGE_DIR)
    storage_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    game_id = uuid.uuid4()
    file_extension = Path(file.filename).suffix if file.filename else '.mp4'
    video_filename = f"{game_id}{file_extension}"
    video_path = storage_dir / video_filename

    # Save uploaded file
    try:
        async with aiofiles.open(video_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)
    except Exception as e:
        logger.error(f"Failed to save uploaded video: {e}")
        raise HTTPException(status_code=500, detail="Failed to save video file")

    # Create game record
    game = Game(
        id=game_id,
        sport=SportType(sport),
        video_path=str(video_path),
        processing_status="processing"
    )
    db.add(game)
    await db.commit()

    logger.info(f"Game created: {game.id} - Video saved to {video_path} - Starting perception pipeline...")

    # Process video in background (Phase 2)
    async def process_video_task():
        try:
            processor = await get_processor()
            from .database import get_db
            async for db_session in get_db():
                stats = await processor.process_video(str(video_path), game.id, db_session)
                logger.info(f"Video processing complete for game {game.id}: {stats}")
                break
        except Exception as e:
            logger.error(f"Video processing failed for game {game.id}: {e}")
            # Update game status to failed
            from .database import get_db
            async for db_session in get_db():
                from sqlalchemy import update
                await db_session.execute(
                    update(Game).where(Game.id == game.id).values(processing_status="failed")
                )
                await db_session.commit()
                break

    # Schedule background task
    background_tasks.add_task(process_video_task)

    return {
        "game_id": str(game.id),
        "status": "processing",
        "message": "Video ingestion started. YOLOv8s detection + ByteTrack tracking in progress.",
        "video_filename": video_filename
    }


# =========================================================================
# Phase 12.6: YouTube Ingestion Endpoints
# =========================================================================

@app.get(f"{settings.API_PREFIX}/youtube/metadata")
async def get_youtube_metadata(url: str):
    """
    Fetch metadata for a YouTube video without downloading.

    Phase 12.6: YouTube Data API integration for frontend preview.

    Query params:
    - url: YouTube video URL

    Returns:
    - video_id, title, duration, thumbnail_url, channel, view_count
    """
    from .ingestion.youtube_ingest import fetch_youtube_metadata, extract_video_id

    video_id = extract_video_id(url)
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")

    metadata = await fetch_youtube_metadata(url)
    if not metadata:
        raise HTTPException(status_code=404, detail="Could not fetch video metadata")

    return {
        "videoId": metadata.video_id,
        "title": metadata.title,
        "duration": metadata.duration,
        "thumbnailUrl": metadata.thumbnail_url,
        "channel": metadata.channel,
        "viewCount": metadata.view_count,
    }


@app.post(f"{settings.API_PREFIX}/ingest/youtube")
async def ingest_youtube_video(
    request: Request,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: AsyncSession = Depends(get_db)
):
    """
    Ingest a YouTube video (download + process).

    Phase 13.1 RefIQ v1.0 Compliant:
    - Creates IngestionJob record
    - Creates Game with video_sources[]
    - Emits PCOS events to pcos_event_store
    - Uses event_reasoning instead of qsurfaces
    - Uses unified skilldna_profiles

    Request body:
    - url: YouTube video URL
    - sport: Sport type (default: basketball)
    - title: Optional title for the game

    Returns:
    - jobId: Unique job identifier
    - gameId: Game record ID
    - status: Current processing status
    - message: Status message
    """
    from .models import Game, SportType, SourceType, ProcessingStatus, IngestionJob, IngestionStatus, PcosEvent
    from .ingestion.youtube_ingest import download_youtube_video, extract_video_id, fetch_youtube_metadata
    from .ingestion.video_processor import get_processor
    from pathlib import Path
    from datetime import datetime
    import uuid
    import json

    # Parse request body
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    url = body.get("url")
    sport = body.get("sport", "basketball")
    title = body.get("title")

    if not url:
        raise HTTPException(status_code=400, detail="YouTube URL is required")

    # Phase 13.3: Ingestion preflight check
    try:
        from .system_validator import run_ingestion_preflight, ValidationStatus
        preflight = await run_ingestion_preflight()
        if preflight.status == ValidationStatus.ERROR:
            raise HTTPException(
                status_code=503,
                detail={
                    "error": "System not ready for ingestion",
                    "message": preflight.message,
                    "issues": preflight.details.get("issues", []),
                    "suggestion": "Run GET /api/v1/system/validate for full diagnostics"
                }
            )
    except ImportError:
        logger.warning("System validator not available, skipping preflight check")

    # Validate video ID
    video_id = extract_video_id(url)
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")

    # Create storage directory
    storage_dir = Path(settings.VIDEO_STORAGE_DIR)
    storage_dir.mkdir(parents=True, exist_ok=True)

    # Generate IDs
    game_id = uuid.uuid4()
    job_id = uuid.uuid4()

    # STEP 2: RefIQ-compliant Game creation
    game = Game(
        id=game_id,
        sport=SportType(sport),
        title=title or f"YouTube: {video_id}",
        source_type=SourceType.youtube,
        video_path=None,  # NULL until download completes
        video_sources=[],  # Empty initially
        game_metadata={"youtube_video_id": video_id, "source_url": url},
        processing_status=ProcessingStatus.downloading,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(game)

    # STEP 2: Create IngestionJob record
    ingestion_job = IngestionJob(
        id=job_id,
        game_id=game_id,
        source_url=url,
        source_type=SourceType.youtube,
        status=IngestionStatus.pending,
        started_at=datetime.utcnow(),
        created_at=datetime.utcnow()
    )
    db.add(ingestion_job)

    # Emit PCOS event: INGESTION.STARTED
    pcos_event = PcosEvent(
        event_type="OFFICIATING.INGESTION.STARTED",
        source="refiq_ingestion",
        payload={
            "game_id": str(game_id),
            "job_id": str(job_id),
            "source_type": "youtube",
            "source_url": url
        },
        correlation_id=str(job_id)
    )
    db.add(pcos_event)

    await db.commit()

    logger.info(f"RefIQ YouTube ingestion started: game={game_id}, job={job_id}, url={url}")

    # Background task for download + processing
    async def youtube_ingest_task_refiq():
        from .database import get_db
        from sqlalchemy import update

        try:
            # Update job status to downloading
            async for db_session in get_db():
                await db_session.execute(
                    update(IngestionJob).where(IngestionJob.id == job_id).values(
                        status=IngestionStatus.downloading
                    )
                )
                await db_session.commit()
                break

            # STEP 3: Download video
            result = await download_youtube_video(
                url=url,
                output_dir=storage_dir,
                game_id=game_id,
            )

            if not result.success:
                logger.error(f"YouTube download failed for game {game_id}: {result.error}")
                async for db_session in get_db():
                    # Update job and game to failed
                    await db_session.execute(
                        update(IngestionJob).where(IngestionJob.id == job_id).values(
                            status=IngestionStatus.failed,
                            error_message=result.error,
                            finished_at=datetime.utcnow()
                        )
                    )
                    await db_session.execute(
                        update(Game).where(Game.id == game_id).values(
                            processing_status=ProcessingStatus.failed,
                            updated_at=datetime.utcnow()
                        )
                    )
                    # Emit PCOS failure event
                    fail_event = PcosEvent(
                        event_type="OFFICIATING.INGESTION.FAILED",
                        source="refiq_ingestion",
                        payload={"game_id": str(game_id), "job_id": str(job_id), "error": result.error},
                        correlation_id=str(job_id)
                    )
                    db_session.add(fail_event)
                    await db_session.commit()
                    break
                return

            # STEP 3: Update game with video_sources[]
            video_sources = [{
                "id": "main",
                "label": "Main",
                "source_type": "youtube",
                "url": str(result.video_path),
                "youtube_video_id": video_id
            }]

            # Also include YouTube metadata if available
            game_metadata = {
                "youtube_video_id": video_id,
                "source_url": url
            }
            if result.metadata:
                game_metadata.update({
                    "title": result.metadata.title,
                    "channel": result.metadata.channel,
                    "duration": result.metadata.duration,
                    "thumbnail_url": result.metadata.thumbnail_url
                })

            async for db_session in get_db():
                await db_session.execute(
                    update(Game).where(Game.id == game_id).values(
                        video_path=str(result.video_path),  # Keep for backwards compat
                        video_sources=video_sources,
                        game_metadata=game_metadata,
                        title=result.metadata.title if result.metadata else title,
                        processing_status=ProcessingStatus.processing,
                        updated_at=datetime.utcnow()
                    )
                )
                await db_session.execute(
                    update(IngestionJob).where(IngestionJob.id == job_id).values(
                        status=IngestionStatus.processing
                    )
                )
                # Emit PCOS download complete event
                dl_event = PcosEvent(
                    event_type="OFFICIATING.INGESTION.DOWNLOAD_COMPLETE",
                    source="refiq_ingestion",
                    payload={"game_id": str(game_id), "job_id": str(job_id), "video_path": str(result.video_path)},
                    correlation_id=str(job_id)
                )
                db_session.add(dl_event)
                await db_session.commit()
                break

            # STEP 4-8: Run full RefIQ processing pipeline
            try:
                processor = await get_processor()
                async for db_session in get_db():
                    stats = await processor.process_video_refiq(
                        video_path=str(result.video_path),
                        game_id=game_id,
                        job_id=job_id,
                        db=db_session
                    )
                    logger.info(f"RefIQ processing complete for game {game_id}: {stats}")
                    break
            except Exception as e:
                logger.error(f"RefIQ processing failed for game {game_id}: {e}", exc_info=True)
                async for db_session in get_db():
                    await db_session.execute(
                        update(Game).where(Game.id == game_id).values(
                            processing_status=ProcessingStatus.failed,
                            updated_at=datetime.utcnow()
                        )
                    )
                    await db_session.execute(
                        update(IngestionJob).where(IngestionJob.id == job_id).values(
                            status=IngestionStatus.failed,
                            error_message=str(e),
                            finished_at=datetime.utcnow()
                        )
                    )
                    fail_event = PcosEvent(
                        event_type="OFFICIATING.INGESTION.FAILED",
                        source="refiq_ingestion",
                        payload={"game_id": str(game_id), "job_id": str(job_id), "error": str(e)},
                        correlation_id=str(job_id)
                    )
                    db_session.add(fail_event)
                    await db_session.commit()
                    break

        except Exception as e:
            logger.error(f"YouTube ingestion task failed for game {game_id}: {e}", exc_info=True)
            async for db_session in get_db():
                await db_session.execute(
                    update(Game).where(Game.id == game_id).values(
                        processing_status=ProcessingStatus.failed,
                        updated_at=datetime.utcnow()
                    )
                )
                await db_session.execute(
                    update(IngestionJob).where(IngestionJob.id == job_id).values(
                        status=IngestionStatus.failed,
                        error_message=str(e),
                        finished_at=datetime.utcnow()
                    )
                )
                await db_session.commit()
                break

    # Schedule background task
    background_tasks.add_task(youtube_ingest_task_refiq)

    return {
        "jobId": str(job_id),
        "gameId": str(game_id),
        "status": "downloading",
        "message": f"RefIQ YouTube ingestion started for {video_id}",
    }


@app.get(f"{settings.API_PREFIX}/games/{{game_id}}/events")
async def get_game_events(
    game_id: str,
    event_type: str = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all events for a game.

    Phase 3A: Returns candidate fouls, referee mechanics, and crew rotations with full metadata.

    Query params:
    - event_type: Filter by event type (candidate_foul, referee_mechanics, crew_rotation)
    - limit: Max number of events to return (default 100)
    """
    from sqlalchemy import select
    from .models import Event, EventType
    from uuid import UUID

    query = select(Event).where(Event.game_id == UUID(game_id))

    # Filter by event type if specified
    if event_type:
        try:
            query = query.where(Event.event_type == EventType(event_type))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid event_type: {event_type}")

    query = query.limit(limit)
    result = await db.execute(query)
    events = result.scalars().all()

    return {
        "game_id": game_id,
        "total_events": len(events),
        "events": [
            {
                "id": str(e.id),
                "event_type": e.event_type.value if hasattr(e.event_type, 'value') else e.event_type,
                "timestamp": e.timestamp,
                "frame_number": e.frame_number,
                "confidence": e.confidence,
                "metadata": e.metadata
            }
            for e in events
        ]
    }


@app.get(f"{settings.API_PREFIX}/events/{{event_id}}/qsurfaces")
async def get_event_qsurfaces(
    event_id: str,
    surface_type: str = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all QSurfaces for an event.

    Phase 3A: Returns all 4 QSurface perspectives (referee, coach, player, league) with scores.

    Query params:
    - surface_type: Filter by surface type (referee_view, coach_view, player_view, league_view)
    """
    from sqlalchemy import select
    from .models import QSurface, SurfaceType
    from uuid import UUID

    query = select(QSurface).where(QSurface.event_id == UUID(event_id))

    # Filter by surface type if specified
    if surface_type:
        try:
            query = query.where(QSurface.surface_type == SurfaceType(surface_type))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid surface_type: {surface_type}")

    result = await db.execute(query)
    surfaces = result.scalars().all()

    return {
        "event_id": event_id,
        "total_qsurfaces": len(surfaces),
        "qsurfaces": [
            {
                "id": str(s.id),
                "surface_type": s.surface_type.value if hasattr(s.surface_type, 'value') else s.surface_type,
                "persona_id": s.persona_id,
                "scores": s.scores,
                "interpretation": s.interpretation,
                "metadata": s.metadata
            }
            for s in surfaces
        ]
    }


# =========================================================================
# Phase 3B-2: SkillDNA API Endpoints
# =========================================================================

@app.get(f"{settings.API_PREFIX}/refs/{{ref_id}}/skilldna")
async def get_referee_skilldna(
    ref_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get Referee SkillDNA profile.

    Phase 3B-2: Returns longitudinal referee performance metrics.

    Returns:
    - games_count
    - avg_mechanics_score
    - avg_visibility_score
    - avg_rotation_quality
    - foul_counts_by_type
    - call_density
    - occlusion_avg
    - regional_coverage_score
    """
    from sqlalchemy import select
    from .models import RefereeSkillProfile

    result = await db.execute(
        select(RefereeSkillProfile).where(RefereeSkillProfile.referee_id == ref_id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(status_code=404, detail=f"Referee SkillDNA profile not found for {ref_id}")

    return {
        "referee_id": profile.referee_id,
        "games_count": profile.games_count,
        "total_events": profile.total_events,
        "frames_analyzed": profile.frames_analyzed,
        "avg_mechanics_score": profile.avg_mechanics_score,
        "avg_visibility_score": profile.avg_visibility_score,
        "avg_rotation_quality": profile.avg_rotation_quality,
        "avg_position_score": profile.avg_position_score,
        "foul_counts_by_type": profile.foul_counts_by_type,
        "call_density": profile.call_density,
        "occlusion_avg": profile.occlusion_avg,
        "regional_coverage_score": profile.regional_coverage_score,
        "created_at": profile.created_at.isoformat(),
        "last_updated": profile.last_updated.isoformat()
    }


@app.get(f"{settings.API_PREFIX}/players/{{player_id}}/skilldna")
async def get_player_skilldna(
    player_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get Player SkillDNA profile.

    Phase 3B-2: Returns longitudinal player behavior metrics.

    Returns:
    - games_count
    - total_fouls
    - foul_counts_by_type
    - fouls_per_100_frames
    - avg_decision_quality_score
    - risk_index
    - contact_frequency
    - aggressive_tendency
    """
    from sqlalchemy import select
    from .models import PlayerSkillProfile

    result = await db.execute(
        select(PlayerSkillProfile).where(PlayerSkillProfile.player_id == player_id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(status_code=404, detail=f"Player SkillDNA profile not found for {player_id}")

    return {
        "player_id": profile.player_id,
        "games_count": profile.games_count,
        "total_fouls": profile.total_fouls,
        "frames_analyzed": profile.frames_analyzed,
        "foul_counts_by_type": profile.foul_counts_by_type,
        "fouls_per_100_frames": profile.fouls_per_100_frames,
        "avg_decision_quality_score": profile.avg_decision_quality_score,
        "risk_index": profile.risk_index,
        "contact_frequency": profile.contact_frequency,
        "aggressive_tendency": profile.aggressive_tendency,
        "created_at": profile.created_at.isoformat(),
        "last_updated": profile.last_updated.isoformat()
    }


@app.get(f"{settings.API_PREFIX}/crews/{{crew_id}}/skilldna")
async def get_crew_skilldna(
    crew_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get Crew SkillDNA profile.

    Phase 3B-2: Returns longitudinal crew performance metrics.

    Returns:
    - games_count
    - avg_rotation_quality
    - avg_fairness_index
    - avg_consistency_signal
    - late_rotation_count
    - misaligned_rotation_count
    """
    from sqlalchemy import select
    from .models import CrewSkillProfile

    result = await db.execute(
        select(CrewSkillProfile).where(CrewSkillProfile.crew_id == crew_id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(status_code=404, detail=f"Crew SkillDNA profile not found for {crew_id}")

    return {
        "crew_id": profile.crew_id,
        "games_count": profile.games_count,
        "total_rotations": profile.total_rotations,
        "avg_rotation_quality": profile.avg_rotation_quality,
        "avg_fairness_index": profile.avg_fairness_index,
        "avg_consistency_signal": profile.avg_consistency_signal,
        "avg_regional_balance": profile.avg_regional_balance,
        "late_rotation_count": profile.late_rotation_count,
        "misaligned_rotation_count": profile.misaligned_rotation_count,
        "created_at": profile.created_at.isoformat(),
        "last_updated": profile.last_updated.isoformat()
    }


@app.get(f"{settings.API_PREFIX}/games/{{game_id}}/officiating_summary")
async def get_game_officiating_summary(
    game_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get Game Officiating Summary.

    Phase 3B-2: Returns league-level game aggregates.

    Returns:
    - events_count
    - candidate_foul_count
    - ref_mechanics_count
    - crew_rotation_count
    - fairness_index_avg
    - consistency_signal_avg
    - regional_coverage_quality
    - occlusion_frequency
    """
    from sqlalchemy import select
    from .models import GameOfficiatingSummary
    from uuid import UUID

    result = await db.execute(
        select(GameOfficiatingSummary).where(GameOfficiatingSummary.game_id == UUID(game_id))
    )
    summary = result.scalar_one_or_none()

    if not summary:
        raise HTTPException(status_code=404, detail=f"Game officiating summary not found for {game_id}")

    return {
        "game_id": str(summary.game_id),
        "events_count": summary.events_count,
        "candidate_foul_count": summary.candidate_foul_count,
        "ref_mechanics_count": summary.ref_mechanics_count,
        "crew_rotation_count": summary.crew_rotation_count,
        "fairness_index_avg": summary.fairness_index_avg,
        "consistency_signal_avg": summary.consistency_signal_avg,
        "regional_coverage_quality": summary.regional_coverage_quality,
        "occlusion_frequency": summary.occlusion_frequency,
        "created_at": summary.created_at.isoformat(),
        "last_updated": summary.last_updated.isoformat()
    }


# =========================================================================
# Phase 4: Clip Generation & Timeline System - API Endpoints
# =========================================================================

@app.get(f"{settings.API_PREFIX}/games/{{game_id}}/clips")
async def get_game_clips(
    game_id: str,
    clip_category: str = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all clips for a game.

    Phase 4: Returns video clip metadata for game events.

    Query params:
    - clip_category: Filter by category (candidate_foul, ref_mechanics, crew_rotation)
    - limit: Max clips to return (default 100)

    Returns:
    - game_id
    - total_clips
    - clips: list of clip metadata (id, file_path, thumbnail, timestamps, category, event_anchor)
    """
    from sqlalchemy import select
    from .models import Clip
    from uuid import UUID

    query = select(Clip).where(Clip.game_id == UUID(game_id))

    # Filter by clip category if specified
    if clip_category:
        query = query.where(Clip.clip_category == clip_category)

    query = query.limit(limit)
    result = await db.execute(query)
    clips = result.scalars().all()

    return {
        "game_id": game_id,
        "total_clips": len(clips),
        "clips": [
            {
                "id": str(c.id),
                "clip_path": c.clip_path,
                "thumbnail_path": c.thumbnail_path,
                "start_time": c.start_time,
                "end_time": c.end_time,
                "duration": c.end_time - c.start_time,
                "start_frame": c.start_frame,
                "end_frame": c.end_frame,
                "event_anchor_id": str(c.event_anchor_id) if c.event_anchor_id else None,
                "related_events": c.related_events,
                "clip_category": c.clip_category,
                "tags": c.tags,
                "qsurface_ids": c.qsurface_ids,
                "created_at": c.created_at.isoformat()
            }
            for c in clips
        ]
    }


@app.get(f"{settings.API_PREFIX}/events/{{event_id}}/clip")
async def get_event_clip(
    event_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get clip for specific event.

    Phase 4: Returns clip metadata and file path for event.

    Returns:
    - Clip metadata for the event
    - 404 if no clip exists for this event
    """
    from sqlalchemy import select
    from .models import Clip
    from uuid import UUID

    result = await db.execute(
        select(Clip).where(Clip.event_anchor_id == UUID(event_id))
    )
    clip = result.scalar_one_or_none()

    if not clip:
        raise HTTPException(status_code=404, detail=f"Clip not found for event {event_id}")

    return {
        "id": str(clip.id),
        "game_id": str(clip.game_id),
        "event_id": event_id,
        "clip_path": clip.clip_path,
        "thumbnail_path": clip.thumbnail_path,
        "start_time": clip.start_time,
        "end_time": clip.end_time,
        "duration": clip.end_time - clip.start_time,
        "start_frame": clip.start_frame,
        "end_frame": clip.end_frame,
        "event_anchor_id": str(clip.event_anchor_id) if clip.event_anchor_id else None,
        "related_events": clip.related_events,
        "clip_category": clip.clip_category,
        "tags": clip.tags,
        "qsurface_ids": clip.qsurface_ids,
        "created_at": clip.created_at.isoformat()
    }


@app.get(f"{settings.API_PREFIX}/games/{{game_id}}/timeline")
async def get_game_timeline(
    game_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get timeline metadata for game visualization.

    Phase 4: Returns structured timeline data for React UI consumption.

    Returns:
    - game_id
    - events: chronological list of events with timestamps
    - clips: list of clips with time ranges
    - timeline_markers: key moments for timeline visualization
    """
    from sqlalchemy import select
    from .models import Event, Clip, Game
    from uuid import UUID

    game_uuid = UUID(game_id)

    # Get game metadata
    game_result = await db.execute(select(Game).where(Game.id == game_uuid))
    game = game_result.scalar_one_or_none()

    if not game:
        raise HTTPException(status_code=404, detail=f"Game not found: {game_id}")

    # Get all events ordered by timestamp
    events_result = await db.execute(
        select(Event).where(Event.game_id == game_uuid).order_by(Event.timestamp)
    )
    events = events_result.scalars().all()

    # Get all clips ordered by start time
    clips_result = await db.execute(
        select(Clip).where(Clip.game_id == game_uuid).order_by(Clip.start_time)
    )
    clips = clips_result.scalars().all()

    # Build timeline markers
    timeline_markers = []
    for event in events:
        event_type_str = event.event_type.value if hasattr(event.event_type, 'value') else str(event.event_type)

        marker = {
            "id": str(event.id),
            "type": "event",
            "event_type": event_type_str,
            "timestamp": event.timestamp,
            "frame_number": event.frame_number,
            "confidence": event.confidence,
            "has_clip": any(c.event_anchor_id == event.id for c in clips),
            "metadata": event.metadata
        }
        timeline_markers.append(marker)

    # Add clip markers
    for clip in clips:
        marker = {
            "id": str(clip.id),
            "type": "clip",
            "clip_category": clip.clip_category,
            "start_time": clip.start_time,
            "end_time": clip.end_time,
            "duration": clip.end_time - clip.start_time,
            "thumbnail_path": clip.thumbnail_path,
            "event_anchor_id": str(clip.event_anchor_id) if clip.event_anchor_id else None
        }
        timeline_markers.append(marker)

    # Sort markers by timestamp
    timeline_markers.sort(key=lambda m: m.get('timestamp', m.get('start_time', 0)))

    return {
        "game_id": game_id,
        "sport": game.sport.value if hasattr(game.sport, 'value') else str(game.sport),
        "processing_status": game.processing_status,
        "total_events": len(events),
        "total_clips": len(clips),
        "events": [
            {
                "id": str(e.id),
                "event_type": e.event_type.value if hasattr(e.event_type, 'value') else str(e.event_type),
                "timestamp": e.timestamp,
                "frame_number": e.frame_number,
                "confidence": e.confidence
            }
            for e in events
        ],
        "clips": [
            {
                "id": str(c.id),
                "clip_category": c.clip_category,
                "start_time": c.start_time,
                "end_time": c.end_time,
                "thumbnail_path": c.thumbnail_path,
                "event_anchor_id": str(c.event_anchor_id) if c.event_anchor_id else None
            }
            for c in clips
        ],
        "timeline_markers": timeline_markers
    }


# =========================================================================
# Phase 9C: Teaching Package Integration - API Endpoints
# =========================================================================

@app.get(f"{settings.API_PREFIX}/games/{{game_id}}/teaching_package")
async def get_teaching_package(game_id: str):
    """
    Get Teaching Package for a game.

    Phase 9C: Returns comprehensive teaching materials generated by Agent Bus Phase 9B.

    The teaching package includes:
    - Borderline event analysis
    - NCAA rules explanations
    - Teaching notes for referee training
    - QSurface and SkillDNA metrics
    - Casebook scenarios

    Returns:
    - 200: Full teaching package JSON
    - 404: Teaching package not found (not yet generated or game doesn't exist)
    """
    import json
    from pathlib import Path

    # Build path to teaching package
    teaching_packages_dir = Path(settings.TEACHING_PACKAGES_BASE_DIR)
    package_file = teaching_packages_dir / game_id / f"teaching_package_{game_id}.json"

    # Check if file exists
    if not package_file.exists():
        raise HTTPException(
            status_code=404,
            detail={
                "error": "teaching_package_not_found",
                "message": f"Teaching package not available for game {game_id}",
                "suggestion": "Run Agent Bus analysis to generate teaching package"
            }
        )

    try:
        # Read and return teaching package
        with open(package_file, 'r') as f:
            teaching_package = json.load(f)

        logger.info(f"Teaching package loaded for game {game_id}")
        return teaching_package

    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in teaching package {package_file}: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "invalid_teaching_package",
                "message": "Teaching package file is corrupted or invalid"
            }
        )
    except Exception as e:
        logger.error(f"Error loading teaching package for game {game_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "teaching_package_load_error",
                "message": str(e)
            }
        )


@app.get(f"{settings.API_PREFIX}/games/{{game_id}}/teaching_package/events/{{event_id}}")
async def get_teaching_event(game_id: str, event_id: str):
    """
    Get Teaching Package for a specific event.

    Phase 9C: Returns detailed teaching materials for a single borderline event.

    Returns:
    - event_summary.json: Event analysis with rules and teaching notes
    - 404: Event teaching materials not found
    """
    import json
    from pathlib import Path

    # Build path to event summary
    teaching_packages_dir = Path(settings.TEACHING_PACKAGES_BASE_DIR)
    event_file = teaching_packages_dir / game_id / "events" / f"event_{event_id}" / "event_summary.json"

    # Check if file exists
    if not event_file.exists():
        raise HTTPException(
            status_code=404,
            detail={
                "error": "event_teaching_not_found",
                "message": f"Teaching materials not available for event {event_id} in game {game_id}"
            }
        )

    try:
        # Read and return event summary
        with open(event_file, 'r') as f:
            event_summary = json.load(f)

        logger.info(f"Event teaching materials loaded for event {event_id} in game {game_id}")
        return event_summary

    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in event summary {event_file}: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "invalid_event_summary",
                "message": "Event summary file is corrupted or invalid"
            }
        )
    except Exception as e:
        logger.error(f"Error loading event summary for event {event_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "event_summary_load_error",
                "message": str(e)
            }
        )


@app.get(f"{settings.API_PREFIX}/games/{{game_id}}/agent_conversation")
async def get_agent_conversation(game_id: str):
    """
    Get Agent Conversation logs for a game.

    Phase 11: Returns AMP message logs from multi-agent analysis.

    The conversation includes:
    - AMP (Agent Message Protocol) messages
    - QSurface reasoning highlights
    - Agent personas (planner, engineer, research)
    - Reasoning traces
    - Recommended actions
    - Timestamps and priorities

    Returns:
    - 200: List of agent messages
    - 404: Conversation logs not found
    """
    import json
    import glob
    from pathlib import Path

    # Try game-specific conversation log first
    teaching_packages_dir = Path(settings.TEACHING_PACKAGES_BASE_DIR)
    game_conversation_file = teaching_packages_dir / game_id / "conversation.jsonl"

    # Also check global conversation logs directory
    logs_dir = Path(settings.TEACHING_PACKAGES_BASE_DIR).parent / "messages" / "logs"

    messages = []

    try:
        # Try game-specific log first
        if game_conversation_file.exists():
            logger.info(f"Loading game-specific conversation log: {game_conversation_file}")
            with open(game_conversation_file, 'r') as f:
                for line in f:
                    if line.strip():
                        try:
                            msg = json.loads(line)
                            messages.append(msg)
                        except json.JSONDecodeError as e:
                            logger.warning(f"Skipping invalid JSON line: {e}")

        # Otherwise, try to find conversation logs that might contain this game_id
        elif logs_dir.exists():
            logger.info(f"Searching for conversation logs in: {logs_dir}")
            conversation_files = glob.glob(str(logs_dir / "conversation_*.jsonl"))

            for conv_file in sorted(conversation_files, reverse=True):  # Most recent first
                logger.info(f"Checking conversation file: {conv_file}")
                with open(conv_file, 'r') as f:
                    for line in f:
                        if line.strip():
                            try:
                                msg = json.loads(line)
                                # Filter for game_id if possible (check metadata)
                                if 'metadata' in msg and msg.get('metadata', {}).get('game_id') == game_id:
                                    messages.append(msg)
                                elif 'surface' in msg and msg.get('surface', {}).get('metadata', {}).get('game_id') == game_id:
                                    messages.append(msg)
                                # For MVP, include all messages if no filtering possible
                                elif not messages:  # If no game-specific messages found, return all from most recent log
                                    messages.append(msg)
                            except json.JSONDecodeError as e:
                                logger.warning(f"Skipping invalid JSON line: {e}")

                # For MVP, if we found messages in one file, stop searching
                if messages:
                    break

        if not messages:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "agent_conversation_not_found",
                    "message": f"Agent conversation logs not available for game {game_id}",
                    "suggestion": "Run Agent Bus analysis to generate conversation logs"
                }
            )

        logger.info(f"Agent conversation loaded for game {game_id}: {len(messages)} messages")
        return messages

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading agent conversation for game {game_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "agent_conversation_load_error",
                "message": str(e)
            }
        )


# =========================================================================
# Phase 13.2: PCOS Kernel Integration - Inbound Event Endpoint
# =========================================================================

@app.post(f"{settings.API_PREFIX}/pcos/inbound")
async def receive_pcos_event(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Receive inbound events from PCOS MCP Kernel.

    Phase 13.2: Bidirectional PCOS integration.

    The MCP Kernel can push events to RefQuest for:
    - Committee decisions (COMMITTEE.DECISION.FINAL)
    - SkillDNA updates from other services
    - Configuration changes
    - Cross-service notifications

    Request body:
    - type: Event type string (e.g., "COMMITTEE.DECISION.FINAL")
    - source: Originating service (e.g., "pcos_committee")
    - payload: Event-specific data
    - correlation_id: Optional correlation ID for tracing

    Returns:
    - status: "received" or "processed"
    - event_id: Stored event ID
    """
    from .models import PcosEvent
    from datetime import datetime
    import uuid

    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    event_type = body.get("type", "UNKNOWN")
    source = body.get("source", "unknown")
    payload = body.get("payload", {})
    correlation_id = body.get("correlation_id")

    if not event_type:
        raise HTTPException(status_code=400, detail="Event type is required")

    # Store inbound event
    event_id = uuid.uuid4()
    pcos_event = PcosEvent(
        id=event_id,
        event_type=event_type,
        source=source,
        payload=payload,
        correlation_id=correlation_id,
        created_at=datetime.utcnow()
    )
    db.add(pcos_event)
    await db.commit()

    logger.info(f"Received PCOS inbound event: {event_type} from {source} (id={event_id})")

    # Route event to appropriate handler based on type
    processed = False
    result_data = {}

    if event_type == "COMMITTEE.DECISION.FINAL":
        # Committee decision from PCOS - update local records
        game_id = payload.get("game_id")
        event_id_ref = payload.get("event_id")
        ruling = payload.get("ruling")
        confidence = payload.get("confidence")

        if game_id and event_id_ref:
            try:
                from sqlalchemy import update
                from .models import CommitteeResult, CommitteeCase
                from uuid import UUID

                # Check if we have a local committee case for this event
                from sqlalchemy import select
                result = await db.execute(
                    select(CommitteeCase).where(CommitteeCase.event_id == UUID(event_id_ref))
                )
                case = result.scalar_one_or_none()

                if case:
                    # Update case status
                    await db.execute(
                        update(CommitteeCase).where(CommitteeCase.id == case.id).values(
                            status="decided",
                            updated_at=datetime.utcnow()
                        )
                    )

                    # Create result record
                    committee_result = CommitteeResult(
                        id=uuid.uuid4(),
                        case_id=case.id,
                        final_ruling=ruling or "No ruling provided",
                        confidence=confidence,
                        persona_votes=payload.get("persona_votes"),
                        applied_to_game=False,
                        created_at=datetime.utcnow()
                    )
                    db.add(committee_result)
                    await db.commit()

                    processed = True
                    result_data["committee_result_id"] = str(committee_result.id)
                    logger.info(f"Applied committee decision to case {case.id}")
            except Exception as e:
                logger.error(f"Failed to process committee decision: {e}")

    elif event_type == "SKILLDNA.PROFILE.UPDATED":
        # SkillDNA profile update from another service
        subject_type = payload.get("subject_type")
        subject_id = payload.get("subject_id")
        delta = payload.get("delta", {})

        if subject_type and subject_id and delta:
            try:
                from sqlalchemy import select, update
                from .models import SkillDNAProfile, SubjectType
                from uuid import UUID

                # Find existing profile
                result = await db.execute(
                    select(SkillDNAProfile).where(
                        SkillDNAProfile.subject_type == SubjectType(subject_type),
                        SkillDNAProfile.subject_id == UUID(subject_id)
                    )
                )
                profile = result.scalar_one_or_none()

                if profile:
                    # Merge delta into profile_vector
                    current_vector = profile.profile_vector or {}
                    for key, value in delta.items():
                        if key in current_vector and isinstance(current_vector[key], (int, float)):
                            # Average the values for numeric fields
                            current_vector[key] = (current_vector[key] + value) / 2
                        else:
                            current_vector[key] = value

                    await db.execute(
                        update(SkillDNAProfile).where(SkillDNAProfile.id == profile.id).values(
                            profile_vector=current_vector,
                            updated_at=datetime.utcnow()
                        )
                    )
                    await db.commit()

                    processed = True
                    result_data["profile_id"] = str(profile.id)
                    logger.info(f"Updated SkillDNA profile {profile.id} from PCOS event")
            except Exception as e:
                logger.error(f"Failed to process SkillDNA update: {e}")

    elif event_type.startswith("CONFIG."):
        # Configuration update from PCOS
        logger.info(f"Received config event: {event_type} - {payload}")
        processed = True

    elif event_type.startswith("NOTIFICATION."):
        # Cross-service notification
        logger.info(f"Received notification: {event_type} - {payload}")
        processed = True

    return {
        "status": "processed" if processed else "received",
        "event_id": str(event_id),
        "event_type": event_type,
        "source": source,
        "result": result_data if result_data else None
    }


@app.get(f"{settings.API_PREFIX}/pcos/events")
async def list_pcos_events(
    event_type: str = None,
    source: str = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """
    List PCOS events from local event store.

    Phase 13.2: Query stored PCOS events for debugging/monitoring.

    Query params:
    - event_type: Filter by event type
    - source: Filter by source service
    - limit: Max events to return (default 100)

    Returns:
    - total_events: Count of matching events
    - events: List of event records
    """
    from sqlalchemy import select
    from .models import PcosEvent

    query = select(PcosEvent).order_by(PcosEvent.created_at.desc())

    if event_type:
        query = query.where(PcosEvent.event_type == event_type)

    if source:
        query = query.where(PcosEvent.source == source)

    query = query.limit(limit)
    result = await db.execute(query)
    events = result.scalars().all()

    return {
        "total_events": len(events),
        "events": [
            {
                "id": str(e.id),
                "event_type": e.event_type,
                "source": e.source,
                "payload": e.payload,
                "correlation_id": e.correlation_id,
                "created_at": e.created_at.isoformat() if e.created_at else None
            }
            for e in events
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.API_HOST, port=settings.API_PORT)
