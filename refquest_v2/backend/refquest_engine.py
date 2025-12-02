"""
RefQuest 2.0 — Main Engine
PrecognitionOS Studio

The core orchestrator for skill verification challenges.
Integrates TwinFlow, SkillDNA, and QSurface for evidence-based assessment.

Architecture:
    User → Challenge → TwinFlow → SkillDNA → QSurface → Results
"""

import uuid
import asyncio
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime
from enum import Enum

# PCOS imports (will be connected in Phase 8)
try:
    from omniscient.twinflow import (
        get_twinflow_engine,
        TwinFlowEngine,
        TwinFlowMode,
        TwinFlowPacket,
        TwinFlowReport,
    )
    from omniscient.pcossurfaces.packetizer import get_packetizer
    PCOS_AVAILABLE = True
except ImportError:
    PCOS_AVAILABLE = False
    TwinFlowEngine = None
    TwinFlowPacket = None
    TwinFlowReport = None


class ChallengeState(Enum):
    """States for a challenge attempt."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    RECORDING = "recording"
    PROCESSING = "processing"
    SCORING = "scoring"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class QuestDifficulty(Enum):
    """Quest difficulty levels."""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"
    MASTER = "master"


@dataclass
class ChallengeAttempt:
    """Represents a single challenge attempt by a user."""
    attempt_id: str = field(default_factory=lambda: f"attempt-{uuid.uuid4().hex[:12]}")
    user_id: str = ""
    quest_id: str = ""
    started_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None

    # State
    state: ChallengeState = ChallengeState.PENDING
    current_step: int = 0

    # Evidence
    video_path: Optional[str] = None
    audio_path: Optional[str] = None
    screenshots: List[str] = field(default_factory=list)

    # Results (populated after scoring)
    overall_score: float = 0.0
    step_scores: List[Dict[str, Any]] = field(default_factory=list)
    skill_updates: Dict[str, float] = field(default_factory=dict)

    # PCOS linking
    twinflow_packet_id: Optional[str] = None
    qsurface_packet_id: Optional[str] = None
    skilldna_delta_id: Optional[str] = None

    # Feedback
    feedback: List[str] = field(default_factory=list)
    strengths: List[str] = field(default_factory=list)
    improvements: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "attempt_id": self.attempt_id,
            "user_id": self.user_id,
            "quest_id": self.quest_id,
            "started_at": self.started_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "state": self.state.value,
            "current_step": self.current_step,
            "video_path": self.video_path,
            "audio_path": self.audio_path,
            "screenshots": self.screenshots,
            "overall_score": self.overall_score,
            "step_scores": self.step_scores,
            "skill_updates": self.skill_updates,
            "twinflow_packet_id": self.twinflow_packet_id,
            "qsurface_packet_id": self.qsurface_packet_id,
            "skilldna_delta_id": self.skilldna_delta_id,
            "feedback": self.feedback,
            "strengths": self.strengths,
            "improvements": self.improvements,
        }


@dataclass
class ChallengeResult:
    """Final result of a completed challenge."""
    result_id: str = field(default_factory=lambda: f"result-{uuid.uuid4().hex[:12]}")
    attempt_id: str = ""
    quest_id: str = ""
    user_id: str = ""
    timestamp: datetime = field(default_factory=datetime.now)

    # Scores
    overall_score: float = 0.0
    technique_score: float = 0.0
    safety_score: float = 0.0
    efficiency_score: float = 0.0
    completeness_score: float = 0.0

    # Step breakdown
    steps_passed: int = 0
    steps_failed: int = 0
    steps_skipped: int = 0
    step_details: List[Dict[str, Any]] = field(default_factory=list)

    # SkillDNA updates
    skills_improved: List[str] = field(default_factory=list)
    mastery_deltas: Dict[str, float] = field(default_factory=dict)
    new_badges: List[str] = field(default_factory=list)

    # Evidence links
    twinflow_report: Optional[Dict[str, Any]] = None
    qsurface_packets: List[str] = field(default_factory=list)

    # Feedback
    summary: str = ""
    detailed_feedback: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)

    # Verification
    verified: bool = False
    verification_confidence: float = 0.0
    anomalies_detected: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "result_id": self.result_id,
            "attempt_id": self.attempt_id,
            "quest_id": self.quest_id,
            "user_id": self.user_id,
            "timestamp": self.timestamp.isoformat(),
            "overall_score": self.overall_score,
            "technique_score": self.technique_score,
            "safety_score": self.safety_score,
            "efficiency_score": self.efficiency_score,
            "completeness_score": self.completeness_score,
            "steps_passed": self.steps_passed,
            "steps_failed": self.steps_failed,
            "steps_skipped": self.steps_skipped,
            "step_details": self.step_details,
            "skills_improved": self.skills_improved,
            "mastery_deltas": self.mastery_deltas,
            "new_badges": self.new_badges,
            "twinflow_report": self.twinflow_report,
            "qsurface_packets": self.qsurface_packets,
            "summary": self.summary,
            "detailed_feedback": self.detailed_feedback,
            "recommendations": self.recommendations,
            "verified": self.verified,
            "verification_confidence": self.verification_confidence,
            "anomalies_detected": self.anomalies_detected,
        }


class RefQuestEngine:
    """
    Main orchestrator for RefQuest 2.0.

    Coordinates:
    - Quest management
    - Challenge execution
    - TwinFlow ingestion
    - SkillDNA scoring
    - QSurface packet generation
    """

    def __init__(self):
        # Quest registry
        self.quests: Dict[str, Any] = {}  # Will hold Quest objects
        self.active_challenges: Dict[str, ChallengeAttempt] = {}
        self.completed_results: Dict[str, ChallengeResult] = {}

        # PCOS components
        self.twinflow = get_twinflow_engine() if PCOS_AVAILABLE else None
        self.packetizer = get_packetizer() if PCOS_AVAILABLE else None

        # Callbacks
        self.on_challenge_started: Optional[Callable] = None
        self.on_step_completed: Optional[Callable] = None
        self.on_challenge_completed: Optional[Callable] = None
        self.on_score_updated: Optional[Callable] = None

        # Statistics
        self.total_challenges = 0
        self.total_completed = 0
        self.average_score = 0.0

    async def initialize(self) -> bool:
        """Initialize the RefQuest engine."""
        if self.twinflow:
            await self.twinflow.initialize()
        return True

    # =========================================================================
    # Quest Management
    # =========================================================================

    def register_quest(self, quest: Any) -> str:
        """
        Register a quest in the system.

        Args:
            quest: Quest object to register

        Returns:
            Quest ID
        """
        quest_id = quest.quest_id if hasattr(quest, 'quest_id') else str(uuid.uuid4())
        self.quests[quest_id] = quest
        return quest_id

    def get_quest(self, quest_id: str) -> Optional[Any]:
        """Get a quest by ID."""
        return self.quests.get(quest_id)

    def list_quests(
        self,
        category: Optional[str] = None,
        difficulty: Optional[QuestDifficulty] = None,
        limit: int = 50
    ) -> List[Any]:
        """
        List available quests with optional filtering.

        Args:
            category: Filter by category
            difficulty: Filter by difficulty
            limit: Maximum number to return

        Returns:
            List of Quest objects
        """
        quests = list(self.quests.values())

        if category:
            quests = [q for q in quests if getattr(q, 'category', '') == category]

        if difficulty:
            quests = [q for q in quests if getattr(q, 'difficulty', None) == difficulty]

        return quests[:limit]

    # =========================================================================
    # Challenge Execution
    # =========================================================================

    async def start_challenge(
        self,
        quest_id: str,
        user_id: str
    ) -> ChallengeAttempt:
        """
        Start a new challenge attempt.

        Args:
            quest_id: Quest to attempt
            user_id: User attempting the quest

        Returns:
            ChallengeAttempt object
        """
        quest = self.get_quest(quest_id)
        if not quest:
            raise ValueError(f"Quest not found: {quest_id}")

        # Create attempt
        attempt = ChallengeAttempt(
            user_id=user_id,
            quest_id=quest_id,
            state=ChallengeState.IN_PROGRESS,
        )

        self.active_challenges[attempt.attempt_id] = attempt
        self.total_challenges += 1

        # Start TwinFlow session if available
        if self.twinflow:
            quest_description = getattr(quest, 'description', str(quest))
            session = await self.twinflow.start_session(
                task_description=quest_description,
                mode=TwinFlowMode.REALTIME if TwinFlowMode else None,
                context={
                    "quest_id": quest_id,
                    "user_id": user_id,
                    "attempt_id": attempt.attempt_id,
                }
            )
            attempt.twinflow_packet_id = session.latest_packet_id

        # Callback
        if self.on_challenge_started:
            self.on_challenge_started(attempt)

        return attempt

    async def begin_recording(self, attempt_id: str) -> bool:
        """
        Begin recording evidence for a challenge.

        Args:
            attempt_id: Active challenge attempt

        Returns:
            True if recording started
        """
        attempt = self.active_challenges.get(attempt_id)
        if not attempt:
            return False

        attempt.state = ChallengeState.RECORDING
        return True

    async def stop_recording(self, attempt_id: str) -> bool:
        """
        Stop recording and begin processing.

        Args:
            attempt_id: Active challenge attempt

        Returns:
            True if recording stopped
        """
        attempt = self.active_challenges.get(attempt_id)
        if not attempt:
            return False

        attempt.state = ChallengeState.PROCESSING
        return True

    async def submit_evidence(
        self,
        attempt_id: str,
        video_path: Optional[str] = None,
        audio_path: Optional[str] = None,
        screenshots: Optional[List[str]] = None
    ) -> bool:
        """
        Submit evidence for a challenge attempt.

        Args:
            attempt_id: Active challenge attempt
            video_path: Path to video evidence
            audio_path: Path to audio evidence
            screenshots: List of screenshot paths

        Returns:
            True if evidence submitted
        """
        attempt = self.active_challenges.get(attempt_id)
        if not attempt:
            return False

        if video_path:
            attempt.video_path = video_path
        if audio_path:
            attempt.audio_path = audio_path
        if screenshots:
            attempt.screenshots.extend(screenshots)

        return True

    async def process_challenge(self, attempt_id: str) -> ChallengeResult:
        """
        Process a challenge through TwinFlow and scoring.

        Args:
            attempt_id: Challenge attempt to process

        Returns:
            ChallengeResult with scores and feedback
        """
        attempt = self.active_challenges.get(attempt_id)
        if not attempt:
            raise ValueError(f"Attempt not found: {attempt_id}")

        attempt.state = ChallengeState.PROCESSING

        # Get quest
        quest = self.get_quest(attempt.quest_id)

        # Process through TwinFlow
        twinflow_report = None
        if self.twinflow and attempt.video_path:
            twinflow_report = await self.twinflow.process_video_file(
                filepath=attempt.video_path,
                task_description=getattr(quest, 'description', ''),
                context={
                    "quest_id": attempt.quest_id,
                    "user_id": attempt.user_id,
                }
            )

        # Move to scoring
        attempt.state = ChallengeState.SCORING

        # Generate result (scoring will be implemented in Phase 4)
        result = ChallengeResult(
            attempt_id=attempt_id,
            quest_id=attempt.quest_id,
            user_id=attempt.user_id,
        )

        # If TwinFlow report available, extract scores
        if twinflow_report:
            result.overall_score = twinflow_report.overall_score
            result.steps_passed = twinflow_report.steps_completed
            result.steps_failed = twinflow_report.steps_total - twinflow_report.steps_completed
            result.twinflow_report = twinflow_report.to_dict()
            result.verified = True
            result.verification_confidence = 0.8  # Placeholder

        # Generate feedback
        result.summary = self._generate_summary(result)
        result.detailed_feedback = self._generate_feedback(result)
        result.recommendations = self._generate_recommendations(result)

        # Update attempt
        attempt.state = ChallengeState.COMPLETED
        attempt.completed_at = datetime.now()
        attempt.overall_score = result.overall_score

        # Store result
        self.completed_results[result.result_id] = result
        self.total_completed += 1

        # Update average
        self._update_statistics(result)

        # Remove from active
        del self.active_challenges[attempt_id]

        # Callback
        if self.on_challenge_completed:
            self.on_challenge_completed(result)

        return result

    async def cancel_challenge(self, attempt_id: str) -> bool:
        """Cancel an active challenge."""
        attempt = self.active_challenges.get(attempt_id)
        if not attempt:
            return False

        attempt.state = ChallengeState.CANCELLED

        # End TwinFlow session if active
        if self.twinflow:
            await self.twinflow.end_session()

        del self.active_challenges[attempt_id]
        return True

    # =========================================================================
    # Results & History
    # =========================================================================

    def get_result(self, result_id: str) -> Optional[ChallengeResult]:
        """Get a challenge result by ID."""
        return self.completed_results.get(result_id)

    def get_user_history(
        self,
        user_id: str,
        limit: int = 20
    ) -> List[ChallengeResult]:
        """Get challenge history for a user."""
        results = [
            r for r in self.completed_results.values()
            if r.user_id == user_id
        ]
        results.sort(key=lambda r: r.timestamp, reverse=True)
        return results[:limit]

    def get_quest_leaderboard(
        self,
        quest_id: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get top scores for a quest."""
        results = [
            r for r in self.completed_results.values()
            if r.quest_id == quest_id
        ]
        results.sort(key=lambda r: r.overall_score, reverse=True)

        return [
            {
                "rank": i + 1,
                "user_id": r.user_id,
                "score": r.overall_score,
                "timestamp": r.timestamp.isoformat(),
            }
            for i, r in enumerate(results[:limit])
        ]

    # =========================================================================
    # Feedback Generation
    # =========================================================================

    def _generate_summary(self, result: ChallengeResult) -> str:
        """Generate a summary of the challenge result."""
        if result.overall_score >= 90:
            grade = "Excellent"
        elif result.overall_score >= 75:
            grade = "Good"
        elif result.overall_score >= 60:
            grade = "Satisfactory"
        elif result.overall_score >= 40:
            grade = "Needs Improvement"
        else:
            grade = "Requires Practice"

        return (
            f"{grade} performance! "
            f"Scored {result.overall_score:.1f}% with "
            f"{result.steps_passed} steps passed and "
            f"{result.steps_failed} steps needing work."
        )

    def _generate_feedback(self, result: ChallengeResult) -> List[str]:
        """Generate detailed feedback for the result."""
        feedback = []

        if result.technique_score >= 80:
            feedback.append("Strong technique demonstrated throughout the task.")
        elif result.technique_score >= 60:
            feedback.append("Technique was adequate but could be refined.")
        else:
            feedback.append("Focus on improving technique fundamentals.")

        if result.safety_score >= 90:
            feedback.append("Excellent safety awareness maintained.")
        elif result.safety_score < 70:
            feedback.append("Review safety protocols before next attempt.")

        if result.efficiency_score >= 80:
            feedback.append("Task completed efficiently with good flow.")
        elif result.efficiency_score < 60:
            feedback.append("Practice to improve task efficiency.")

        return feedback

    def _generate_recommendations(self, result: ChallengeResult) -> List[str]:
        """Generate improvement recommendations."""
        recommendations = []

        if result.overall_score < 70:
            recommendations.append("Review the tutorial video for this quest.")

        if result.steps_failed > 0:
            recommendations.append(
                f"Practice the {result.steps_failed} failed steps individually."
            )

        if result.anomalies_detected > 0:
            recommendations.append(
                "Review the anomaly report to understand what went differently."
            )

        recommendations.append("Attempt the quest again to improve your score.")

        return recommendations

    def _update_statistics(self, result: ChallengeResult):
        """Update engine statistics with new result."""
        total = self.total_completed
        self.average_score = (
            (self.average_score * (total - 1) + result.overall_score) / total
        )

    # =========================================================================
    # Status & Statistics
    # =========================================================================

    def get_stats(self) -> Dict[str, Any]:
        """Get engine statistics."""
        return {
            "total_quests": len(self.quests),
            "total_challenges": self.total_challenges,
            "total_completed": self.total_completed,
            "active_challenges": len(self.active_challenges),
            "average_score": self.average_score,
            "pcos_available": PCOS_AVAILABLE,
            "twinflow_available": self.twinflow is not None,
        }

    def get_active_challenges(self) -> List[ChallengeAttempt]:
        """Get all active challenges."""
        return list(self.active_challenges.values())


# Global instance
_refquest_engine: Optional[RefQuestEngine] = None


def get_refquest_engine() -> RefQuestEngine:
    """Get or create the global RefQuest engine."""
    global _refquest_engine
    if _refquest_engine is None:
        _refquest_engine = RefQuestEngine()
    return _refquest_engine


async def initialize_refquest() -> bool:
    """Initialize the global RefQuest engine."""
    engine = get_refquest_engine()
    return await engine.initialize()
