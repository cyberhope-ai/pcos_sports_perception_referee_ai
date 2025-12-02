"""
RefQuest 2.0 — Challenge Model
"""

import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum


class ChallengeStatus(Enum):
    """Challenge attempt status."""
    CREATED = "created"
    STARTED = "started"
    RECORDING = "recording"
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    SCORING = "scoring"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class Challenge:
    """An active challenge attempt."""
    challenge_id: str = field(default_factory=lambda: f"chal-{uuid.uuid4().hex[:12]}")
    user_id: str = ""
    quest_id: str = ""

    # Timing
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    # Status
    status: ChallengeStatus = ChallengeStatus.CREATED
    current_step: int = 0
    progress_percent: float = 0.0

    # Evidence
    evidence_package_id: Optional[str] = None

    # Results (populated after completion)
    result_id: Optional[str] = None
    final_score: Optional[float] = None

    # PCOS linking
    qsurface_session_id: Optional[str] = None
    twinflow_session_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "challenge_id": self.challenge_id,
            "user_id": self.user_id,
            "quest_id": self.quest_id,
            "created_at": self.created_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "status": self.status.value,
            "current_step": self.current_step,
            "progress_percent": self.progress_percent,
            "evidence_package_id": self.evidence_package_id,
            "result_id": self.result_id,
            "final_score": self.final_score,
            "qsurface_session_id": self.qsurface_session_id,
            "twinflow_session_id": self.twinflow_session_id,
        }


__all__ = ["Challenge", "ChallengeStatus"]
