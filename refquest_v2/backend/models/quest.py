"""
RefQuest 2.0 — Quest Model
"""

import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime


@dataclass
class QuestSummary:
    """Lightweight quest summary for listings."""
    quest_id: str = ""
    name: str = ""
    title: str = ""
    category: str = ""
    difficulty: str = ""
    step_count: int = 0
    time_limit_minutes: Optional[float] = None
    thumbnail_url: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "quest_id": self.quest_id,
            "name": self.name,
            "title": self.title,
            "category": self.category,
            "difficulty": self.difficulty,
            "step_count": self.step_count,
            "time_limit_minutes": self.time_limit_minutes,
            "thumbnail_url": self.thumbnail_url,
        }


# Re-export Quest from quest_schema for convenience
from ..quest_schema import Quest

__all__ = ["Quest", "QuestSummary"]
