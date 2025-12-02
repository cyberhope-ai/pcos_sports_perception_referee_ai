"""
RefQuest 2.0 — FastAPI Application
PrecognitionOS Studio

Main API application with all routes and PCOS integration.
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Dict, List, Any, Optional
from pydantic import BaseModel
from datetime import datetime
import asyncio

# Import RefQuest components
from ..quest_library import get_quest_library
from ..sample_quests import load_sample_quests
from ..controllers import get_challenge_controller, ChallengePhase
from ..scoring import get_skilldna_engine, get_mastery_tracker, get_badge_system
from ..ingestion import get_twinflow_bridge, get_evidence_processor


# Pydantic models for request/response
class StartChallengeRequest(BaseModel):
    quest_id: str
    user_id: str


class StepCaptureRequest(BaseModel):
    challenge_id: str
    camera_ids: Optional[List[str]] = None


class SkillAttemptRequest(BaseModel):
    skill_id: str
    score: float
    quest_id: Optional[str] = None
    difficulty: str = "intermediate"


# Create FastAPI app
def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="RefQuest 2.0 API",
        description="PCOS-Native Skill Verification Platform",
        version="2.0.0",
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Load sample quests on startup
    @app.on_event("startup")
    async def startup():
        load_sample_quests()
        print("RefQuest 2.0 API started")

    # ============ Quest Routes ============

    @app.get("/api/quests")
    async def list_quests(
        category: Optional[str] = None,
        difficulty: Optional[str] = None,
        limit: int = 50,
    ):
        """List available quests."""
        library = get_quest_library()
        quests = library.list_quests(limit=limit)

        return {
            "quests": [
                {
                    "quest_id": q.quest_id,
                    "name": q.name,
                    "title": q.title,
                    "description": q.description,
                    "category": q.category.value,
                    "difficulty": q.difficulty,
                    "step_count": len(q.steps),
                    "total_points": q.total_points,
                    "passing_score": q.passing_score,
                    "primary_skills": q.primary_skills,
                }
                for q in quests
            ],
            "total": len(quests),
        }

    @app.get("/api/quests/{quest_id}")
    async def get_quest(quest_id: str):
        """Get quest details."""
        library = get_quest_library()
        quest = library.get_quest(quest_id)

        if not quest:
            raise HTTPException(status_code=404, detail="Quest not found")

        return quest.to_dict()

    @app.get("/api/quests/{quest_id}/steps")
    async def get_quest_steps(quest_id: str):
        """Get steps for a quest."""
        library = get_quest_library()
        quest = library.get_quest(quest_id)

        if not quest:
            raise HTTPException(status_code=404, detail="Quest not found")

        return {
            "quest_id": quest_id,
            "steps": [step.to_dict() for step in quest.steps],
        }

    # ============ Challenge Routes ============

    @app.post("/api/challenges/start")
    async def start_challenge(request: StartChallengeRequest):
        """Start a new challenge."""
        controller = get_challenge_controller()

        try:
            progress = await controller.start_challenge(
                quest_id=request.quest_id,
                user_id=request.user_id,
            )
            return progress.to_dict()
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    @app.post("/api/challenges/{challenge_id}/begin")
    async def begin_challenge(challenge_id: str):
        """Begin active phase after briefing."""
        controller = get_challenge_controller()

        try:
            progress = await controller.begin_active_phase(challenge_id)
            return progress.to_dict()
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    @app.post("/api/challenges/{challenge_id}/capture/start")
    async def start_capture(challenge_id: str, request: StepCaptureRequest = None):
        """Start capturing evidence for current step."""
        controller = get_challenge_controller()
        camera_ids = request.camera_ids if request else None

        try:
            progress = await controller.start_step_capture(
                challenge_id=challenge_id,
                camera_ids=camera_ids,
            )
            return progress.to_dict()
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    @app.post("/api/challenges/{challenge_id}/capture/stop")
    async def stop_capture(challenge_id: str):
        """Stop capturing and process evidence."""
        controller = get_challenge_controller()

        try:
            verification = await controller.stop_step_capture(challenge_id)
            return verification.to_dict()
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    @app.post("/api/challenges/{challenge_id}/advance")
    async def advance_step(challenge_id: str):
        """Advance to next step."""
        controller = get_challenge_controller()

        try:
            progress = await controller.advance_step(challenge_id)
            return progress.to_dict()
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    @app.post("/api/challenges/{challenge_id}/complete")
    async def complete_challenge(challenge_id: str):
        """Complete the challenge."""
        controller = get_challenge_controller()

        try:
            progress = await controller.complete_challenge(challenge_id)
            return progress.to_dict()
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    @app.post("/api/challenges/{challenge_id}/cancel")
    async def cancel_challenge(challenge_id: str):
        """Cancel the challenge."""
        controller = get_challenge_controller()

        try:
            progress = await controller.cancel_challenge(challenge_id)
            return progress.to_dict()
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    @app.get("/api/challenges/{challenge_id}")
    async def get_challenge(challenge_id: str):
        """Get challenge progress."""
        controller = get_challenge_controller()
        progress = controller.get_challenge(challenge_id)

        if not progress:
            raise HTTPException(status_code=404, detail="Challenge not found")

        return progress.to_dict()

    @app.get("/api/users/{user_id}/challenges")
    async def get_user_challenges(user_id: str, include_completed: bool = True):
        """Get challenges for a user."""
        controller = get_challenge_controller()
        challenges = controller.get_user_challenges(
            user_id=user_id,
            include_completed=include_completed,
        )

        return {
            "user_id": user_id,
            "challenges": [c.to_dict() for c in challenges],
            "total": len(challenges),
        }

    # ============ SkillDNA Routes ============

    @app.get("/api/users/{user_id}/skills")
    async def get_user_skills(user_id: str):
        """Get user's skill profile."""
        skilldna = get_skilldna_engine()
        profile = skilldna.get_profile(user_id)

        return profile.to_dict()

    @app.get("/api/users/{user_id}/mastery")
    async def get_user_mastery(user_id: str, category: Optional[str] = None):
        """Get user's mastery levels."""
        tracker = get_mastery_tracker()
        skills = tracker.get_user_skills(category=category)

        return {
            "user_id": user_id,
            "skills": [s.to_dict() for s in skills],
            "summary": tracker.get_mastery_summary(),
        }

    @app.post("/api/skills/record")
    async def record_skill_attempt(request: SkillAttemptRequest):
        """Record a skill attempt."""
        tracker = get_mastery_tracker()

        mastery = tracker.record_attempt(
            skill_id=request.skill_id,
            score=request.score,
            quest_id=request.quest_id or "",
            difficulty=request.difficulty,
        )

        return mastery.to_dict()

    # ============ Badge Routes ============

    @app.get("/api/users/{user_id}/badges")
    async def get_user_badges(user_id: str):
        """Get user's badges."""
        badges = get_badge_system()
        user_badges = badges.get_user_badge_details(user_id)
        total_xp = badges.get_total_xp(user_id)

        return {
            "user_id": user_id,
            "badges": user_badges,
            "total_xp": total_xp,
        }

    @app.get("/api/badges/available")
    async def get_available_badges(user_id: Optional[str] = None):
        """Get all available badges."""
        badges = get_badge_system()

        if user_id:
            available = badges.get_available_badges(user_id)
            return {
                "badges": [b.to_dict() for b in available],
                "user_id": user_id,
            }

        return {
            "badges": [b.to_dict() for b in badges.definitions.values()],
            "stats": badges.get_stats(),
        }

    # ============ System Routes ============

    @app.get("/api/health")
    async def health_check():
        """Health check endpoint."""
        return {
            "status": "healthy",
            "service": "refquest",
            "version": "2.0.0",
            "timestamp": datetime.now().isoformat(),
        }

    @app.get("/api/stats")
    async def get_stats():
        """Get system statistics."""
        controller = get_challenge_controller()
        library = get_quest_library()
        badges = get_badge_system()
        bridge = get_twinflow_bridge()

        return {
            "quests": library.get_stats(),
            "challenges": controller.get_stats(),
            "badges": badges.get_stats(),
            "twinflow": bridge.get_stats(),
        }

    # ============ WebSocket for Real-time Updates ============

    class ConnectionManager:
        def __init__(self):
            self.active_connections: Dict[str, List[WebSocket]] = {}

        async def connect(self, websocket: WebSocket, challenge_id: str):
            await websocket.accept()
            if challenge_id not in self.active_connections:
                self.active_connections[challenge_id] = []
            self.active_connections[challenge_id].append(websocket)

        def disconnect(self, websocket: WebSocket, challenge_id: str):
            if challenge_id in self.active_connections:
                self.active_connections[challenge_id].remove(websocket)

        async def broadcast(self, challenge_id: str, message: dict):
            if challenge_id in self.active_connections:
                for connection in self.active_connections[challenge_id]:
                    try:
                        await connection.send_json(message)
                    except Exception:
                        pass

    manager = ConnectionManager()

    @app.websocket("/ws/challenge/{challenge_id}")
    async def websocket_challenge(websocket: WebSocket, challenge_id: str):
        """WebSocket for real-time challenge updates."""
        await manager.connect(websocket, challenge_id)
        try:
            while True:
                data = await websocket.receive_text()
                # Echo back for now
                await websocket.send_json({"type": "ack", "data": data})
        except WebSocketDisconnect:
            manager.disconnect(websocket, challenge_id)

    return app


# Create default app instance
app = create_app()
