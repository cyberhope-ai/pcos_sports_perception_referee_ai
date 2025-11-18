"""
PCOS Bridge Models

Pydantic models for PCOS event bus communication.
These ensure type safety and validation for all PCOS messages.
"""
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime


# Base PCOSEvent
class PCOSEvent(BaseModel):
    """Base PCOS Event model"""
    id: str
    event_type: str
    timestamp: float
    actors_involved: List[str] = []
    metadata: Dict[str, Any] = {}


# Specific Event Types (matching SPEC_KIT)
class CandidateFoulEventModel(PCOSEvent):
    """Candidate foul event model"""
    event_type: Literal["candidate_foul"] = "candidate_foul"
    foul_type: Optional[str] = None
    confidence: float
    involved_players: List[str] = []
    involved_officials: List[str] = []


class RefMechanicsEventModel(PCOSEvent):
    """Referee mechanics event model"""
    event_type: Literal["ref_mechanics"] = "ref_mechanics"
    official_id: str
    position_score: float
    visibility_score: float
    rotation_correct: bool


class CrewRotationEventModel(PCOSEvent):
    """Crew rotation event model"""
    event_type: Literal["crew_rotation"] = "crew_rotation"
    late: bool
    misaligned: bool
    rotation_quality: float


class GameClipEventModel(PCOSEvent):
    """Game clip event model"""
    event_type: Literal["clip_generated"] = "clip_generated"
    clip_id: str
    qsurface_ids: List[str] = []


# Video Ingest Event
class VideoIngestEvent(BaseModel):
    """Video ingestion event"""
    game_id: str
    video_path: str
    source_type: str  # "local", "youtube", "hudl", "jetson"
    ingested_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = {}
