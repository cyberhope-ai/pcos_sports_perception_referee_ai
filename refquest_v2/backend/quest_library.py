"""
RefQuest 2.0 — Quest Library
PrecognitionOS Studio

Manages collections of quests with load/save, search, and filtering.
Integrates with QSurface for semantic indexing.
"""

import json
import uuid
from pathlib import Path
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime

from .quest_schema import (
    Quest,
    Step,
    QuestCategory,
    QuestSchema,
    QuestValidator,
    EvidenceRequirement,
    EvidenceType,
    VerificationMethod,
    SkillTarget,
)


@dataclass
class QuestSearchResult:
    """Search result with relevance scoring."""
    quest: Quest
    relevance_score: float = 0.0
    matched_fields: List[str] = field(default_factory=list)


class QuestLibrary:
    """
    Quest library manager.

    Handles quest storage, retrieval, and search.
    Supports JSON file persistence.
    """

    def __init__(self, storage_path: Optional[Path] = None):
        self.quests: Dict[str, Quest] = {}
        self.storage_path = storage_path or Path("quests")
        self.schema = QuestSchema()
        self.validator = QuestValidator()

    def add_quest(self, quest: Quest) -> str:
        """Add a quest to the library."""
        if not quest.quest_id:
            quest.quest_id = f"quest-{uuid.uuid4().hex[:12]}"

        # Validate before adding
        validation = self.validator.validate(quest)
        if not validation["valid"]:
            raise ValueError(f"Invalid quest: {validation['errors']}")

        self.quests[quest.quest_id] = quest
        return quest.quest_id

    def get_quest(self, quest_id: str) -> Optional[Quest]:
        """Get a quest by ID."""
        return self.quests.get(quest_id)

    def remove_quest(self, quest_id: str) -> bool:
        """Remove a quest from the library."""
        if quest_id in self.quests:
            del self.quests[quest_id]
            return True
        return False

    def list_quests(
        self,
        category: Optional[QuestCategory] = None,
        difficulty: Optional[str] = None,
        skill_tags: Optional[List[str]] = None,
        limit: int = 100,
    ) -> List[Quest]:
        """List quests with optional filtering."""
        results = []

        for quest in self.quests.values():
            # Category filter
            if category and quest.category != category:
                continue

            # Difficulty filter
            if difficulty and quest.difficulty != difficulty:
                continue

            # Skill tags filter
            if skill_tags:
                quest_skills = quest.get_all_skill_tags()
                if not any(tag in quest_skills for tag in skill_tags):
                    continue

            results.append(quest)

            if len(results) >= limit:
                break

        return results

    def search_quests(
        self,
        query: str,
        category: Optional[QuestCategory] = None,
        limit: int = 20,
    ) -> List[QuestSearchResult]:
        """Search quests by text query."""
        results = []
        query_lower = query.lower()

        for quest in self.quests.values():
            # Category filter
            if category and quest.category != category:
                continue

            score = 0.0
            matched = []

            # Title match (highest weight)
            if query_lower in quest.title.lower():
                score += 3.0
                matched.append("title")

            # Name match
            if query_lower in quest.name.lower():
                score += 2.5
                matched.append("name")

            # Description match
            if query_lower in quest.description.lower():
                score += 1.5
                matched.append("description")

            # Skill tag match
            for skill in quest.get_all_skill_tags():
                if query_lower in skill.lower():
                    score += 1.0
                    matched.append(f"skill:{skill}")

            # Step name match
            for step in quest.steps:
                if query_lower in step.name.lower():
                    score += 0.5
                    matched.append(f"step:{step.name}")

            if score > 0:
                results.append(QuestSearchResult(
                    quest=quest,
                    relevance_score=score,
                    matched_fields=matched,
                ))

        # Sort by relevance
        results.sort(key=lambda r: r.relevance_score, reverse=True)
        return results[:limit]

    def get_by_skill(self, skill_tag: str) -> List[Quest]:
        """Get all quests that evaluate a specific skill."""
        return [
            quest for quest in self.quests.values()
            if skill_tag in quest.get_all_skill_tags()
        ]

    def get_prerequisites_for(self, quest_id: str) -> List[Quest]:
        """Get prerequisite quests for a given quest."""
        quest = self.get_quest(quest_id)
        if not quest:
            return []

        return [
            self.get_quest(req_id)
            for req_id in quest.required_quests
            if self.get_quest(req_id)
        ]

    def get_quest_chain(self, quest_id: str) -> List[Quest]:
        """Get the full prerequisite chain for a quest."""
        visited = set()
        chain = []

        def collect_prereqs(qid: str):
            if qid in visited:
                return
            visited.add(qid)

            quest = self.get_quest(qid)
            if not quest:
                return

            for prereq_id in quest.required_quests:
                collect_prereqs(prereq_id)

            chain.append(quest)

        collect_prereqs(quest_id)
        return chain

    def save_to_json(self, filepath: Optional[Path] = None) -> Path:
        """Save library to JSON file."""
        path = filepath or self.storage_path / "quest_library.json"
        path.parent.mkdir(parents=True, exist_ok=True)

        data = {
            "version": "2.0",
            "exported_at": datetime.now().isoformat(),
            "quest_count": len(self.quests),
            "quests": [quest.to_dict() for quest in self.quests.values()],
        }

        with open(path, "w") as f:
            json.dump(data, f, indent=2)

        return path

    def load_from_json(self, filepath: Path) -> int:
        """Load quests from JSON file. Returns count of loaded quests."""
        with open(filepath) as f:
            data = json.load(f)

        loaded = 0
        for quest_data in data.get("quests", []):
            try:
                quest = self.schema.from_dict(quest_data)
                self.quests[quest.quest_id] = quest
                loaded += 1
            except Exception as e:
                print(f"Failed to load quest: {e}")

        return loaded

    def export_quest(self, quest_id: str, filepath: Path) -> bool:
        """Export a single quest to JSON."""
        quest = self.get_quest(quest_id)
        if not quest:
            return False

        filepath.parent.mkdir(parents=True, exist_ok=True)
        with open(filepath, "w") as f:
            json.dump(quest.to_dict(), f, indent=2)

        return True

    def import_quest(self, filepath: Path) -> Optional[str]:
        """Import a quest from JSON. Returns quest ID if successful."""
        with open(filepath) as f:
            data = json.load(f)

        quest = self.schema.from_dict(data)
        return self.add_quest(quest)

    def get_stats(self) -> Dict[str, Any]:
        """Get library statistics."""
        category_counts = {}
        difficulty_counts = {}
        all_skills = set()
        total_steps = 0

        for quest in self.quests.values():
            # Category
            cat = quest.category.value
            category_counts[cat] = category_counts.get(cat, 0) + 1

            # Difficulty
            diff = quest.difficulty
            difficulty_counts[diff] = difficulty_counts.get(diff, 0) + 1

            # Skills
            all_skills.update(quest.get_all_skill_tags())

            # Steps
            total_steps += len(quest.steps)

        return {
            "total_quests": len(self.quests),
            "total_steps": total_steps,
            "unique_skills": len(all_skills),
            "by_category": category_counts,
            "by_difficulty": difficulty_counts,
            "skill_list": sorted(all_skills),
        }


# Global library instance
_quest_library: Optional[QuestLibrary] = None


def get_quest_library() -> QuestLibrary:
    """Get or create the global quest library."""
    global _quest_library
    if _quest_library is None:
        _quest_library = QuestLibrary()
    return _quest_library
