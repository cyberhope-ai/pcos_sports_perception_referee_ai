"""
RefQuest 2.0 — SkillDNA Engine
PrecognitionOS Studio

Evidence-based skill scoring using TwinFlow analysis.
Tracks mastery vectors and competency progression.
"""

import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime


@dataclass
class SkillProfile:
    """User's skill profile in SkillDNA."""
    user_id: str = ""
    skills: Dict[str, float] = field(default_factory=dict)  # skill_tag -> mastery_level (0-1)
    badges: List[str] = field(default_factory=list)
    total_quests: int = 0
    total_score: float = 0.0
    updated_at: datetime = field(default_factory=datetime.now)

    @property
    def average_score(self) -> float:
        return self.total_score / self.total_quests if self.total_quests > 0 else 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "skills": self.skills,
            "badges": self.badges,
            "total_quests": self.total_quests,
            "average_score": self.average_score,
            "updated_at": self.updated_at.isoformat(),
        }


class SkillDNAEngine:
    """
    SkillDNA scoring and tracking engine.

    Processes TwinFlow evidence to update skill profiles.
    Implements mastery vector calculations.
    """

    def __init__(self):
        self.profiles: Dict[str, SkillProfile] = {}
        self.badge_thresholds = {
            "novice": 0.2,
            "apprentice": 0.4,
            "journeyman": 0.6,
            "expert": 0.8,
            "master": 0.95,
        }

    def get_profile(self, user_id: str) -> SkillProfile:
        """Get or create a skill profile for a user."""
        if user_id not in self.profiles:
            self.profiles[user_id] = SkillProfile(user_id=user_id)
        return self.profiles[user_id]

    async def update_from_twinflow(
        self,
        user_id: str,
        twinflow_report: Dict[str, Any],
        quest_skills: List[str]
    ) -> Dict[str, float]:
        """
        Update skill profile from TwinFlow analysis results.

        Args:
            user_id: User identifier
            twinflow_report: TwinFlow report with scores
            quest_skills: Skills evaluated in the quest

        Returns:
            Dict of skill deltas
        """
        profile = self.get_profile(user_id)
        deltas = {}

        overall_score = twinflow_report.get("overall_score", 0) / 100
        mastery_progress = twinflow_report.get("mastery_progress", {})

        for skill in quest_skills:
            current = profile.skills.get(skill, 0.0)
            # Calculate new mastery level
            progress = mastery_progress.get(skill, overall_score)
            # Weighted update
            new_level = current * 0.7 + progress * 0.3
            delta = new_level - current
            profile.skills[skill] = min(1.0, new_level)
            deltas[skill] = delta

        # Update quest count
        profile.total_quests += 1
        profile.total_score += twinflow_report.get("overall_score", 0)
        profile.updated_at = datetime.now()

        # Check for new badges
        self._check_badges(profile)

        return deltas

    def _check_badges(self, profile: SkillProfile):
        """Check and award badges based on skill levels."""
        for skill, level in profile.skills.items():
            for badge_name, threshold in self.badge_thresholds.items():
                badge_id = f"{skill}_{badge_name}"
                if level >= threshold and badge_id not in profile.badges:
                    profile.badges.append(badge_id)

    def calculate_score(
        self,
        step_results: List[Dict[str, Any]],
        weights: Dict[str, float] = None
    ) -> Dict[str, float]:
        """
        Calculate scores from step verification results.

        Args:
            step_results: List of step verification results
            weights: Optional scoring weights

        Returns:
            Dict with score breakdown
        """
        weights = weights or {
            "technique": 0.30,
            "safety": 0.25,
            "efficiency": 0.20,
            "completeness": 0.25,
        }

        # Calculate component scores (placeholder logic)
        technique = sum(s.get("confidence", 0) for s in step_results) / max(len(step_results), 1)
        safety = 1.0  # Assume safe unless anomalies
        efficiency = 0.8  # Placeholder
        completeness = sum(1 for s in step_results if s.get("verified", False)) / max(len(step_results), 1)

        overall = (
            technique * weights["technique"] +
            safety * weights["safety"] +
            efficiency * weights["efficiency"] +
            completeness * weights["completeness"]
        ) * 100

        return {
            "overall_score": overall,
            "technique_score": technique * 100,
            "safety_score": safety * 100,
            "efficiency_score": efficiency * 100,
            "completeness_score": completeness * 100,
        }

    def get_stats(self) -> Dict[str, Any]:
        """Get engine statistics."""
        return {
            "total_profiles": len(self.profiles),
            "total_quests_scored": sum(p.total_quests for p in self.profiles.values()),
        }


# Global instance
_skilldna_engine: Optional[SkillDNAEngine] = None


def get_skilldna_engine() -> SkillDNAEngine:
    """Get or create the global SkillDNA engine."""
    global _skilldna_engine
    if _skilldna_engine is None:
        _skilldna_engine = SkillDNAEngine()
    return _skilldna_engine
