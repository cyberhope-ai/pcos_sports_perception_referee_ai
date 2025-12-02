"""
RefQuest 2.0 — Quest Schema
PrecognitionOS Studio

Defines the structure of all RefQuest challenges.
Schemas are PCOS-native and integrate with TwinFlow expectations.

Quest = Task Definition + Steps + Evidence Requirements + Skill Targets
"""

import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum


class QuestCategory(Enum):
    """Categories of quests."""
    TECHNICAL = "technical"  # Hardware/software tasks
    MANUFACTURING = "manufacturing"  # Assembly/production
    SAFETY = "safety"  # Safety procedures
    MAINTENANCE = "maintenance"  # Repair/upkeep
    INSTALLATION = "installation"  # Setup/installation
    INSPECTION = "inspection"  # Quality checks
    TRAINING = "training"  # Learning exercises
    CERTIFICATION = "certification"  # Formal assessments


class EvidenceType(Enum):
    """Types of evidence that can be collected."""
    VIDEO = "video"
    AUDIO = "audio"
    SCREENSHOT = "screenshot"
    SENSOR = "sensor"
    LOG = "log"
    DOCUMENT = "document"
    PHOTO = "photo"


class VerificationMethod(Enum):
    """How evidence is verified."""
    VISUAL = "visual"  # Computer vision
    AUDIO = "audio"  # Speech/sound analysis
    TIMING = "timing"  # Duration-based
    SEQUENCE = "sequence"  # Order verification
    OBJECT = "object"  # Object detection
    ACTION = "action"  # Action recognition
    MANUAL = "manual"  # Human review


@dataclass
class EvidenceRequirement:
    """
    Specifies what evidence is needed for verification.
    """
    requirement_id: str = field(default_factory=lambda: f"evreq-{uuid.uuid4().hex[:8]}")
    evidence_type: EvidenceType = EvidenceType.VIDEO
    description: str = ""

    # What to detect
    required_objects: List[str] = field(default_factory=list)
    required_actions: List[str] = field(default_factory=list)
    required_audio: List[str] = field(default_factory=list)  # Keywords/sounds

    # Verification
    verification_method: VerificationMethod = VerificationMethod.VISUAL
    minimum_confidence: float = 0.7

    # Constraints
    minimum_duration_seconds: float = 0.0
    maximum_duration_seconds: float = 0.0
    required_angle: Optional[str] = None  # e.g., "overhead", "front"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "requirement_id": self.requirement_id,
            "evidence_type": self.evidence_type.value,
            "description": self.description,
            "required_objects": self.required_objects,
            "required_actions": self.required_actions,
            "required_audio": self.required_audio,
            "verification_method": self.verification_method.value,
            "minimum_confidence": self.minimum_confidence,
            "minimum_duration_seconds": self.minimum_duration_seconds,
            "maximum_duration_seconds": self.maximum_duration_seconds,
            "required_angle": self.required_angle,
        }


@dataclass
class SkillTarget:
    """
    Defines which skills are evaluated by a step.
    Links to SkillDNA taxonomy.
    """
    skill_id: str = ""
    skill_name: str = ""
    skill_category: str = ""

    # Scoring weights
    weight: float = 1.0
    minimum_score: float = 0.0  # Minimum to pass

    # SkillDNA tags
    skilldna_tags: List[str] = field(default_factory=list)

    # Mastery levels
    mastery_contribution: float = 0.1  # How much this contributes to mastery

    def to_dict(self) -> Dict[str, Any]:
        return {
            "skill_id": self.skill_id,
            "skill_name": self.skill_name,
            "skill_category": self.skill_category,
            "weight": self.weight,
            "minimum_score": self.minimum_score,
            "skilldna_tags": self.skilldna_tags,
            "mastery_contribution": self.mastery_contribution,
        }


