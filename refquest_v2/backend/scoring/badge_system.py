"""
RefQuest 2.0 — Badge System
PrecognitionOS Studio

Achievement and badge tracking for skill verification.
Implements badge definitions, criteria, and awarding logic.
"""

import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime
from enum import Enum

from .mastery_tracker import MasteryLevel, SkillMastery


class BadgeRarity(Enum):
    """Badge rarity tiers."""
    COMMON = "common"
    UNCOMMON = "uncommon"
    RARE = "rare"
    EPIC = "epic"
    LEGENDARY = "legendary"


class BadgeCategory(Enum):
    """Badge categories."""
    SKILL = "skill"           # Skill mastery badges
    QUEST = "quest"           # Quest completion badges
    STREAK = "streak"         # Consistency badges
    ACHIEVEMENT = "achievement"  # Special achievements
    MILESTONE = "milestone"   # Progress milestones


@dataclass
class BadgeDefinition:
    """Definition of a badge that can be earned."""
    badge_id: str = ""
    name: str = ""
    description: str = ""
    icon: str = ""

    category: BadgeCategory = BadgeCategory.ACHIEVEMENT
    rarity: BadgeRarity = BadgeRarity.COMMON

    # Requirements
    required_skill: Optional[str] = None
    required_level: Optional[MasteryLevel] = None
    required_quests: List[str] = field(default_factory=list)
    required_streak: int = 0
    required_attempts: int = 0

    # Points
    xp_reward: int = 100

    def to_dict(self) -> Dict[str, Any]:
        return {
            "badge_id": self.badge_id,
            "name": self.name,
            "description": self.description,
            "icon": self.icon,
            "category": self.category.value,
            "rarity": self.rarity.value,
            "xp_reward": self.xp_reward,
        }


@dataclass
class EarnedBadge:
    """A badge earned by a user."""
    badge_id: str = ""
    user_id: str = ""
    earned_at: datetime = field(default_factory=datetime.now)
    quest_id: Optional[str] = None
    skill_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "badge_id": self.badge_id,
            "user_id": self.user_id,
            "earned_at": self.earned_at.isoformat(),
            "quest_id": self.quest_id,
            "skill_id": self.skill_id,
        }


