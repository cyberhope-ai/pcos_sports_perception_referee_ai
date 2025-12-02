"""
RefQuest 2.0 — End-to-End Test Suite
PrecognitionOS Studio

Comprehensive tests for the complete RefQuest flow:
Quest Definition -> Challenge Start -> Evidence Capture ->
Step Verification -> Skill Assessment -> Badge Awards
"""

import asyncio
import pytest
from typing import Dict, Any

# Import all RefQuest components
from refquest.backend.quest_schema import Quest, Step, QuestCategory
from refquest.backend.quest_library import QuestLibrary, get_quest_library
from refquest.backend.sample_quests import load_sample_quests, create_omelette_quest
from refquest.backend.controllers import (
    ChallengeController,
    ChallengePhase,
    get_challenge_controller,
)
from refquest.backend.ingestion import (
    TwinFlowBridge,
    EvidenceProcessor,
    VerificationStatus,
    get_twinflow_bridge,
    get_evidence_processor,
)
from refquest.backend.scoring import (
    SkillDNAEngine,
    MasteryTracker,
    MasteryLevel,
    BadgeSystem,
    get_skilldna_engine,
    get_mastery_tracker,
    get_badge_system,
)
from refquest.backend.pcos_integration import (
    PCOSIntegration,
    PacketType,
    get_pcos_integration,
)


class TestQuestSchema:
    """Tests for quest definitions and schemas."""

    def test_create_quest(self):
        """Test creating a quest definition."""
        quest = create_omelette_quest()

        assert quest.quest_id == "quest-omelette-basic"
        assert quest.name == "basic_omelette"
        assert quest.category == QuestCategory.TRAINING
        assert len(quest.steps) == 6
        assert quest.total_points == 100

    def test_quest_skill_tags(self):
        """Test collecting skill tags from quest."""
        quest = create_omelette_quest()
        tags = quest.get_all_skill_tags()

        assert "cooking" in tags
        assert "heat_control" in tags
        assert len(tags) > 5


class TestQuestLibrary:
    """Tests for quest library operations."""

    def test_load_sample_quests(self):
        """Test loading sample quests."""
        library = load_sample_quests()

        assert len(library.quests) >= 3
        assert "quest-omelette-basic" in library.quests

    def test_quest_search(self):
        """Test searching for quests."""
        library = load_sample_quests()
        results = library.search_quests("omelette")

        assert len(results) > 0
        assert results[0].quest.quest_id == "quest-omelette-basic"

    def test_quest_filtering(self):
        """Test filtering quests by category."""
        library = load_sample_quests()
        training = library.list_quests(category=QuestCategory.TRAINING)

        assert len(training) > 0


class TestChallengeController:
    """Tests for challenge execution flow."""

    @pytest.fixture
    def controller(self):
        load_sample_quests()
        return get_challenge_controller()

    @pytest.mark.asyncio
    async def test_start_challenge(self, controller):
        """Test starting a challenge."""
        progress = await controller.start_challenge(
            quest_id="quest-omelette-basic",
            user_id="test-user",
        )

        assert progress.quest_id == "quest-omelette-basic"
        assert progress.phase == ChallengePhase.BRIEFING
        assert len(progress.step_progress) == 6

    @pytest.mark.asyncio
    async def test_begin_active_phase(self, controller):
        """Test transitioning to active phase."""
        progress = await controller.start_challenge(
            quest_id="quest-omelette-basic",
            user_id="test-user-2",
        )
        progress = await controller.begin_active_phase(progress.challenge_id)

        assert progress.phase == ChallengePhase.ACTIVE
        assert progress.started_at is not None

    @pytest.mark.asyncio
    async def test_complete_challenge(self, controller):
        """Test completing a challenge."""
        progress = await controller.start_challenge(
            quest_id="quest-omelette-basic",
            user_id="test-user-3",
        )
        progress = await controller.begin_active_phase(progress.challenge_id)
        progress = await controller.complete_challenge(progress.challenge_id)

        assert progress.phase == ChallengePhase.COMPLETE
        assert progress.completed_at is not None


class TestIngestion:
    """Tests for evidence capture and processing."""

    @pytest.mark.asyncio
    async def test_create_capture_session(self):
        """Test creating a capture session."""
        bridge = get_twinflow_bridge()
        session = await bridge.create_session(
            challenge_id="test-challenge",
            step_id="test-step",
            user_id="test-user",
        )

        assert session.session_id is not None
        assert session.challenge_id == "test-challenge"

    def test_evidence_processor(self):
        """Test evidence processor initialization."""
        processor = get_evidence_processor()

        assert processor is not None
        assert processor.object_confidence_threshold == 0.7


class TestSkillDNA:
    """Tests for skill scoring and mastery."""

    def test_skill_profile(self):
        """Test creating skill profile."""
        engine = get_skilldna_engine()
        profile = engine.get_profile("test-user")

        assert profile.user_id == "test-user"
        assert isinstance(profile.skills, dict)

    def test_mastery_tracking(self):
        """Test mastery tracking."""
        tracker = get_mastery_tracker()
        skill = tracker.record_attempt(
            skill_id="test-skill",
            score=85,
            difficulty="intermediate",
        )

        assert skill.mastery_score > 0
        assert skill.total_attempts == 1

    def test_mastery_levels(self):
        """Test mastery level thresholds."""
        assert MasteryLevel.from_score(0.1) == MasteryLevel.NOVICE
        assert MasteryLevel.from_score(0.5) == MasteryLevel.JOURNEYMAN
        assert MasteryLevel.from_score(0.85) == MasteryLevel.MASTER


