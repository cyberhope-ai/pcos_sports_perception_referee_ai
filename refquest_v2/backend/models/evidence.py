"""
RefQuest 2.0 — Evidence Model
"""

import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum


class EvidenceStatus(Enum):
    """Status of evidence processing."""
    PENDING = "pending"
    UPLOADING = "uploading"
    PROCESSING = "processing"
    ANALYZED = "analyzed"
    VERIFIED = "verified"
    FAILED = "failed"


@dataclass
class Evidence:
    """A single piece of evidence."""
    evidence_id: str = field(default_factory=lambda: f"ev-{uuid.uuid4().hex[:12]}")
    attempt_id: str = ""
    evidence_type: str = "video"  # video, audio, screenshot, sensor

    # File info
    file_path: Optional[str] = None
    file_size_bytes: int = 0
    mime_type: str = ""
    duration_seconds: float = 0.0

    # Timestamps
    captured_at: datetime = field(default_factory=datetime.now)
    uploaded_at: Optional[datetime] = None
    processed_at: Optional[datetime] = None

    # Status
    status: EvidenceStatus = EvidenceStatus.PENDING

    # Analysis results (populated by TwinFlow)
    detections: List[Dict[str, Any]] = field(default_factory=list)
    actions: List[str] = field(default_factory=list)
    objects: List[str] = field(default_factory=list)
    transcript: str = ""

    # PCOS linking
    twinflow_packet_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "evidence_id": self.evidence_id,
            "attempt_id": self.attempt_id,
            "evidence_type": self.evidence_type,
            "file_path": self.file_path,
            "file_size_bytes": self.file_size_bytes,
            "mime_type": self.mime_type,
            "duration_seconds": self.duration_seconds,
            "captured_at": self.captured_at.isoformat(),
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "processed_at": self.processed_at.isoformat() if self.processed_at else None,
            "status": self.status.value,
            "detections": self.detections,
            "actions": self.actions,
            "objects": self.objects,
            "transcript": self.transcript,
            "twinflow_packet_id": self.twinflow_packet_id,
        }


@dataclass
class EvidencePackage:
    """Collection of evidence for a challenge attempt."""
    package_id: str = field(default_factory=lambda: f"pkg-{uuid.uuid4().hex[:8]}")
    attempt_id: str = ""

    # Evidence items
    video: Optional[Evidence] = None
    audio: Optional[Evidence] = None
    screenshots: List[Evidence] = field(default_factory=list)
    sensors: List[Evidence] = field(default_factory=list)

    # Combined analysis
    total_duration_seconds: float = 0.0
    combined_transcript: str = ""
    all_objects: List[str] = field(default_factory=list)
    all_actions: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "package_id": self.package_id,
            "attempt_id": self.attempt_id,
            "video": self.video.to_dict() if self.video else None,
            "audio": self.audio.to_dict() if self.audio else None,
            "screenshots": [s.to_dict() for s in self.screenshots],
            "sensors": [s.to_dict() for s in self.sensors],
            "total_duration_seconds": self.total_duration_seconds,
            "combined_transcript": self.combined_transcript,
            "all_objects": self.all_objects,
            "all_actions": self.all_actions,
        }


__all__ = ["Evidence", "EvidencePackage", "EvidenceStatus"]
