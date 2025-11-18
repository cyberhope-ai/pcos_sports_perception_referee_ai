"""
SQLAlchemy Database Models for PCOS Sports Perception Referee AI

All models follow the SPEC_KIT definitions and are PCOS-native compatible.
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, JSON,
    ForeignKey, Text, Enum as SQLEnum, Index
)
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import enum
import uuid


Base = declarative_base()


# Enums
class ActorType(str, enum.Enum):
    """Actor type enumeration"""
    player = "player"
    referee = "referee"
    ball = "ball"


class SportType(str, enum.Enum):
    """Sport type enumeration"""
    basketball = "basketball"
    football = "football"


class EventType(str, enum.Enum):
    """PCOSEvent type enumeration"""
    candidate_foul = "candidate_foul"
    ref_mechanics = "ref_mechanics"
    crew_rotation = "crew_rotation"
    clip_generated = "clip_generated"


class SurfaceType(str, enum.Enum):
    """QSurface type enumeration"""
    referee_view = "referee_view"
    coach_view = "coach_view"
    player_view = "player_view"
    league_view = "league_view"


# Core Models
class Game(Base):
    """Game model - represents a single game/scrimmage/practice session"""
    __tablename__ = "games"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sport = Column(SQLEnum(SportType), nullable=False)
    video_path = Column(String, nullable=False)
    video_sources = Column(JSONB, default=list)  # List of video source URLs/paths

    # Metadata
    game_date = Column(DateTime, nullable=True)
    venue = Column(String, nullable=True)
    level = Column(String, nullable=True)  # e.g., "HS", "NCAA D1", "Semi-Pro"

    # Processing status
    ingested_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)
    processing_status = Column(String, default="pending")  # pending, processing, completed, failed

    # Relationships
    actors = relationship("Actor", back_populates="game", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="game", cascade="all, delete-orphan")
    clips = relationship("Clip", back_populates="game", cascade="all, delete-orphan")

    # Indices
    __table_args__ = (
        Index("idx_game_sport", "sport"),
        Index("idx_game_status", "processing_status"),
        Index("idx_game_date", "game_date"),
    )


class Actor(Base):
    """Actor model - represents players, referees, and ball"""
    __tablename__ = "actors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    game_id = Column(UUID(as_uuid=True), ForeignKey("games.id"), nullable=False)
    actor_type = Column(SQLEnum(ActorType), nullable=False)

    # Identity
    jersey_number = Column(Integer, nullable=True)
    team_id = Column(String, nullable=True)
    name = Column(String, nullable=True)

    # Trajectory and detection data (stored as JSONB for efficiency)
    trajectory = Column(JSONB, default=list)  # List[Dict] with frame, x, y, timestamp
    bounding_boxes = Column(JSONB, default=list)  # List[Dict] with frame, bbox coords

    # Metadata
    first_seen_frame = Column(Integer, nullable=True)
    last_seen_frame = Column(Integer, nullable=True)
    confidence_avg = Column(Float, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    game = relationship("Game", back_populates="actors")
    detections = relationship("Detection", back_populates="actor", cascade="all, delete-orphan")
    skilldna_updates = relationship("SkillDNAUpdate", back_populates="actor", cascade="all, delete-orphan")

    # Indices
    __table_args__ = (
        Index("idx_actor_game", "game_id"),
        Index("idx_actor_type", "actor_type"),
        Index("idx_actor_jersey", "jersey_number"),
    )


class Detection(Base):
    """Frame-level detection data"""
    __tablename__ = "detections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("actors.id"), nullable=False)

    frame_number = Column(Integer, nullable=False)
    timestamp = Column(Float, nullable=False)  # seconds in video

    # Bounding box [x1, y1, x2, y2] normalized or pixel coords
    bbox = Column(JSONB, nullable=False)
    confidence = Column(Float, nullable=False)

    # Optional pose/keypoints (for v2)
    keypoints = Column(JSONB, nullable=True)

    # Relationships
    actor = relationship("Actor", back_populates="detections")

    # Indices
    __table_args__ = (
        Index("idx_detection_actor", "actor_id"),
        Index("idx_detection_frame", "frame_number"),
    )


class Event(Base):
    """PCOSEvent model - semantic officiating events"""
    __tablename__ = "events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    game_id = Column(UUID(as_uuid=True), ForeignKey("games.id"), nullable=False)
    event_type = Column(SQLEnum(EventType), nullable=False)

    timestamp = Column(Float, nullable=False)  # seconds in video
    frame_number = Column(Integer, nullable=False)

    # Actors involved
    actors_involved = Column(JSONB, default=list)  # List of actor IDs

    # Location on court/field
    location = Column(JSONB, nullable=True)  # {x, y, zone, etc.}

    # Event-specific metadata (varies by event_type)
    metadata = Column(JSONB, default=dict)

    # For candidate_foul events
    foul_type = Column(String, nullable=True)  # "block", "charge", "illegal_screen", etc.
    confidence = Column(Float, nullable=True)

    # For ref_mechanics events
    official_id = Column(UUID(as_uuid=True), nullable=True)
    position_score = Column(Float, nullable=True)
    visibility_score = Column(Float, nullable=True)
    rotation_correct = Column(Boolean, nullable=True)

    # For crew_rotation events
    rotation_quality = Column(Float, nullable=True)
    late = Column(Boolean, nullable=True)
    misaligned = Column(Boolean, nullable=True)

    # For clip_generated events
    clip_id = Column(UUID(as_uuid=True), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    game = relationship("Game", back_populates="events")
    qsurfaces = relationship("QSurface", back_populates="event", cascade="all, delete-orphan")

    # Indices
    __table_args__ = (
        Index("idx_event_game", "game_id"),
        Index("idx_event_type", "event_type"),
        Index("idx_event_timestamp", "timestamp"),
    )


class QSurface(Base):
    """QSurface model - multi-perspective event interpretations"""
    __tablename__ = "qsurfaces"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id"), nullable=False)
    surface_type = Column(SQLEnum(SurfaceType), nullable=False)

    persona_id = Column(String, nullable=True)  # ID of specific ref, coach, player, or league

    # Common fields
    metadata = Column(JSONB, default=dict)

    # RefereeQSurface specific
    call_made = Column(String, nullable=True)
    correct_call = Column(String, nullable=True)
    mechanics_score = Column(Float, nullable=True)
    visibility_score = Column(Float, nullable=True)
    positioning_vector = Column(JSONB, nullable=True)  # List[float]

    # CoachQSurface specific
    offensive_structure = Column(String, nullable=True)
    defensive_structure = Column(String, nullable=True)
    impact_on_possession = Column(String, nullable=True)

    # PlayerQSurface specific
    decision_quality_score = Column(Float, nullable=True)
    risk_factor = Column(Float, nullable=True)
    foul_tendency_update = Column(JSONB, nullable=True)

    # LeagueQSurface specific
    fairness_index = Column(Float, nullable=True)
    consistency_signal = Column(Float, nullable=True)
    crew_score_update = Column(JSONB, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    event = relationship("Event", back_populates="qsurfaces")

    # Indices
    __table_args__ = (
        Index("idx_qsurface_event", "event_id"),
        Index("idx_qsurface_type", "surface_type"),
        Index("idx_qsurface_persona", "persona_id"),
    )


class Clip(Base):
    """Video clip model - extracted teachable moments"""
    __tablename__ = "clips"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    game_id = Column(UUID(as_uuid=True), ForeignKey("games.id"), nullable=False)

    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    start_frame = Column(Integer, nullable=False)
    end_frame = Column(Integer, nullable=False)

    clip_path = Column(String, nullable=True)  # Path to extracted clip file
    thumbnail_path = Column(String, nullable=True)

    # Associated event(s)
    event_anchor_id = Column(UUID(as_uuid=True), nullable=True)
    related_events = Column(JSONB, default=list)  # List of event IDs

    # Classification
    clip_category = Column(String, nullable=True)  # "teaching", "highlight", "controversial"
    tags = Column(JSONB, default=list)

    qsurface_ids = Column(JSONB, default=list)  # List of QSurface IDs

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    game = relationship("Game", back_populates="clips")

    # Indices
    __table_args__ = (
        Index("idx_clip_game", "game_id"),
        Index("idx_clip_category", "clip_category"),
    )


class SkillDNAUpdate(Base):
    """SkillDNA update log - tracks skill evolution over time"""
    __tablename__ = "skilldna_updates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("actors.id"), nullable=False)

    update_type = Column(String, nullable=False)  # "referee" or "player"

    # Timestamp
    updated_at = Column(DateTime, default=datetime.utcnow)
    game_id = Column(UUID(as_uuid=True), nullable=True)
    event_id = Column(UUID(as_uuid=True), nullable=True)

    # Referee SkillDNA fields
    call_accuracy = Column(Float, nullable=True)
    missed_call_rate = Column(Float, nullable=True)
    rotation_efficiency = Column(Float, nullable=True)
    mechanics_consistency = Column(Float, nullable=True)
    visibility_efficiency = Column(Float, nullable=True)
    high_pressure_accuracy = Column(Float, nullable=True)
    bias_tendency = Column(JSONB, nullable=True)  # Dict of bias metrics

    # Player SkillDNA fields
    foul_tendency = Column(JSONB, nullable=True)  # Dict by foul type
    contact_behavior = Column(JSONB, nullable=True)
    defensive_discipline = Column(Float, nullable=True)
    decision_quality = Column(Float, nullable=True)

    # Delta/update metadata
    delta_values = Column(JSONB, nullable=True)  # What changed
    confidence = Column(Float, nullable=True)

    # Relationships
    actor = relationship("Actor", back_populates="skilldna_updates")

    # Indices
    __table_args__ = (
        Index("idx_skilldna_actor", "actor_id"),
        Index("idx_skilldna_type", "update_type"),
        Index("idx_skilldna_updated", "updated_at"),
    )
