"""
RefQuest 2.0 — Evidence Processor
PrecognitionOS Studio

Processes captured evidence against quest step requirements.
Uses TwinFlow packets for verification.
"""

import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum

from ..quest_schema import (
    Quest,
    Step,
    EvidenceRequirement,
    EvidenceType,
    VerificationMethod,
)


class VerificationStatus(Enum):
    """Status of evidence verification."""
    PENDING = "pending"
    VERIFYING = "verifying"
    VERIFIED = "verified"
    FAILED = "failed"
    PARTIAL = "partial"


@dataclass
class ObjectDetection:
    """Detected object from TwinFlow."""
    object_id: str = ""
    label: str = ""
    confidence: float = 0.0
    bbox: tuple = (0, 0, 0, 0)  # x, y, w, h
    timestamp: float = 0.0
    frame_index: int = 0


@dataclass
class ActionDetection:
    """Detected action from TwinFlow."""
    action_id: str = ""
    label: str = ""
    confidence: float = 0.0
    start_time: float = 0.0
    end_time: float = 0.0
    participants: List[str] = field(default_factory=list)


@dataclass
class EvidenceVerification:
    """Result of verifying evidence against a requirement."""
    requirement_id: str = ""
    status: VerificationStatus = VerificationStatus.PENDING
    confidence: float = 0.0

    # What was detected
    detected_objects: List[ObjectDetection] = field(default_factory=list)
    detected_actions: List[ActionDetection] = field(default_factory=list)

    # Match details
    required_objects_found: Dict[str, bool] = field(default_factory=dict)
    required_actions_found: Dict[str, bool] = field(default_factory=dict)

    # Timing
    duration_seconds: float = 0.0
    meets_duration_requirement: bool = True

    # Notes
    notes: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "requirement_id": self.requirement_id,
            "status": self.status.value,
            "confidence": self.confidence,
            "detected_objects": [
                {"label": o.label, "confidence": o.confidence}
                for o in self.detected_objects
            ],
            "detected_actions": [
                {"label": a.label, "confidence": a.confidence}
                for a in self.detected_actions
            ],
            "required_objects_found": self.required_objects_found,
            "required_actions_found": self.required_actions_found,
            "duration_seconds": self.duration_seconds,
            "meets_duration_requirement": self.meets_duration_requirement,
            "notes": self.notes,
        }


@dataclass
class StepVerification:
    """Result of verifying all evidence for a step."""
    step_id: str = ""
    step_name: str = ""
    status: VerificationStatus = VerificationStatus.PENDING

    # Evidence verifications
    evidence_verifications: List[EvidenceVerification] = field(default_factory=list)

    # Overall scores
    overall_confidence: float = 0.0
    points_earned: int = 0
    points_possible: int = 0

    # Timing
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_seconds: float = 0.0

    # Skill assessments
    skill_scores: Dict[str, float] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "step_id": self.step_id,
            "step_name": self.step_name,
            "status": self.status.value,
            "evidence_verifications": [v.to_dict() for v in self.evidence_verifications],
            "overall_confidence": self.overall_confidence,
            "points_earned": self.points_earned,
            "points_possible": self.points_possible,
            "duration_seconds": self.duration_seconds,
            "skill_scores": self.skill_scores,
        }