@dataclass
class Step:
    """
    A single step within a quest.
    Steps are verified through TwinFlow and contribute to SkillDNA.
    """
    step_id: str = field(default_factory=lambda: f"step-{uuid.uuid4().hex[:8]}")
    order: int = 0
    name: str = ""
    description: str = ""
    instructions: str = ""

    # Requirements
    required: bool = True
    prerequisites: List[str] = field(default_factory=list)  # Step IDs

    # Evidence
    evidence_requirements: List[EvidenceRequirement] = field(default_factory=list)

    # Skills
    skill_targets: List[SkillTarget] = field(default_factory=list)

    # Scoring
    points: int = 10
    time_limit_seconds: Optional[float] = None
    penalty_per_error: int = 2

    # TwinFlow expectations (for semantic stream)
    expected_objects: List[str] = field(default_factory=list)
    expected_actions: List[str] = field(default_factory=list)
    expected_tools: List[str] = field(default_factory=list)
    expected_gestures: List[str] = field(default_factory=list)

    # Safety
    safety_critical: bool = False
    safety_notes: List[str] = field(default_factory=list)

    # PCOS intent
    pcos_intent: str = ""
    skilldna_tags: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "step_id": self.step_id,
            "order": self.order,
            "name": self.name,
            "description": self.description,
            "instructions": self.instructions,
            "required": self.required,
            "prerequisites": self.prerequisites,
            "evidence_requirements": [e.to_dict() for e in self.evidence_requirements],
            "skill_targets": [s.to_dict() for s in self.skill_targets],
            "points": self.points,
            "time_limit_seconds": self.time_limit_seconds,
            "penalty_per_error": self.penalty_per_error,
            "expected_objects": self.expected_objects,
            "expected_actions": self.expected_actions,
            "expected_tools": self.expected_tools,
            "expected_gestures": self.expected_gestures,
            "safety_critical": self.safety_critical,
            "safety_notes": self.safety_notes,
            "pcos_intent": self.pcos_intent,
            "skilldna_tags": self.skilldna_tags,
        }


@dataclass
class QuestMetadata:
    """
    Additional quest metadata.
    """
    author: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    version: str = "1.0"

    # Tagging
    tags: List[str] = field(default_factory=list)
    keywords: List[str] = field(default_factory=list)

    # Stats
    times_attempted: int = 0
    times_completed: int = 0
    average_score: float = 0.0
    average_duration_minutes: float = 0.0

    # Media
    thumbnail_url: Optional[str] = None
    tutorial_video_url: Optional[str] = None
    reference_materials: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "author": self.author,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "version": self.version,
            "tags": self.tags,
            "keywords": self.keywords,
            "times_attempted": self.times_attempted,
            "times_completed": self.times_completed,
            "average_score": self.average_score,
            "average_duration_minutes": self.average_duration_minutes,
            "thumbnail_url": self.thumbnail_url,
            "tutorial_video_url": self.tutorial_video_url,
            "reference_materials": self.reference_materials,
        }


