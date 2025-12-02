"""
RefQuest 2.0 — Challenge Controller
PrecognitionOS Studio

Orchestrates the full challenge execution flow:
1. Start Challenge -> 2. Capture Evidence -> 3. Process TwinFlow ->
4. Verify Steps -> 5. Score Results -> 6. Update SkillDNA -> 7. Award Badges
"""

import uuid
import asyncio
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime
from enum import Enum

from ..quest_schema import Quest, Step
from ..quest_library import QuestLibrary, get_quest_library
from ..ingestion import (
    TwinFlowBridge, CaptureSession, CaptureState,
    EvidenceProcessor, StepVerification, VerificationStatus,
    get_twinflow_bridge, get_evidence_processor,
)
from ..scoring import (
    SkillDNAEngine, MasteryTracker, BadgeSystem,
    MasteryLevel, get_skilldna_engine, get_mastery_tracker, get_badge_system,
)


class ChallengePhase(Enum):
    """Phases of challenge execution."""
    SETUP = "setup"           # Loading quest, initializing
    BRIEFING = "briefing"     # Showing instructions
    ACTIVE = "active"         # User performing tasks
    CAPTURE = "capture"       # Capturing evidence for current step
    PROCESSING = "processing" # TwinFlow processing
    REVIEW = "review"         # Reviewing results
    COMPLETE = "complete"     # Challenge finished
    FAILED = "failed"         # Challenge failed
    CANCELLED = "cancelled"   # User cancelled


@dataclass
class StepProgress:
    """Progress on a single step."""
    step_id: str = ""
    step_name: str = ""
    order: int = 0

    # Status
    started: bool = False
    completed: bool = False
    skipped: bool = False

    # Timing
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_seconds: float = 0.0

    # Results
    verification: Optional[StepVerification] = None
    points_earned: int = 0
    points_possible: int = 0

    # Capture session
    capture_session_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "step_id": self.step_id,
            "step_name": self.step_name,
            "order": self.order,
            "started": self.started,
            "completed": self.completed,
            "skipped": self.skipped,
            "duration_seconds": self.duration_seconds,
            "points_earned": self.points_earned,
            "points_possible": self.points_possible,
            "verification": self.verification.to_dict() if self.verification else None,
        }


@dataclass
class ChallengeProgress:
    """Full challenge progress state."""
    challenge_id: str = field(default_factory=lambda: f"chal-{uuid.uuid4().hex[:12]}")
    quest_id: str = ""
    user_id: str = ""

    # Phase
    phase: ChallengePhase = ChallengePhase.SETUP
    current_step_index: int = 0

    # Timing
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    time_limit_seconds: Optional[float] = None
    elapsed_seconds: float = 0.0

    # Step progress
    step_progress: List[StepProgress] = field(default_factory=list)

    # Scores
    total_points_earned: int = 0
    total_points_possible: int = 0
    overall_score: float = 0.0

    # Results
    passed: bool = False
    skill_deltas: Dict[str, float] = field(default_factory=dict)
    badges_earned: List[str] = field(default_factory=list)

    # TwinFlow data
    twinflow_packets: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "challenge_id": self.challenge_id,
            "quest_id": self.quest_id,
            "user_id": self.user_id,
            "phase": self.phase.value,
            "current_step_index": self.current_step_index,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "elapsed_seconds": self.elapsed_seconds,
            "step_progress": [sp.to_dict() for sp in self.step_progress],
            "total_points_earned": self.total_points_earned,
            "total_points_possible": self.total_points_possible,
            "overall_score": self.overall_score,
            "passed": self.passed,
            "skill_deltas": self.skill_deltas,
            "badges_earned": self.badges_earned,
        }