class BadgeSystem:
    """
    Manages badge definitions and awarding.

    Handles:
    - Badge definitions and criteria
    - Checking eligibility
    - Awarding badges
    - User badge collections
    """

    def __init__(self):
        self.definitions: Dict[str, BadgeDefinition] = {}
        self.user_badges: Dict[str, List[EarnedBadge]] = {}

        # Load default badges
        self._load_default_badges()

        # Custom criteria functions
        self.custom_criteria: Dict[str, Callable] = {}

    def _load_default_badges(self):
        """Load default badge definitions."""
        # Skill mastery badges
        for level in MasteryLevel:
            badge = BadgeDefinition(
                badge_id=f"skill_{level.value}",
                name=f"{level.value.title()} Level",
                description=f"Reach {level.value} mastery in any skill",
                category=BadgeCategory.SKILL,
                rarity=self._level_to_rarity(level),
                required_level=level,
                xp_reward=self._level_to_xp(level),
            )
            self.definitions[badge.badge_id] = badge

        # Quest completion badges
        quest_milestones = [
            (1, "First Steps", "Complete your first quest", BadgeRarity.COMMON, 50),
            (5, "Getting Started", "Complete 5 quests", BadgeRarity.COMMON, 100),
            (10, "Dedicated", "Complete 10 quests", BadgeRarity.UNCOMMON, 200),
            (25, "Committed", "Complete 25 quests", BadgeRarity.RARE, 500),
            (50, "Veteran", "Complete 50 quests", BadgeRarity.EPIC, 1000),
            (100, "Master Questor", "Complete 100 quests", BadgeRarity.LEGENDARY, 2500),
        ]
        for count, name, desc, rarity, xp in quest_milestones:
            badge = BadgeDefinition(
                badge_id=f"quest_complete_{count}",
                name=name,
                description=desc,
                category=BadgeCategory.QUEST,
                rarity=rarity,
                required_attempts=count,
                xp_reward=xp,
            )
            self.definitions[badge.badge_id] = badge

        # Streak badges
        streak_milestones = [
            (3, "On Fire", "3 successful attempts in a row", BadgeRarity.COMMON, 75),
            (7, "Weekly Warrior", "7 day streak", BadgeRarity.UNCOMMON, 150),
            (14, "Dedicated", "14 day streak", BadgeRarity.RARE, 300),
            (30, "Monthly Master", "30 day streak", BadgeRarity.EPIC, 750),
        ]
        for count, name, desc, rarity, xp in streak_milestones:
            badge = BadgeDefinition(
                badge_id=f"streak_{count}",
                name=name,
                description=desc,
                category=BadgeCategory.STREAK,
                rarity=rarity,
                required_streak=count,
                xp_reward=xp,
            )
            self.definitions[badge.badge_id] = badge

        # Special achievement badges
        special_badges = [
            ("perfect_score", "Perfectionist", "Achieve 100% on a quest", BadgeRarity.RARE, 250),
            ("speed_demon", "Speed Demon", "Complete a quest under time limit", BadgeRarity.UNCOMMON, 150),
            ("safety_first", "Safety First", "Complete a safety quest with no violations", BadgeRarity.RARE, 200),
            ("multi_skill", "Renaissance", "Demonstrate 5 different skills", BadgeRarity.UNCOMMON, 175),
        ]
        for bid, name, desc, rarity, xp in special_badges:
            badge = BadgeDefinition(
                badge_id=bid,
                name=name,
                description=desc,
                category=BadgeCategory.ACHIEVEMENT,
                rarity=rarity,
                xp_reward=xp,
            )
            self.definitions[badge.badge_id] = badge

    def _level_to_rarity(self, level: MasteryLevel) -> BadgeRarity:
        """Map mastery level to badge rarity."""
        mapping = {
            MasteryLevel.NOVICE: BadgeRarity.COMMON,
            MasteryLevel.APPRENTICE: BadgeRarity.COMMON,
            MasteryLevel.JOURNEYMAN: BadgeRarity.UNCOMMON,
            MasteryLevel.EXPERT: BadgeRarity.RARE,
            MasteryLevel.MASTER: BadgeRarity.EPIC,
            MasteryLevel.GRANDMASTER: BadgeRarity.LEGENDARY,
        }
        return mapping.get(level, BadgeRarity.COMMON)

    def _level_to_xp(self, level: MasteryLevel) -> int:
        """Map mastery level to XP reward."""
        mapping = {
            MasteryLevel.NOVICE: 50,
            MasteryLevel.APPRENTICE: 100,
            MasteryLevel.JOURNEYMAN: 200,
            MasteryLevel.EXPERT: 400,
            MasteryLevel.MASTER: 800,
            MasteryLevel.GRANDMASTER: 2000,
        }
        return mapping.get(level, 50)

    def add_badge_definition(self, badge: BadgeDefinition):
        """Add a custom badge definition."""
        self.definitions[badge.badge_id] = badge

    def check_and_award_badges(
        self,
        user_id: str,
        skill_masteries: Dict[str, SkillMastery],
        quest_completions: int = 0,
        current_streak: int = 0,
        best_streak: int = 0,
        quest_score: float = 0.0,
    ) -> List[EarnedBadge]:
        """
        Check all badge criteria and award new badges.

        Returns list of newly awarded badges.
        """
        awarded = []
        user_existing = set(b.badge_id for b in self.user_badges.get(user_id, []))

        for badge_id, badge in self.definitions.items():
            if badge_id in user_existing:
                continue

            if self._check_criteria(
                badge, skill_masteries, quest_completions,
                current_streak, best_streak, quest_score
            ):
                earned = self._award_badge(user_id, badge_id)
                awarded.append(earned)

        return awarded

    def _check_criteria(
        self,
        badge: BadgeDefinition,
        skill_masteries: Dict[str, SkillMastery],
        quest_completions: int,
        current_streak: int,
        best_streak: int,
        quest_score: float,
    ) -> bool:
        """Check if badge criteria are met."""
        # Skill level requirement
        if badge.required_level and badge.required_skill:
            mastery = skill_masteries.get(badge.required_skill)
            if not mastery or mastery.level.value < badge.required_level.value:
                return False

        # Any skill at level requirement
        if badge.required_level and not badge.required_skill:
            has_level = any(
                m.level.value >= badge.required_level.value
                for m in skill_masteries.values()
            )
            if not has_level:
                return False

        # Quest completion count
        if badge.required_attempts > 0:
            if quest_completions < badge.required_attempts:
                return False

        # Streak requirement
        if badge.required_streak > 0:
            if max(current_streak, best_streak) < badge.required_streak:
                return False

        # Perfect score
        if badge.badge_id == "perfect_score":
            if quest_score < 100.0:
                return False

        # Multi-skill
        if badge.badge_id == "multi_skill":
            if len(skill_masteries) < 5:
                return False

        # Custom criteria
        if badge.badge_id in self.custom_criteria:
            if not self.custom_criteria[badge.badge_id](
                skill_masteries, quest_completions, current_streak
            ):
                return False

        return True

    def _award_badge(
        self,
        user_id: str,
        badge_id: str,
        quest_id: Optional[str] = None,
        skill_id: Optional[str] = None,
    ) -> EarnedBadge:
        """Award a badge to a user."""
        earned = EarnedBadge(
            badge_id=badge_id,
            user_id=user_id,
            quest_id=quest_id,
            skill_id=skill_id,
        )

        if user_id not in self.user_badges:
            self.user_badges[user_id] = []
        self.user_badges[user_id].append(earned)

        return earned

    def get_user_badges(self, user_id: str) -> List[EarnedBadge]:
        """Get all badges earned by a user."""
        return self.user_badges.get(user_id, [])

    def get_user_badge_details(self, user_id: str) -> List[Dict[str, Any]]:
        """Get badge details for a user."""
        earned = self.get_user_badges(user_id)
        details = []

        for badge in earned:
            definition = self.definitions.get(badge.badge_id)
            if definition:
                detail = definition.to_dict()
                detail.update(badge.to_dict())
                details.append(detail)

        return details

    def get_available_badges(self, user_id: str) -> List[BadgeDefinition]:
        """Get badges not yet earned by user."""
        earned_ids = set(b.badge_id for b in self.get_user_badges(user_id))
        return [
            badge for badge_id, badge in self.definitions.items()
            if badge_id not in earned_ids
        ]

    def get_total_xp(self, user_id: str) -> int:
        """Get total XP from badges for a user."""
        total = 0
        for badge in self.get_user_badges(user_id):
            definition = self.definitions.get(badge.badge_id)
            if definition:
                total += definition.xp_reward
        return total

    def get_stats(self) -> Dict[str, Any]:
        """Get badge system statistics."""
        return {
            "total_definitions": len(self.definitions),
            "total_users": len(self.user_badges),
            "total_awarded": sum(len(badges) for badges in self.user_badges.values()),
            "by_category": {
                cat.value: sum(
                    1 for b in self.definitions.values()
                    if b.category == cat
                )
                for cat in BadgeCategory
            },
            "by_rarity": {
                rarity.value: sum(
                    1 for b in self.definitions.values()
                    if b.rarity == rarity
                )
                for rarity in BadgeRarity
            },
        }


# Global badge system instance
_badge_system: Optional[BadgeSystem] = None


def get_badge_system() -> BadgeSystem:
    """Get or create the global badge system."""
    global _badge_system
    if _badge_system is None:
        _badge_system = BadgeSystem()
    return _badge_system