@dataclass
class Quest:
    """
    Complete quest definition.

    A Quest represents a verifiable skill assessment task.
    It contains steps, evidence requirements, and skill targets.
    """
    quest_id: str = field(default_factory=lambda: f"quest-{uuid.uuid4().hex[:12]}")
    name: str = ""
    title: str = ""
    description: str = ""
    category: QuestCategory = QuestCategory.TECHNICAL
    difficulty: str = "intermediate"  # beginner, intermediate, advanced, expert, master

    # Steps
    steps: List[Step] = field(default_factory=list)

    # Overall requirements
    total_points: int = 100
    passing_score: float = 70.0
    time_limit_minutes: Optional[float] = None

    # Skills evaluated
    primary_skills: List[str] = field(default_factory=list)
    secondary_skills: List[str] = field(default_factory=list)

    # Prerequisites
    required_quests: List[str] = field(default_factory=list)
    required_skills: List[str] = field(default_factory=list)
    required_badges: List[str] = field(default_factory=list)

    # Equipment/tools needed
    required_equipment: List[str] = field(default_factory=list)
    required_materials: List[str] = field(default_factory=list)

    # Metadata
    metadata: QuestMetadata = field(default_factory=QuestMetadata)

    # PCOS linking
    qsurface_template_id: Optional[str] = None
    twinflow_profile_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "quest_id": self.quest_id,
            "name": self.name,
            "title": self.title,
            "description": self.description,
            "category": self.category.value,
            "difficulty": self.difficulty,
            "steps": [s.to_dict() for s in self.steps],
            "total_points": self.total_points,
            "passing_score": self.passing_score,
            "time_limit_minutes": self.time_limit_minutes,
            "primary_skills": self.primary_skills,
            "secondary_skills": self.secondary_skills,
            "required_quests": self.required_quests,
            "required_skills": self.required_skills,
            "required_badges": self.required_badges,
            "required_equipment": self.required_equipment,
            "required_materials": self.required_materials,
            "metadata": self.metadata.to_dict(),
            "qsurface_template_id": self.qsurface_template_id,
            "twinflow_profile_id": self.twinflow_profile_id,
        }

    def get_step(self, step_id: str) -> Optional[Step]:
        """Get a step by ID."""
        for step in self.steps:
            if step.step_id == step_id:
                return step
        return None

    def get_step_by_order(self, order: int) -> Optional[Step]:
        """Get a step by order index."""
        for step in self.steps:
            if step.order == order:
                return step
        return None

    def get_all_skill_tags(self) -> List[str]:
        """Get all SkillDNA tags from all steps."""
        tags = set(self.primary_skills + self.secondary_skills)
        for step in self.steps:
            tags.update(step.skilldna_tags)
            for target in step.skill_targets:
                tags.update(target.skilldna_tags)
        return list(tags)

    def get_all_required_objects(self) -> List[str]:
        """Get all required objects from all steps."""
        objects = set()
        for step in self.steps:
            objects.update(step.expected_objects)
            for req in step.evidence_requirements:
                objects.update(req.required_objects)
        return list(objects)

    def get_all_required_tools(self) -> List[str]:
        """Get all required tools from all steps."""
        tools = set(self.required_equipment)
        for step in self.steps:
            tools.update(step.expected_tools)
        return list(tools)


