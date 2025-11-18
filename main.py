"""
FastAPI Main Application

PCOS Sports Perception Referee AI - API Server
"""
from fastapi import FastAPI, Depends, HTTPException
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
    db: AsyncSession = Depends(get_db)
):
    """
    Ingest a video file for processing.

    Phase 2 TODO: Trigger actual perception pipeline
    """
    from .models import Game, SportType
    import uuid

    # Create game record
    game = Game(
        id=uuid.uuid4(),
        sport=SportType(sport),
        video_path=video_path,
        processing_status="pending"
    )
    db.add(game)
    await db.commit()

    logger.info(f"Game created: {game.id}")

    return {
        "game_id": str(game.id),
        "status": "ingested",
        "message": "Video ingested. Processing will begin in Phase 2."
    }


@app.get(f"{settings.API_PREFIX}/games/{{game_id}}/events")
async def get_game_events(game_id: str, db: AsyncSession = Depends(get_db)):
    """Get all events for a game"""
    from sqlalchemy import select
    from .models import Event
    from uuid import UUID

    result = await db.execute(select(Event).where(Event.game_id == UUID(game_id)))
    events = result.scalars().all()

    return {
        "game_id": game_id,
        "events": [
            {
                "id": str(e.id),
                "event_type": e.event_type.value if hasattr(e.event_type, 'value') else e.event_type,
                "timestamp": e.timestamp
            }
            for e in events
        ]
    }


@app.get(f"{settings.API_PREFIX}/events/{{event_id}}/qsurfaces")
async def get_event_qsurfaces(event_id: str, db: AsyncSession = Depends(get_db)):
    """Get all QSurfaces for an event"""
    from sqlalchemy import select
    from .models import QSurface
    from uuid import UUID

    result = await db.execute(select(QSurface).where(QSurface.event_id == UUID(event_id)))
    surfaces = result.scalars().all()

    return {
        "event_id": event_id,
        "qsurfaces": [
            {
                "id": str(s.id),
                "surface_type": s.surface_type.value if hasattr(s.surface_type, 'value') else s.surface_type,
                "persona_id": s.persona_id
            }
            for s in surfaces
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.API_HOST, port=settings.API_PORT)
