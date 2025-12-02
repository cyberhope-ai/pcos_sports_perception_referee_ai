"""
RefQuest 2.0 — Mastery Tracker
PrecognitionOS Studio

Tracks skill mastery progression and learning curves.
Implements spaced repetition and decay models.
"""

import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from enum import Enum


class MasteryLevel(Enum):
    """Mastery level tiers."""
    NOVICE = "novice"           # 0-20%
    APPRENTICE = "apprentice"   # 20-40%
    JOURNEYMAN = "journeyman"   # 40-60%
    EXPERT = "expert"           # 60-80%
    MASTER = "master"           # 80-95%
    GRANDMASTER = "grandmaster" # 95-100%

    @classmethod
    def from_score(cls, score: float) -> "MasteryLevel":
        """Get mastery level from score (0-1)."""
        if score >= 0.95:
            return cls.GRANDMASTER
        elif score >= 0.80:
            return cls.MASTER
        elif score >= 0.60:
            return cls.EXPERT
        elif score >= 0.40:
            return cls.JOURNEYMAN
        elif score >= 0.20:
            return cls.APPRENTICE
        else:
            return cls.NOVICE


@dataclass
class SkillAttempt:
    """Record of a single skill assessment attempt."""
    attempt_id: str = ""
    skill_id: str = ""
    quest_id: str = ""
    step_id: str = ""
    timestamp: datetime = field(default_factory=datetime.now)

    # Scores
    raw_score: float = 0.0          # 0-100
    weighted_score: float = 0.0     # After applying weights
    confidence: float = 0.0         # Detection confidence

    # Context
    difficulty: str = "intermediate"
    time_taken_seconds: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "attempt_id": self.attempt_id,
            "skill_id": self.skill_id,
            "quest_id": self.quest_id,
            "timestamp": self.timestamp.isoformat(),
            "raw_score": self.raw_score,
            "weighted_score": self.weighted_score,
            "difficulty": self.difficulty,
        }


@dataclass
class SkillMastery:
    """Tracks mastery of a single skill over time."""
    skill_id: str = ""
    skill_name: str = ""
    category: str = ""

    # Current mastery
    mastery_score: float = 0.0  # 0-1
    level: MasteryLevel = MasteryLevel.NOVICE

    # History
    attempts: List[SkillAttempt] = field(default_factory=list)
    total_attempts: int = 0
    successful_attempts: int = 0

    # Learning curve
    learning_rate: float = 0.1
    decay_rate: float = 0.01
    last_practiced: Optional[datetime] = None

    # Streaks
    current_streak: int = 0
    best_streak: int = 0

    # Time tracking
    total_time_seconds: float = 0.0
    average_score: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "skill_id": self.skill_id,
            "skill_name": self.skill_name,
            "category": self.category,
            "mastery_score": self.mastery_score,
            "level": self.level.value,
            "total_attempts": self.total_attempts,
            "successful_attempts": self.successful_attempts,
            "success_rate": self.successful_attempts / max(self.total_attempts, 1),
            "current_streak": self.current_streak,
            "best_streak": self.best_streak,
            "average_score": self.average_score,
            "last_practiced": self.last_practiced.isoformat() if self.last_practiced else None,
        }