class QuestSchema:
    """
    Schema manager for quest validation and serialization.
    """

    @staticmethod
    def validate_quest(quest: Quest) -> List[str]:
        """
        Validate a quest definition.

        Returns list of validation errors (empty if valid).
        """
        errors = []

        if not quest.name:
            errors.append("Quest must have a name")

        if not quest.description:
            errors.append("Quest must have a description")

        if not quest.steps:
            errors.append("Quest must have at least one step")

        # Validate steps
        for i, step in enumerate(quest.steps):
            if not step.name:
                errors.append(f"Step {i} must have a name")
            if step.order != i:
                errors.append(f"Step {i} has incorrect order: {step.order}")

        # Validate prerequisites
        step_ids = {s.step_id for s in quest.steps}
        for step in quest.steps:
            for prereq in step.prerequisites:
                if prereq not in step_ids:
                    errors.append(f"Step {step.step_id} has invalid prerequisite: {prereq}")

        # Validate total points
        total = sum(s.points for s in quest.steps)
        if total != quest.total_points:
            errors.append(f"Total points mismatch: {total} != {quest.total_points}")

        return errors

    @staticmethod
    def from_dict(data: Dict[str, Any]) -> Quest:
        """Create a Quest from a dictionary."""
        quest = Quest(
            quest_id=data.get("quest_id", ""),
            name=data.get("name", ""),
            title=data.get("title", ""),
            description=data.get("description", ""),
            category=QuestCategory(data.get("category", "technical")),
            difficulty=data.get("difficulty", "intermediate"),
            total_points=data.get("total_points", 100),
            passing_score=data.get("passing_score", 70.0),
            time_limit_minutes=data.get("time_limit_minutes"),
            primary_skills=data.get("primary_skills", []),
            secondary_skills=data.get("secondary_skills", []),
            required_quests=data.get("required_quests", []),
            required_skills=data.get("required_skills", []),
            required_badges=data.get("required_badges", []),
            required_equipment=data.get("required_equipment", []),
            required_materials=data.get("required_materials", []),
        )

        # Parse steps
        for step_data in data.get("steps", []):
            step = Step(
                step_id=step_data.get("step_id", ""),
                order=step_data.get("order", 0),
                name=step_data.get("name", ""),
                description=step_data.get("description", ""),
                instructions=step_data.get("instructions", ""),
                required=step_data.get("required", True),
                prerequisites=step_data.get("prerequisites", []),
                points=step_data.get("points", 10),
                time_limit_seconds=step_data.get("time_limit_seconds"),
                expected_objects=step_data.get("expected_objects", []),
                expected_actions=step_data.get("expected_actions", []),
                expected_tools=step_data.get("expected_tools", []),
                expected_gestures=step_data.get("expected_gestures", []),
                safety_critical=step_data.get("safety_critical", False),
                safety_notes=step_data.get("safety_notes", []),
                pcos_intent=step_data.get("pcos_intent", ""),
                skilldna_tags=step_data.get("skilldna_tags", []),
            )

            # Parse evidence requirements
            for ev_data in step_data.get("evidence_requirements", []):
                ev_req = EvidenceRequirement(
                    requirement_id=ev_data.get("requirement_id", ""),
                    evidence_type=EvidenceType(ev_data.get("evidence_type", "video")),
                    description=ev_data.get("description", ""),
                    required_objects=ev_data.get("required_objects", []),
                    required_actions=ev_data.get("required_actions", []),
                    required_audio=ev_data.get("required_audio", []),
                    verification_method=VerificationMethod(
                        ev_data.get("verification_method", "visual")
                    ),
                    minimum_confidence=ev_data.get("minimum_confidence", 0.7),
                )
                step.evidence_requirements.append(ev_req)

            # Parse skill targets
            for skill_data in step_data.get("skill_targets", []):
                skill = SkillTarget(
                    skill_id=skill_data.get("skill_id", ""),
                    skill_name=skill_data.get("skill_name", ""),
                    skill_category=skill_data.get("skill_category", ""),
                    weight=skill_data.get("weight", 1.0),
                    minimum_score=skill_data.get("minimum_score", 0.0),
                    skilldna_tags=skill_data.get("skilldna_tags", []),
                    mastery_contribution=skill_data.get("mastery_contribution", 0.1),
                )
                step.skill_targets.append(skill)

            quest.steps.append(step)

        return quest


class QuestValidator:
    """
    Validates quest data for consistency and completeness.
    """

    def __init__(self):
        self.schema = QuestSchema()

    def validate(self, quest: Quest) -> Dict[str, Any]:
        """
        Validate a quest and return detailed report.
        """
        errors = self.schema.validate_quest(quest)
        warnings = self._check_warnings(quest)
        suggestions = self._get_suggestions(quest)

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "suggestions": suggestions,
            "quest_id": quest.quest_id,
            "step_count": len(quest.steps),
            "skill_count": len(quest.get_all_skill_tags()),
        }

    def _check_warnings(self, quest: Quest) -> List[str]:
        """Check for non-critical issues."""
        warnings = []

        if not quest.metadata.tutorial_video_url:
            warnings.append("Quest has no tutorial video")

        if quest.time_limit_minutes is None:
            warnings.append("Quest has no time limit")

        for step in quest.steps:
            if not step.evidence_requirements:
                warnings.append(f"Step '{step.name}' has no evidence requirements")
            if not step.skill_targets:
                warnings.append(f"Step '{step.name}' has no skill targets")

        return warnings

    def _get_suggestions(self, quest: Quest) -> List[str]:
        """Get improvement suggestions."""
        suggestions = []

        if len(quest.steps) < 3:
            suggestions.append("Consider adding more steps for granular assessment")

        if not quest.required_equipment:
            suggestions.append("Specify required equipment for better user preparation")

        if quest.passing_score < 60:
            suggestions.append("Consider raising passing score for quality assurance")

        return suggestions
