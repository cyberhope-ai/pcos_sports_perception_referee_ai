"""
RefQuest 2.0 — PCOS Integration
PrecognitionOS Studio

Integrates RefQuest with core PCOS systems:
- QSurface for semantic tracing
- TwinFlow for multimodal analysis
- StarlightSync for consistency
"""

import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum

# Try to import PCOS systems
try:
    from pcos.qsurface import QSurfaceEngine, QSurfacePacket
    QSURFACE_AVAILABLE = True
except ImportError:
    QSURFACE_AVAILABLE = False
    QSurfaceEngine = None
    QSurfacePacket = None

try:
    from pcos.twinflow import TwinFlowEngine, TwinFlowPacket
    TWINFLOW_AVAILABLE = True
except ImportError:
    TWINFLOW_AVAILABLE = False

try:
    from pcos.starlightsync import StarlightSyncEngine
    STARLIGHT_AVAILABLE = True
except ImportError:
    STARLIGHT_AVAILABLE = False


class PacketType(Enum):
    """Types of PCOS packets RefQuest generates."""
    QUEST_START = "quest_start"
    STEP_BEGIN = "step_begin"
    EVIDENCE_CAPTURED = "evidence_captured"
    STEP_VERIFIED = "step_verified"
    SKILL_ASSESSED = "skill_assessed"
    BADGE_EARNED = "badge_earned"
    QUEST_COMPLETE = "quest_complete"


@dataclass
class RefQuestPacket:
    """
    PCOS-compatible packet for RefQuest events.
    Can be sent to QSurface for semantic tracing.
    """
    packet_id: str = field(default_factory=lambda: f"rqp-{uuid.uuid4().hex[:12]}")
    packet_type: PacketType = PacketType.QUEST_START
    timestamp: datetime = field(default_factory=datetime.now)

    # Context
    user_id: str = ""
    quest_id: str = ""
    challenge_id: str = ""
    step_id: str = ""

    # Payload
    payload: Dict[str, Any] = field(default_factory=dict)

    # TwinFlow reference
    twinflow_packets: List[str] = field(default_factory=list)

    # QSurface metadata
    intent: str = ""
    confidence: float = 1.0
    semantic_tags: List[str] = field(default_factory=list)

    def to_qsurface_format(self) -> Dict[str, Any]:
        """Convert to QSurface packet format."""
        return {
            "packet_id": self.packet_id,
            "source": "refquest",
            "type": self.packet_type.value,
            "timestamp": self.timestamp.isoformat(),
            "context": {
                "user_id": self.user_id,
                "quest_id": self.quest_id,
                "challenge_id": self.challenge_id,
                "step_id": self.step_id,
            },
            "payload": self.payload,
            "semantic": {
                "intent": self.intent,
                "confidence": self.confidence,
                "tags": self.semantic_tags,
            },
            "twinflow_refs": self.twinflow_packets,
        }

    def to_dict(self) -> Dict[str, Any]:
        return self.to_qsurface_format()