class MasteryTracker:
    """
    Tracks and calculates skill mastery progression.

    Implements:
    - Weighted moving average for skill scores
    - Decay model for unpracticed skills
    - Learning curve estimation
    - Streak tracking
    """

    def __init__(self):
        self.skills: Dict[str, SkillMastery] = {}

        # Configuration
        self.success_threshold = 0.7  # Score >= 70% is successful
        self.base_learning_rate = 0.15
        self.decay_half_life_days = 30
        self.recent_weight = 0.6  # Weight for recent attempts

        # Difficulty multipliers
        self.difficulty_multipliers = {
            "beginner": 0.8,
            "intermediate": 1.0,
            "advanced": 1.2,
            "expert": 1.4,
            "master": 1.6,
        }

    def get_or_create_skill(
        self,
        skill_id: str,
        skill_name: str = "",
        category: str = "",
    ) -> SkillMastery:
        """Get or create a skill mastery record."""
        if skill_id not in self.skills:
            self.skills[skill_id] = SkillMastery(
                skill_id=skill_id,
                skill_name=skill_name or skill_id,
                category=category,
            )
        return self.skills[skill_id]

    def record_attempt(
        self,
        skill_id: str,
        score: float,
        quest_id: str = "",
        step_id: str = "",
        difficulty: str = "intermediate",
        time_taken: float = 0.0,
        confidence: float = 1.0,
    ) -> SkillMastery:
        """
        Record a skill assessment attempt.

        Args:
            skill_id: Skill identifier
            score: Raw score (0-100)
            quest_id: Quest this was from
            step_id: Step this was from
            difficulty: Quest difficulty
            time_taken: Time taken in seconds
            confidence: Detection confidence

        Returns:
            Updated SkillMastery
        """
        skill = self.get_or_create_skill(skill_id)

        # Apply decay before recording new attempt
        self._apply_decay(skill)

        # Calculate weighted score
        multiplier = self.difficulty_multipliers.get(difficulty, 1.0)
        weighted_score = score * multiplier * confidence

        # Create attempt record
        attempt = SkillAttempt(
            attempt_id=f"att-{len(skill.attempts)}",
            skill_id=skill_id,
            quest_id=quest_id,
            step_id=step_id,
            raw_score=score,
            weighted_score=weighted_score,
            confidence=confidence,
            difficulty=difficulty,
            time_taken_seconds=time_taken,
        )
        skill.attempts.append(attempt)
        skill.total_attempts += 1
        skill.total_time_seconds += time_taken
        skill.last_practiced = datetime.now()

        # Update success tracking
        is_success = score >= self.success_threshold * 100
        if is_success:
            skill.successful_attempts += 1
            skill.current_streak += 1
            skill.best_streak = max(skill.best_streak, skill.current_streak)
        else:
            skill.current_streak = 0

        # Update mastery score
        self._update_mastery(skill, weighted_score / 100)

        # Update level
        skill.level = MasteryLevel.from_score(skill.mastery_score)

        # Update average score
        skill.average_score = sum(a.raw_score for a in skill.attempts) / len(skill.attempts)

        return skill

    def _update_mastery(self, skill: SkillMastery, new_score: float):
        """Update mastery score using weighted moving average."""
        if skill.total_attempts == 1:
            skill.mastery_score = new_score
        else:
            # Weighted average with recency bias
            old_weight = 1 - self.recent_weight
            skill.mastery_score = (
                skill.mastery_score * old_weight +
                new_score * self.recent_weight
            )

        # Apply learning rate adjustment
        if new_score > skill.mastery_score:
            # Learning - faster improvement
            delta = new_score - skill.mastery_score
            skill.mastery_score += delta * skill.learning_rate
        else:
            # Slight decay for lower scores
            delta = skill.mastery_score - new_score
            skill.mastery_score -= delta * 0.1

        # Clamp to valid range
        skill.mastery_score = max(0.0, min(1.0, skill.mastery_score))

    def _apply_decay(self, skill: SkillMastery):
        """Apply decay for skills not practiced recently."""
        if not skill.last_practiced:
            return

        days_since = (datetime.now() - skill.last_practiced).days
        if days_since <= 0:
            return

        # Exponential decay
        decay_factor = math.pow(0.5, days_since / self.decay_half_life_days)
        skill.mastery_score *= decay_factor

    def get_skill_mastery(self, skill_id: str) -> Optional[SkillMastery]:
        """Get mastery for a specific skill."""
        return self.skills.get(skill_id)

    def get_user_skills(
        self,
        category: Optional[str] = None,
        min_attempts: int = 0,
    ) -> List[SkillMastery]:
        """Get all skills, optionally filtered."""
        skills = list(self.skills.values())

        if category:
            skills = [s for s in skills if s.category == category]

        if min_attempts > 0:
            skills = [s for s in skills if s.total_attempts >= min_attempts]

        return sorted(skills, key=lambda s: s.mastery_score, reverse=True)

    def get_recommended_skills(
        self,
        limit: int = 5,
    ) -> List[SkillMastery]:
        """
        Get skills recommended for practice.

        Prioritizes:
        - Skills with decay (not practiced recently)
        - Skills close to next level
        - Skills with low success rate
        """
        skills = list(self.skills.values())

        def priority_score(skill: SkillMastery) -> float:
            score = 0.0

            # Days since practice (higher = more priority)
            if skill.last_practiced:
                days = (datetime.now() - skill.last_practiced).days
                score += min(days / 7, 5)  # Cap at 5 points

            # Close to next level
            level_thresholds = [0.20, 0.40, 0.60, 0.80, 0.95]
            for threshold in level_thresholds:
                if skill.mastery_score < threshold:
                    gap = threshold - skill.mastery_score
                    if gap < 0.1:  # Within 10%
                        score += 3
                    break

            # Low success rate
            if skill.total_attempts > 3:
                success_rate = skill.successful_attempts / skill.total_attempts
                if success_rate < 0.7:
                    score += 2

            return score

        skills.sort(key=priority_score, reverse=True)
        return skills[:limit]

    def get_mastery_summary(self) -> Dict[str, Any]:
        """Get summary of all skill masteries."""
        if not self.skills:
            return {
                "total_skills": 0,
                "average_mastery": 0.0,
                "by_level": {},
                "by_category": {},
            }

        # Count by level
        by_level = {}
        for skill in self.skills.values():
            level = skill.level.value
            by_level[level] = by_level.get(level, 0) + 1

        # Count by category
        by_category = {}
        for skill in self.skills.values():
            if skill.category:
                by_category[skill.category] = by_category.get(skill.category, 0) + 1

        return {
            "total_skills": len(self.skills),
            "average_mastery": sum(s.mastery_score for s in self.skills.values()) / len(self.skills),
            "total_attempts": sum(s.total_attempts for s in self.skills.values()),
            "by_level": by_level,
            "by_category": by_category,
            "top_skills": [
                s.to_dict() for s in
                sorted(self.skills.values(), key=lambda x: x.mastery_score, reverse=True)[:5]
            ],
        }

    def get_learning_curve(
        self,
        skill_id: str,
        window_size: int = 5,
    ) -> List[Dict[str, Any]]:
        """Get learning curve data for a skill."""
        skill = self.skills.get(skill_id)
        if not skill or len(skill.attempts) < 2:
            return []

        curve = []
        for i in range(len(skill.attempts)):
            start = max(0, i - window_size + 1)
            window = skill.attempts[start:i + 1]
            avg_score = sum(a.raw_score for a in window) / len(window)

            curve.append({
                "attempt": i + 1,
                "score": skill.attempts[i].raw_score,
                "moving_average": avg_score,
                "timestamp": skill.attempts[i].timestamp.isoformat(),
            })

        return curve


# Global tracker instance
_mastery_tracker: Optional[MasteryTracker] = None


def get_mastery_tracker() -> MasteryTracker:
    """Get or create the global mastery tracker."""
    global _mastery_tracker
    if _mastery_tracker is None:
        _mastery_tracker = MasteryTracker()
    return _mastery_tracker
