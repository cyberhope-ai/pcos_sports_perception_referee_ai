"""
FastAPI Main Application

PCOS Sports Perception Referee AI - API Server
"""
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
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


# API v1 routes
@app.get(f"{settings.API_PREFIX}/games")
async def list_games(db: AsyncSession = Depends(get_db)):
    """List all games"""
    from sqlalchemy import select
    result = await db.execute(select(Game))
    games = result.scalars().all()
    return {"games": [{"id": str(g.id), "sport": g.sport, "status": g.processing_status} for g in games]}


@app.post(f"{settings.API_PREFIX}/ingest/video")
async def ingest_video(
    video_path: str,
    sport: str = "basketball",
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Ingest a video file for processing.

    Phase 2: Triggers YOLOv8s detection + ByteTrack tracking pipeline.
    """
    from .models import Game, SportType
    from .ingestion.video_processor import get_processor
    from fastapi import BackgroundTasks
    import uuid
    from datetime import datetime

    # Create game record
    game = Game(
        id=uuid.uuid4(),
        sport=SportType(sport),
        video_path=video_path,
        processing_status="processing"
    )
    db.add(game)
    await db.commit()

    logger.info(f"Game created: {game.id} - Starting perception pipeline...")

    # Process video in background (Phase 2)
    async def process_video_task():
        try:
            processor = await get_processor()
            from .database import get_db
            async for db_session in get_db():
                stats = await processor.process_video(video_path, game.id, db_session)
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
    if background_tasks:
        background_tasks.add_task(process_video_task)
    else:
        import asyncio
        asyncio.create_task(process_video_task())

    return {
        "game_id": str(game.id),
        "status": "processing",
        "message": "Video ingestion started. YOLOv8s detection + ByteTrack tracking in progress."
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.API_HOST, port=settings.API_PORT)