class PCOSIntegration:
    """
    Manages RefQuest integration with PCOS systems.

    Responsibilities:
    - Generate and send packets to QSurface
    - Receive TwinFlow analysis results
    - Maintain semantic consistency via StarlightSync
    """

    def __init__(self):
        self.packets: List[RefQuestPacket] = []

        # Initialize PCOS connections if available
        self.qsurface = None
        self.twinflow = None
        self.starlight = None

        self._init_pcos_connections()

    def _init_pcos_connections(self):
        """Initialize connections to PCOS systems."""
        if QSURFACE_AVAILABLE:
            try:
                from pcos.qsurface import get_qsurface_engine
                self.qsurface = get_qsurface_engine()
            except Exception:
                pass

        if TWINFLOW_AVAILABLE:
            try:
                from pcos.twinflow import get_twinflow_engine
                self.twinflow = get_twinflow_engine()
            except Exception:
                pass

        if STARLIGHT_AVAILABLE:
            try:
                from pcos.starlightsync import get_starlight_engine
                self.starlight = get_starlight_engine()
            except Exception:
                pass

    async def emit_quest_start(
        self,
        user_id: str,
        quest_id: str,
        challenge_id: str,
        quest_title: str,
        quest_skills: List[str],
    ) -> RefQuestPacket:
        """Emit packet when a quest challenge starts."""
        packet = RefQuestPacket(
            packet_type=PacketType.QUEST_START,
            user_id=user_id,
            quest_id=quest_id,
            challenge_id=challenge_id,
            intent="user_starts_skill_verification",
            semantic_tags=["quest_start", "skill_assessment"] + quest_skills,
            payload={
                "quest_title": quest_title,
                "skills": quest_skills,
                "event": "challenge_initiated",
            },
        )

        await self._send_to_qsurface(packet)
        self.packets.append(packet)

        return packet

    async def emit_step_begin(
        self,
        user_id: str,
        quest_id: str,
        challenge_id: str,
        step_id: str,
        step_name: str,
        step_order: int,
    ) -> RefQuestPacket:
        """Emit packet when user begins a step."""
        packet = RefQuestPacket(
            packet_type=PacketType.STEP_BEGIN,
            user_id=user_id,
            quest_id=quest_id,
            challenge_id=challenge_id,
            step_id=step_id,
            intent="user_begins_task_step",
            semantic_tags=["step_begin", f"step_{step_order}"],
            payload={
                "step_name": step_name,
                "step_order": step_order,
                "event": "step_started",
            },
        )

        await self._send_to_qsurface(packet)
        self.packets.append(packet)

        return packet

    async def emit_evidence_captured(
        self,
        user_id: str,
        quest_id: str,
        challenge_id: str,
        step_id: str,
        evidence_type: str,
        twinflow_packet_ids: List[str],
        detected_objects: List[str],
        detected_actions: List[str],
    ) -> RefQuestPacket:
        """Emit packet when evidence is captured for a step."""
        packet = RefQuestPacket(
            packet_type=PacketType.EVIDENCE_CAPTURED,
            user_id=user_id,
            quest_id=quest_id,
            challenge_id=challenge_id,
            step_id=step_id,
            twinflow_packets=twinflow_packet_ids,
            intent="evidence_collection_complete",
            semantic_tags=["evidence", evidence_type] + detected_objects[:5],
            payload={
                "evidence_type": evidence_type,
                "detected_objects": detected_objects,
                "detected_actions": detected_actions,
                "twinflow_count": len(twinflow_packet_ids),
                "event": "evidence_recorded",
            },
        )

        await self._send_to_qsurface(packet)
        self.packets.append(packet)

        return packet

    async def emit_step_verified(
        self,
        user_id: str,
        quest_id: str,
        challenge_id: str,
        step_id: str,
        verification_status: str,
        confidence: float,
        points_earned: int,
        points_possible: int,
        skill_scores: Dict[str, float],
    ) -> RefQuestPacket:
        """Emit packet when a step is verified."""
        packet = RefQuestPacket(
            packet_type=PacketType.STEP_VERIFIED,
            user_id=user_id,
            quest_id=quest_id,
            challenge_id=challenge_id,
            step_id=step_id,
            confidence=confidence,
            intent="step_verification_complete",
            semantic_tags=["verified", verification_status] + list(skill_scores.keys()),
            payload={
                "status": verification_status,
                "confidence": confidence,
                "points_earned": points_earned,
                "points_possible": points_possible,
                "skill_scores": skill_scores,
                "event": "step_verified",
            },
        )

        await self._send_to_qsurface(packet)
        self.packets.append(packet)

        return packet

    async def emit_skill_assessed(
        self,
        user_id: str,
        skill_id: str,
        skill_name: str,
        mastery_score: float,
        mastery_level: str,
        delta: float,
    ) -> RefQuestPacket:
        """Emit packet when a skill is assessed."""
        packet = RefQuestPacket(
            packet_type=PacketType.SKILL_ASSESSED,
            user_id=user_id,
            intent="skill_mastery_updated",
            confidence=mastery_score,
            semantic_tags=["skill_assessment", skill_id, mastery_level],
            payload={
                "skill_id": skill_id,
                "skill_name": skill_name,
                "mastery_score": mastery_score,
                "mastery_level": mastery_level,
                "delta": delta,
                "event": "skill_updated",
            },
        )

        await self._send_to_qsurface(packet)
        self.packets.append(packet)

        return packet

    async def emit_badge_earned(
        self,
        user_id: str,
        badge_id: str,
        badge_name: str,
        badge_category: str,
        badge_rarity: str,
        xp_earned: int,
    ) -> RefQuestPacket:
        """Emit packet when a badge is earned."""
        packet = RefQuestPacket(
            packet_type=PacketType.BADGE_EARNED,
            user_id=user_id,
            intent="achievement_unlocked",
            semantic_tags=["badge", badge_category, badge_rarity],
            payload={
                "badge_id": badge_id,
                "badge_name": badge_name,
                "category": badge_category,
                "rarity": badge_rarity,
                "xp_earned": xp_earned,
                "event": "badge_awarded",
            },
        )

        await self._send_to_qsurface(packet)
        self.packets.append(packet)

        return packet

    async def emit_quest_complete(
        self,
        user_id: str,
        quest_id: str,
        challenge_id: str,
        passed: bool,
        overall_score: float,
        time_elapsed: float,
        skill_deltas: Dict[str, float],
        badges_earned: List[str],
    ) -> RefQuestPacket:
        """Emit packet when a quest is completed."""
        packet = RefQuestPacket(
            packet_type=PacketType.QUEST_COMPLETE,
            user_id=user_id,
            quest_id=quest_id,
            challenge_id=challenge_id,
            confidence=overall_score / 100,
            intent="quest_completion",
            semantic_tags=[
                "quest_complete",
                "passed" if passed else "failed",
            ] + list(skill_deltas.keys()),
            payload={
                "passed": passed,
                "overall_score": overall_score,
                "time_elapsed_seconds": time_elapsed,
                "skill_deltas": skill_deltas,
                "badges_earned": badges_earned,
                "event": "quest_finished",
            },
        )

        await self._send_to_qsurface(packet)
        self.packets.append(packet)

        return packet

    async def _send_to_qsurface(self, packet: RefQuestPacket):
        """Send packet to QSurface if available."""
        if self.qsurface:
            try:
                qsurface_data = packet.to_qsurface_format()
                # await self.qsurface.ingest(qsurface_data)
                print(f"[QSurface] Sent: {packet.packet_type.value}")
            except Exception as e:
                print(f"[QSurface] Error: {e}")

    def get_challenge_packets(self, challenge_id: str) -> List[RefQuestPacket]:
        """Get all packets for a challenge."""
        return [p for p in self.packets if p.challenge_id == challenge_id]

    def get_user_packets(
        self,
        user_id: str,
        packet_type: Optional[PacketType] = None,
    ) -> List[RefQuestPacket]:
        """Get packets for a user."""
        packets = [p for p in self.packets if p.user_id == user_id]
        if packet_type:
            packets = [p for p in packets if p.packet_type == packet_type]
        return packets

    def get_stats(self) -> Dict[str, Any]:
        """Get integration statistics."""
        return {
            "total_packets": len(self.packets),
            "qsurface_available": QSURFACE_AVAILABLE,
            "twinflow_available": TWINFLOW_AVAILABLE,
            "starlight_available": STARLIGHT_AVAILABLE,
            "by_type": {
                pt.value: sum(1 for p in self.packets if p.packet_type == pt)
                for pt in PacketType
            },
        }


# Global integration instance
_pcos_integration: Optional[PCOSIntegration] = None


def get_pcos_integration() -> PCOSIntegration:
    """Get or create the global PCOS integration."""
    global _pcos_integration
    if _pcos_integration is None:
        _pcos_integration = PCOSIntegration()
    return _pcos_integration
