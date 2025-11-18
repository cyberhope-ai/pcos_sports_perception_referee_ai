"""
Configuration management for PCOS Sports Perception Referee AI
"""
import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/refquest_ai"
    )

    # API
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_PREFIX: str = "/api/v1"

    # PCOS Event Bus
    PCOS_EVENT_BUS_URL: Optional[str] = os.getenv("PCOS_EVENT_BUS_URL")
    PCOS_EVENT_BUS_ENABLED: bool = os.getenv("PCOS_EVENT_BUS_ENABLED", "false").lower() == "true"

    # Model paths
    YOLO_MODEL_PATH: str = os.getenv("YOLO_MODEL_PATH", "yolov8n.pt")
    DETECTOR_CONFIDENCE: float = 0.5
    TRACKER_IOU_THRESHOLD: float = 0.3

    # Video processing
    MAX_VIDEO_SIZE_MB: int = 500
    FRAME_BATCH_SIZE: int = 32

    # Feature flags
    ENABLE_POSE_ESTIMATION: bool = False  # v2 feature
    ENABLE_BALL_DETECTION: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