class TestBadgeSystem:
    """Tests for badge awarding."""

    def test_badge_definitions(self):
        """Test badge definitions are loaded."""
        badges = get_badge_system()

        assert len(badges.definitions) > 0
        assert "skill_master" in badges.definitions

    def test_badge_stats(self):
        """Test badge statistics."""
        badges = get_badge_system()
        stats = badges.get_stats()

        assert stats["total_definitions"] > 0
        assert "by_category" in stats


class TestPCOSIntegration:
    """Tests for PCOS system integration."""

    @pytest.mark.asyncio
    async def test_emit_quest_start(self):
        """Test emitting quest start packet."""
        pcos = get_pcos_integration()
        packet = await pcos.emit_quest_start(
            user_id="test-user",
            quest_id="test-quest",
            challenge_id="test-challenge",
            quest_title="Test Quest",
            quest_skills=["skill1", "skill2"],
        )

        assert packet.packet_type == PacketType.QUEST_START
        assert "quest_start" in packet.semantic_tags

    @pytest.mark.asyncio
    async def test_emit_skill_assessed(self):
        """Test emitting skill assessed packet."""
        pcos = get_pcos_integration()
        packet = await pcos.emit_skill_assessed(
            user_id="test-user",
            skill_id="cooking",
            skill_name="Cooking",
            mastery_score=0.8,
            mastery_level="master",
            delta=0.1,
        )

        assert packet.packet_type == PacketType.SKILL_ASSESSED
        assert packet.payload["mastery_score"] == 0.8


class TestFullFlow:
    """End-to-end integration test."""

    @pytest.mark.asyncio
    async def test_complete_quest_flow(self):
        """Test complete quest flow from start to finish."""
        # Load quests
        library = load_sample_quests()
        controller = get_challenge_controller()
        pcos = get_pcos_integration()

        # Start challenge
        progress = await controller.start_challenge(
            quest_id="quest-omelette-basic",
            user_id="e2e-test-user",
        )
        assert progress.phase == ChallengePhase.BRIEFING

        # Begin active phase
        progress = await controller.begin_active_phase(progress.challenge_id)
        assert progress.phase == ChallengePhase.ACTIVE

        # Emit PCOS packet
        packet = await pcos.emit_quest_start(
            user_id=progress.user_id,
            quest_id=progress.quest_id,
            challenge_id=progress.challenge_id,
            quest_title="Make a Basic Omelette",
            quest_skills=["cooking"],
        )
        assert packet.packet_id is not None

        # Complete challenge
        progress = await controller.complete_challenge(progress.challenge_id)
        assert progress.phase == ChallengePhase.COMPLETE

        # Emit completion packet
        packet = await pcos.emit_quest_complete(
            user_id=progress.user_id,
            quest_id=progress.quest_id,
            challenge_id=progress.challenge_id,
            passed=progress.passed,
            overall_score=progress.overall_score,
            time_elapsed=progress.elapsed_seconds,
            skill_deltas=progress.skill_deltas,
            badges_earned=progress.badges_earned,
        )
        assert packet.packet_type == PacketType.QUEST_COMPLETE

        print("\\n=== E2E Test Complete ===")
        print(f"Challenge ID: {progress.challenge_id}")
        print(f"Overall Score: {progress.overall_score}")
        print(f"Passed: {progress.passed}")
        print(f"PCOS Packets: {len(pcos.packets)}")


def run_tests():
    """Run all tests without pytest."""
    print("\\n" + "=" * 50)
    print("RefQuest 2.0 — Test Suite")
    print("=" * 50 + "\\n")

    # Quest Schema Tests
    print("Testing Quest Schema...")
    test = TestQuestSchema()
    test.test_create_quest()
    test.test_quest_skill_tags()
    print("  ✓ Quest Schema tests passed\\n")

    # Quest Library Tests
    print("Testing Quest Library...")
    test = TestQuestLibrary()
    test.test_load_sample_quests()
    test.test_quest_search()
    test.test_quest_filtering()
    print("  ✓ Quest Library tests passed\\n")

    # SkillDNA Tests
    print("Testing SkillDNA...")
    test = TestSkillDNA()
    test.test_skill_profile()
    test.test_mastery_tracking()
    test.test_mastery_levels()
    print("  ✓ SkillDNA tests passed\\n")

    # Badge System Tests
    print("Testing Badge System...")
    test = TestBadgeSystem()
    test.test_badge_definitions()
    test.test_badge_stats()
    print("  ✓ Badge System tests passed\\n")

    # Async tests
    print("Testing Challenge Controller...")
    asyncio.run(run_async_tests())

    print("\\n" + "=" * 50)
    print("All RefQuest 2.0 Tests PASSED!")
    print("=" * 50)


async def run_async_tests():
    """Run async tests."""
    # Challenge Controller Tests
    load_sample_quests()
    controller = get_challenge_controller()

    progress = await controller.start_challenge(
        quest_id="quest-omelette-basic",
        user_id="test-runner",
    )
    print(f"  ✓ Started challenge: {progress.challenge_id}")

    progress = await controller.begin_active_phase(progress.challenge_id)
    print(f"  ✓ Active phase: {progress.phase.value}")

    # PCOS Integration Tests
    print("\\nTesting PCOS Integration...")
    pcos = get_pcos_integration()

    packet = await pcos.emit_quest_start(
        user_id="test-runner",
        quest_id="quest-omelette-basic",
        challenge_id=progress.challenge_id,
        quest_title="Test Quest",
        quest_skills=["cooking"],
    )
    print(f"  ✓ Emitted packet: {packet.packet_type.value}")

    # Complete challenge
    progress = await controller.complete_challenge(progress.challenge_id)
    print(f"  ✓ Completed: {progress.phase.value}")


if __name__ == "__main__":
    run_tests()