class EvidenceProcessor:
    """
    Processes captured evidence and verifies against requirements.

    Uses TwinFlow detection results to validate quest completion.
    """

    def __init__(self):
        self.verifications: Dict[str, StepVerification] = {}

        # Confidence thresholds
        self.object_confidence_threshold = 0.7
        self.action_confidence_threshold = 0.65
        self.overall_pass_threshold = 0.6

    async def verify_step(
        self,
        step: Step,
        twinflow_packets: List[Dict[str, Any]],
        detected_objects: List[Dict[str, Any]],
        detected_actions: List[Dict[str, Any]],
        duration_seconds: float,
    ) -> StepVerification:
        """
        Verify evidence for a step against its requirements.

        Args:
            step: The quest step to verify
            twinflow_packets: TwinFlow packets from capture
            detected_objects: Objects detected by TwinFlow
            detected_actions: Actions detected by TwinFlow
            duration_seconds: Duration of evidence capture

        Returns:
            StepVerification with results
        """
        verification = StepVerification(
            step_id=step.step_id,
            step_name=step.name,
            points_possible=step.points,
            duration_seconds=duration_seconds,
        )
        verification.status = VerificationStatus.VERIFYING

        # Convert raw detections to structured objects
        objects = self._parse_objects(detected_objects)
        actions = self._parse_actions(detected_actions)

        # Verify each evidence requirement
        for requirement in step.evidence_requirements:
            ev_verification = await self._verify_requirement(
                requirement, objects, actions, duration_seconds
            )
            verification.evidence_verifications.append(ev_verification)

        # Also check expected objects/actions from step definition
        step_check = await self._verify_step_expectations(
            step, objects, actions
        )
        verification.evidence_verifications.append(step_check)

        # Calculate overall results
        self._calculate_step_results(verification, step)

        # Calculate skill scores
        verification.skill_scores = self._calculate_skill_scores(
            step, verification
        )

        self.verifications[step.step_id] = verification
        return verification

    async def _verify_requirement(
        self,
        requirement: EvidenceRequirement,
        objects: List[ObjectDetection],
        actions: List[ActionDetection],
        duration: float,
    ) -> EvidenceVerification:
        """Verify a single evidence requirement."""
        verification = EvidenceVerification(
            requirement_id=requirement.requirement_id,
            duration_seconds=duration,
        )
        verification.status = VerificationStatus.VERIFYING

        # Check required objects
        for req_obj in requirement.required_objects:
            found = self._find_object(req_obj, objects, requirement.minimum_confidence)
            verification.required_objects_found[req_obj] = found is not None
            if found:
                verification.detected_objects.append(found)

        # Check required actions
        for req_action in requirement.required_actions:
            found = self._find_action(req_action, actions, requirement.minimum_confidence)
            verification.required_actions_found[req_action] = found is not None
            if found:
                verification.detected_actions.append(found)

        # Check duration requirements
        if requirement.minimum_duration_seconds > 0:
            verification.meets_duration_requirement = (
                duration >= requirement.minimum_duration_seconds
            )
        if requirement.maximum_duration_seconds > 0:
            verification.meets_duration_requirement = (
                verification.meets_duration_requirement and
                duration <= requirement.maximum_duration_seconds
            )

        # Calculate confidence
        verification.confidence = self._calculate_requirement_confidence(
            requirement, verification
        )

        # Determine status
        if verification.confidence >= requirement.minimum_confidence:
            verification.status = VerificationStatus.VERIFIED
        elif verification.confidence >= requirement.minimum_confidence * 0.7:
            verification.status = VerificationStatus.PARTIAL
        else:
            verification.status = VerificationStatus.FAILED

        return verification

    async def _verify_step_expectations(
        self,
        step: Step,
        objects: List[ObjectDetection],
        actions: List[ActionDetection],
    ) -> EvidenceVerification:
        """Verify step-level expected objects and actions."""
        verification = EvidenceVerification(
            requirement_id=f"{step.step_id}_expectations",
        )

        # Check expected objects
        for exp_obj in step.expected_objects:
            found = self._find_object(exp_obj, objects, self.object_confidence_threshold)
            verification.required_objects_found[exp_obj] = found is not None
            if found:
                verification.detected_objects.append(found)

        # Check expected actions
        for exp_action in step.expected_actions:
            found = self._find_action(exp_action, actions, self.action_confidence_threshold)
            verification.required_actions_found[exp_action] = found is not None
            if found:
                verification.detected_actions.append(found)

        # Check expected tools
        for exp_tool in step.expected_tools:
            found = self._find_object(exp_tool, objects, self.object_confidence_threshold)
            verification.required_objects_found[f"tool:{exp_tool}"] = found is not None

        # Calculate confidence
        total_expected = (
            len(step.expected_objects) +
            len(step.expected_actions) +
            len(step.expected_tools)
        )
        if total_expected > 0:
            found_count = sum(1 for v in verification.required_objects_found.values() if v)
            found_count += sum(1 for v in verification.required_actions_found.values() if v)
            verification.confidence = found_count / total_expected
        else:
            verification.confidence = 1.0  # No expectations = pass

        verification.status = (
            VerificationStatus.VERIFIED
            if verification.confidence >= self.overall_pass_threshold
            else VerificationStatus.PARTIAL
        )

        return verification

    def _parse_objects(
        self,
        raw_objects: List[Dict[str, Any]],
    ) -> List[ObjectDetection]:
        """Parse raw object detections into structured form."""
        objects = []
        for obj in raw_objects:
            detection = ObjectDetection(
                object_id=obj.get("id", str(uuid.uuid4())[:8]),
                label=obj.get("label", "unknown"),
                confidence=obj.get("confidence", 0.0),
                bbox=tuple(obj.get("bbox", [0, 0, 0, 0])),
                timestamp=obj.get("timestamp", 0.0),
                frame_index=obj.get("frame_index", 0),
            )
            objects.append(detection)
        return objects

    def _parse_actions(
        self,
        raw_actions: List[Dict[str, Any]],
    ) -> List[ActionDetection]:
        """Parse raw action detections into structured form."""
        actions = []
        for action in raw_actions:
            detection = ActionDetection(
                action_id=action.get("id", str(uuid.uuid4())[:8]),
                label=action.get("label", "unknown"),
                confidence=action.get("confidence", 0.0),
                start_time=action.get("start_time", 0.0),
                end_time=action.get("end_time", 0.0),
                participants=action.get("participants", []),
            )
            actions.append(detection)
        return actions

    def _find_object(
        self,
        label: str,
        objects: List[ObjectDetection],
        min_confidence: float,
    ) -> Optional[ObjectDetection]:
        """Find an object by label with minimum confidence."""
        label_lower = label.lower()
        best_match = None
        best_confidence = 0.0

        for obj in objects:
            # Exact match or partial match
            if (
                obj.label.lower() == label_lower or
                label_lower in obj.label.lower() or
                obj.label.lower() in label_lower
            ):
                if obj.confidence >= min_confidence and obj.confidence > best_confidence:
                    best_match = obj
                    best_confidence = obj.confidence

        return best_match

    def _find_action(
        self,
        label: str,
        actions: List[ActionDetection],
        min_confidence: float,
    ) -> Optional[ActionDetection]:
        """Find an action by label with minimum confidence."""
        label_lower = label.lower()
        best_match = None
        best_confidence = 0.0

        for action in actions:
            if (
                action.label.lower() == label_lower or
                label_lower in action.label.lower() or
                action.label.lower() in label_lower
            ):
                if action.confidence >= min_confidence and action.confidence > best_confidence:
                    best_match = action
                    best_confidence = action.confidence

        return best_match

    def _calculate_requirement_confidence(
        self,
        requirement: EvidenceRequirement,
        verification: EvidenceVerification,
    ) -> float:
        """Calculate overall confidence for a requirement verification."""
        scores = []

        # Object detection score
        if requirement.required_objects:
            obj_score = sum(
                1 for v in verification.required_objects_found.values() if v
            ) / len(requirement.required_objects)
            scores.append(obj_score)

        # Action detection score
        if requirement.required_actions:
            action_score = sum(
                1 for v in verification.required_actions_found.values() if v
            ) / len(requirement.required_actions)
            scores.append(action_score)

        # Duration score
        if requirement.minimum_duration_seconds > 0 or requirement.maximum_duration_seconds > 0:
            duration_score = 1.0 if verification.meets_duration_requirement else 0.5
            scores.append(duration_score)

        # Average detected confidences
        if verification.detected_objects:
            avg_obj_conf = sum(o.confidence for o in verification.detected_objects) / len(verification.detected_objects)
            scores.append(avg_obj_conf)

        if verification.detected_actions:
            avg_action_conf = sum(a.confidence for a in verification.detected_actions) / len(verification.detected_actions)
            scores.append(avg_action_conf)

        return sum(scores) / len(scores) if scores else 0.0

    def _calculate_step_results(
        self,
        verification: StepVerification,
        step: Step,
    ):
        """Calculate overall step verification results."""
        if not verification.evidence_verifications:
            verification.status = VerificationStatus.PENDING
            verification.overall_confidence = 0.0
            return

        # Calculate average confidence
        confidences = [ev.confidence for ev in verification.evidence_verifications]
        verification.overall_confidence = sum(confidences) / len(confidences)

        # Determine status
        verified_count = sum(
            1 for ev in verification.evidence_verifications
            if ev.status == VerificationStatus.VERIFIED
        )
        partial_count = sum(
            1 for ev in verification.evidence_verifications
            if ev.status == VerificationStatus.PARTIAL
        )
        total = len(verification.evidence_verifications)

        if verified_count == total:
            verification.status = VerificationStatus.VERIFIED
            verification.points_earned = step.points
        elif verified_count + partial_count >= total * 0.5:
            verification.status = VerificationStatus.PARTIAL
            verification.points_earned = int(step.points * verification.overall_confidence)
        else:
            verification.status = VerificationStatus.FAILED
            verification.points_earned = 0

    def _calculate_skill_scores(
        self,
        step: Step,
        verification: StepVerification,
    ) -> Dict[str, float]:
        """Calculate skill scores from step verification."""
        scores = {}

        for skill_target in step.skill_targets:
            # Base score from verification confidence
            base_score = verification.overall_confidence

            # Adjust by skill weight
            adjusted_score = base_score * skill_target.weight

            # Store score for each skill tag
            for tag in skill_target.skilldna_tags:
                if tag not in scores:
                    scores[tag] = adjusted_score
                else:
                    scores[tag] = (scores[tag] + adjusted_score) / 2

        # Also include step-level skill tags
        for tag in step.skilldna_tags:
            if tag not in scores:
                scores[tag] = verification.overall_confidence

        return scores

    def get_verification(self, step_id: str) -> Optional[StepVerification]:
        """Get verification result for a step."""
        return self.verifications.get(step_id)

    def get_all_verifications(self) -> Dict[str, StepVerification]:
        """Get all verification results."""
        return self.verifications.copy()


# Global processor instance
_evidence_processor: Optional[EvidenceProcessor] = None


def get_evidence_processor() -> EvidenceProcessor:
    """Get or create the global evidence processor."""
    global _evidence_processor
    if _evidence_processor is None:
        _evidence_processor = EvidenceProcessor()
    return _evidence_processor
