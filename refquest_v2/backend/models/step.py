"""
RefQuest 2.0 — Step Model
"""

import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime

# Re-export Step from quest_schema
from ..quest_schema import Step


@dataclass
class StepResult:
    """Result of a single step verification."""
    step_id: str = ""
    step_name: str = ""
    order: int = 0

    # Verification
    verified: bool = False
    confidence: float = 0.0
    score: float = 0.0

    # Evidence matching
    objects_found: List[str] = field(default_factory=list)
    objects_missing: List[str] = field(default_factory=list)
    actions_detected: List[str] = field(default_factory=list)
    actions_missing: List[str] = field(default_factory=list)
    tools_found: List[str] = field(default_factory=list)
    tools_missing: List[str] = field(default_factory=list)

    # Timing
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_seconds: float = 0.0

    # Issues
    anomalies: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)

    # SkillDNA contribution
    skill_scores: Dict[str, float] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "step_id": self.step_id,
            "step_name": self.step_name,
            "order": self.order,
            "verified": self.verified,
            "confidence": self.confidence,
            "score": self.score,
            "objects_found": self.objects_found,
            "objects_missing": self.objects_missing,
            "actions_detected": self.actions_detected,
            "actions_missing": self.actions_missing,
            "tools_found": self.tools_found,
            "tools_missing": self.tools_missing,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "duration_seconds": self.duration_seconds,
            "anomalies": self.anomalies,
            "errors": self.errors,
            "notes": self.notes,
            "skill_scores": self.skill_scores,
        }


__all__ = ["Step", "StepResult"]
