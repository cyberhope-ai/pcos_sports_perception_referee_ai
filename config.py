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

    # Vision device (Phase 2)
    VISION_DEVICE: str = os.getenv("VISION_DEVICE", "cuda" if __import__('torch').cuda.is_available() else "cpu")
    VISION_USE_FP16: bool = os.getenv("VISION_USE_FP16", "false").lower() == "true"  # Jetson optimization

    # Model paths (Phase 2 - YOLOv8s)
    YOLO_MODEL_PATH: str = os.getenv("YOLO_MODEL_PATH", "yolov8s.pt")  # Vale-certified
    DETECTOR_CONFIDENCE: float = float(os.getenv("DETECTOR_CONFIDENCE", "0.5"))
    DETECTOR_IOU: float = float(os.getenv("DETECTOR_IOU", "0.45"))
    DETECTOR_MAX_DET: int = int(os.getenv("DETECTOR_MAX_DET", "300"))
    DETECTOR_IMGSZ: int = int(os.getenv("DETECTOR_IMGSZ", "640"))

    # Tracking (Phase 2 - ByteTrack)
    TRACKER_TRACK_THRESH: float = float(os.getenv("TRACKER_TRACK_THRESH", "0.5"))
    TRACKER_MATCH_THRESH: float = float(os.getenv("TRACKER_MATCH_THRESH", "0.8"))
    TRACKER_BUFFER: int = int(os.getenv("TRACKER_BUFFER", "30"))
    TRACKER_TRAJECTORY_LENGTH: int = int(os.getenv("TRACKER_TRAJECTORY_LENGTH", "30"))

    # Video processing
    MAX_VIDEO_SIZE_MB: int = 500
    FRAME_BATCH_SIZE: int = int(os.getenv("FRAME_BATCH_SIZE", "16"))  # Batch size for GPU inference
    VIDEO_FPS_SAMPLING: int = int(os.getenv("VIDEO_FPS_SAMPLING", "0"))  # 0 = process all frames

    # Feature flags
    ENABLE_POSE_ESTIMATION: bool = False  # Phase 3+ feature
    ENABLE_BALL_DETECTION: bool = True
    ENABLE_PERCEPTION_LOGGING: bool = os.getenv("ENABLE_PERCEPTION_LOGGING", "true").lower() == "true"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