class ChallengeController:
    """
    Controls the full challenge execution flow.

    Integrates:
    - Quest Library for quest definitions
    - TwinFlow Bridge for evidence capture
    - Evidence Processor for verification
    - SkillDNA Engine for scoring
    - Badge System for achievements
    """

    def __init__(self):
        # Components
        self.library: QuestLibrary = get_quest_library()
        self.twinflow: TwinFlowBridge = get_twinflow_bridge()
        self.processor: EvidenceProcessor = get_evidence_processor()
        self.skilldna: SkillDNAEngine = get_skilldna_engine()
        self.mastery: MasteryTracker = get_mastery_tracker()
        self.badges: BadgeSystem = get_badge_system()

        # Active challenges
        self.challenges: Dict[str, ChallengeProgress] = {}

        # Callbacks
        self.on_phase_change: Optional[Callable] = None
        self.on_step_complete: Optional[Callable] = None
        self.on_challenge_complete: Optional[Callable] = None

    async def start_challenge(
        self,
        quest_id: str,
        user_id: str,
    ) -> ChallengeProgress:
        """
        Start a new challenge.

        Args:
            quest_id: Quest to attempt
            user_id: User attempting

        Returns:
            ChallengeProgress for tracking
        """
        # Load quest
        quest = self.library.get_quest(quest_id)
        if not quest:
            raise ValueError(f"Quest not found: {quest_id}")

        # Create progress tracker
        progress = ChallengeProgress(
            quest_id=quest_id,
            user_id=user_id,
            total_points_possible=quest.total_points,
        )

        # Initialize step progress
        for step in quest.steps:
            sp = StepProgress(
                step_id=step.step_id,
                step_name=step.name,
                order=step.order,
                points_possible=step.points,
            )
            progress.step_progress.append(sp)

        # Set time limit if applicable
        if quest.time_limit_minutes:
            progress.time_limit_seconds = quest.time_limit_minutes * 60

        # Store and transition to briefing
        self.challenges[progress.challenge_id] = progress
        await self._transition_phase(progress, ChallengePhase.BRIEFING)

        return progress

    async def begin_active_phase(
        self,
        challenge_id: str,
    ) -> ChallengeProgress:
        """
        User acknowledges briefing, begin active phase.
        """
        progress = self._get_progress(challenge_id)

        if progress.phase != ChallengePhase.BRIEFING:
            raise ValueError(f"Invalid phase transition from {progress.phase}")

        progress.started_at = datetime.now()
        await self._transition_phase(progress, ChallengePhase.ACTIVE)

        return progress

    async def start_step_capture(
        self,
        challenge_id: str,
        step_index: Optional[int] = None,
        camera_ids: Optional[List[str]] = None,
    ) -> ChallengeProgress:
        """
        Start capturing evidence for a step.

        Args:
            challenge_id: Challenge ID
            step_index: Step to capture (defaults to current)
            camera_ids: Cameras to use
        """
        progress = self._get_progress(challenge_id)
        quest = self.library.get_quest(progress.quest_id)

        if progress.phase not in [ChallengePhase.ACTIVE, ChallengePhase.CAPTURE]:
            raise ValueError(f"Cannot capture in phase {progress.phase}")

        # Get step
        idx = step_index if step_index is not None else progress.current_step_index
        if idx >= len(progress.step_progress):
            raise ValueError(f"Invalid step index: {idx}")

        step_progress = progress.step_progress[idx]
        step = quest.steps[idx]

        # Create capture session
        session = await self.twinflow.create_session(
            challenge_id=challenge_id,
            step_id=step.step_id,
            user_id=progress.user_id,
            camera_ids=camera_ids,
        )

        step_progress.capture_session_id = session.session_id
        step_progress.started = True
        step_progress.started_at = datetime.now()

        # Start capture
        await self.twinflow.start_capture(session.session_id)

        await self._transition_phase(progress, ChallengePhase.CAPTURE)

        return progress

    async def stop_step_capture(
        self,
        challenge_id: str,
    ) -> StepVerification:
        """
        Stop capturing and process evidence for current step.
        """
        progress = self._get_progress(challenge_id)
        quest = self.library.get_quest(progress.quest_id)

        if progress.phase != ChallengePhase.CAPTURE:
            raise ValueError(f"Not in capture phase: {progress.phase}")

        # Get current step
        idx = progress.current_step_index
        step_progress = progress.step_progress[idx]
        step = quest.steps[idx]

        # Stop capture
        session = await self.twinflow.stop_capture(step_progress.capture_session_id)

        # Calculate duration
        step_progress.completed_at = datetime.now()
        if step_progress.started_at:
            delta = step_progress.completed_at - step_progress.started_at
            step_progress.duration_seconds = delta.total_seconds()

        # Process evidence
        await self._transition_phase(progress, ChallengePhase.PROCESSING)

        verification = await self.processor.verify_step(
            step=step,
            twinflow_packets=session.twinflow_packets,
            detected_objects=session.detected_objects,
            detected_actions=session.detected_actions,
            duration_seconds=step_progress.duration_seconds,
        )

        # Store results
        step_progress.verification = verification
        step_progress.points_earned = verification.points_earned
        step_progress.completed = True

        # Store TwinFlow packets
        progress.twinflow_packets.extend(session.twinflow_packets)

        # Update totals
        progress.total_points_earned += step_progress.points_earned

        # Notify callback
        if self.on_step_complete:
            self.on_step_complete(challenge_id, idx, verification)

        # Return to active phase
        await self._transition_phase(progress, ChallengePhase.ACTIVE)

        return verification

    async def advance_step(
        self,
        challenge_id: str,
    ) -> ChallengeProgress:
        """
        Advance to next step.
        """
        progress = self._get_progress(challenge_id)
        quest = self.library.get_quest(progress.quest_id)

        if progress.current_step_index >= len(quest.steps) - 1:
            # Last step - complete challenge
            return await self.complete_challenge(challenge_id)

        progress.current_step_index += 1

        return progress

    async def skip_step(
        self,
        challenge_id: str,
    ) -> ChallengeProgress:
        """
        Skip current step (if allowed).
        """
        progress = self._get_progress(challenge_id)
        quest = self.library.get_quest(progress.quest_id)

        idx = progress.current_step_index
        step = quest.steps[idx]

        if step.required:
            raise ValueError(f"Step {step.name} is required and cannot be skipped")

        progress.step_progress[idx].skipped = True

        return await self.advance_step(challenge_id)

    async def complete_challenge(
        self,
        challenge_id: str,
    ) -> ChallengeProgress:
        """
        Complete the challenge and calculate final results.
        """
        progress = self._get_progress(challenge_id)
        quest = self.library.get_quest(progress.quest_id)

        progress.completed_at = datetime.now()
        if progress.started_at:
            delta = progress.completed_at - progress.started_at
            progress.elapsed_seconds = delta.total_seconds()

        # Calculate overall score
        if progress.total_points_possible > 0:
            progress.overall_score = (
                progress.total_points_earned / progress.total_points_possible
            ) * 100

        # Check if passed
        progress.passed = progress.overall_score >= quest.passing_score

        # Update SkillDNA
        await self._update_skill_profiles(progress, quest)

        # Award badges
        await self._check_and_award_badges(progress)

        # Transition to complete
        await self._transition_phase(progress, ChallengePhase.COMPLETE)

        # Notify callback
        if self.on_challenge_complete:
            self.on_challenge_complete(challenge_id, progress)

        return progress

    async def cancel_challenge(
        self,
        challenge_id: str,
    ) -> ChallengeProgress:
        """
        Cancel an active challenge.
        """
        progress = self._get_progress(challenge_id)

        # Stop any active capture
        for sp in progress.step_progress:
            if sp.capture_session_id:
                try:
                    await self.twinflow.cancel_capture(sp.capture_session_id)
                except Exception:
                    pass

        await self._transition_phase(progress, ChallengePhase.CANCELLED)

        return progress

    async def _update_skill_profiles(
        self,
        progress: ChallengeProgress,
        quest: Quest,
    ):
        """Update SkillDNA profiles from challenge results."""
        # Collect skill scores from all step verifications
        skill_scores: Dict[str, List[float]] = {}

        for sp in progress.step_progress:
            if sp.verification:
                for skill, score in sp.verification.skill_scores.items():
                    if skill not in skill_scores:
                        skill_scores[skill] = []
                    skill_scores[skill].append(score)

        # Update mastery tracker
        for skill, scores in skill_scores.items():
            avg_score = sum(scores) / len(scores) * 100
            self.mastery.record_attempt(
                skill_id=skill,
                score=avg_score,
                quest_id=progress.quest_id,
                difficulty=quest.difficulty,
            )

        # Calculate deltas
        for skill in skill_scores:
            mastery = self.mastery.get_skill_mastery(skill)
            if mastery:
                progress.skill_deltas[skill] = mastery.mastery_score

        # Update SkillDNA engine
        twinflow_report = {
            "overall_score": progress.overall_score,
            "mastery_progress": {
                skill: sum(scores) / len(scores)
                for skill, scores in skill_scores.items()
            },
        }

        await self.skilldna.update_from_twinflow(
            user_id=progress.user_id,
            twinflow_report=twinflow_report,
            quest_skills=list(skill_scores.keys()),
        )

    async def _check_and_award_badges(
        self,
        progress: ChallengeProgress,
    ):
        """Check and award any earned badges."""
        # Get user skill masteries
        user_skills = {
            s.skill_id: s
            for s in self.mastery.get_user_skills()
        }

        # Count user's completed quests (simplified)
        quest_count = sum(
            1 for p in self.challenges.values()
            if p.user_id == progress.user_id and p.phase == ChallengePhase.COMPLETE
        )

        # Get streak info
        max_streak = max(
            (s.best_streak for s in user_skills.values()),
            default=0
        )
        current_streak = max(
            (s.current_streak for s in user_skills.values()),
            default=0
        )

        # Check badges
        new_badges = self.badges.check_and_award_badges(
            user_id=progress.user_id,
            skill_masteries=user_skills,
            quest_completions=quest_count,
            current_streak=current_streak,
            best_streak=max_streak,
            quest_score=progress.overall_score,
        )

        progress.badges_earned = [b.badge_id for b in new_badges]

    async def _transition_phase(
        self,
        progress: ChallengeProgress,
        new_phase: ChallengePhase,
    ):
        """Transition to a new phase."""
        old_phase = progress.phase
        progress.phase = new_phase

        if self.on_phase_change:
            self.on_phase_change(progress.challenge_id, old_phase, new_phase)

    def _get_progress(self, challenge_id: str) -> ChallengeProgress:
        """Get progress or raise error."""
        progress = self.challenges.get(challenge_id)
        if not progress:
            raise ValueError(f"Challenge not found: {challenge_id}")
        return progress

    def get_challenge(self, challenge_id: str) -> Optional[ChallengeProgress]:
        """Get challenge progress."""
        return self.challenges.get(challenge_id)

    def get_user_challenges(
        self,
        user_id: str,
        include_completed: bool = True,
    ) -> List[ChallengeProgress]:
        """Get all challenges for a user."""
        challenges = [
            p for p in self.challenges.values()
            if p.user_id == user_id
        ]

        if not include_completed:
            challenges = [
                c for c in challenges
                if c.phase not in [ChallengePhase.COMPLETE, ChallengePhase.CANCELLED, ChallengePhase.FAILED]
            ]

        return sorted(challenges, key=lambda c: c.started_at or datetime.min, reverse=True)

    def get_stats(self) -> Dict[str, Any]:
        """Get controller statistics."""
        completed = sum(
            1 for c in self.challenges.values()
            if c.phase == ChallengePhase.COMPLETE
        )
        passed = sum(
            1 for c in self.challenges.values()
            if c.phase == ChallengePhase.COMPLETE and c.passed
        )

        return {
            "total_challenges": len(self.challenges),
            "completed": completed,
            "passed": passed,
            "pass_rate": passed / completed if completed > 0 else 0.0,
            "by_phase": {
                phase.value: sum(
                    1 for c in self.challenges.values()
                    if c.phase == phase
                )
                for phase in ChallengePhase
            },
        }


# Global controller instance
_challenge_controller: Optional[ChallengeController] = None


def get_challenge_controller() -> ChallengeController:
    """Get or create the global challenge controller."""
    global _challenge_controller
    if _challenge_controller is None:
        _challenge_controller = ChallengeController()
    return _challenge_controller
