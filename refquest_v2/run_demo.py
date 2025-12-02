#!/usr/bin/env python3
"""
RefQuest 2.0 — Demo Launcher
PrecognitionOS Studio

Demonstrates the complete RefQuest skill verification flow.
"""

import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from refquest.backend.sample_quests import load_sample_quests, create_omelette_quest
from refquest.backend.controllers import get_challenge_controller, ChallengePhase
from refquest.backend.scoring import get_mastery_tracker, get_badge_system
from refquest.backend.pcos_integration import get_pcos_integration


def print_header():
    """Print demo header."""
    print("\n" + "=" * 60)
    print("  RefQuest 2.0 — PCOS-Native Skill Verification Demo")
    print("  PrecognitionOS Studio | CyberHopeAI")
    print("=" * 60 + "\n")


def print_section(title: str):
    """Print section header."""
    print(f"\n{'─' * 40}")
    print(f"  {title}")
    print("─" * 40)


async def demo_quest_definition():
    """Demonstrate quest definition and loading."""
    print_section("1. Quest Definition Engine")

    # Load sample quests
    library = load_sample_quests()
    print(f"  Loaded {len(library.quests)} sample quests:")

    for quest_id, quest in library.quests.items():
        print(f"    • {quest.title}")
        print(f"      Category: {quest.category.value}")
        print(f"      Difficulty: {quest.difficulty}")
        print(f"      Steps: {len(quest.steps)}")
        print(f"      Skills: {', '.join(quest.primary_skills[:3])}")
        print()

    return library


async def demo_challenge_flow(library):
    """Demonstrate challenge execution flow."""
    print_section("2. Challenge Execution Flow")

    controller = get_challenge_controller()
    quest_id = "quest-omelette-basic"

    # Start challenge
    print("  Starting challenge...")
    progress = await controller.start_challenge(
        quest_id=quest_id,
        user_id="demo-user",
    )
    print(f"  ✓ Challenge ID: {progress.challenge_id}")
    print(f"  ✓ Phase: {progress.phase.value}")

    # Begin active phase
    print("\n  User acknowledges briefing...")
    progress = await controller.begin_active_phase(progress.challenge_id)
    print(f"  ✓ Phase: {progress.phase.value}")
    print(f"  ✓ Started at: {progress.started_at}")

    # Show steps
    print("\n  Steps to complete:")
    for sp in progress.step_progress:
        print(f"    {sp.order + 1}. {sp.step_name} ({sp.points_possible} pts)")

    return progress


async def demo_skill_assessment(progress):
    """Demonstrate skill assessment and mastery."""
    print_section("3. Skill Assessment (SkillDNA)")

    tracker = get_mastery_tracker()

    # Record some skill attempts
    skills = ["cooking", "heat_control", "folding", "plating"]
    scores = [85, 78, 92, 88]

    print("  Recording skill assessments:")
    for skill, score in zip(skills, scores):
        mastery = tracker.record_attempt(
            skill_id=skill,
            score=score,
            quest_id=progress.quest_id,
            difficulty="beginner",
        )
        print(f"    • {skill}: {score}% → Mastery: {mastery.mastery_score:.2f} ({mastery.level.value})")

    # Show summary
    summary = tracker.get_mastery_summary()
    print(f"\n  Summary:")
    print(f"    Total skills tracked: {summary['total_skills']}")
    print(f"    Average mastery: {summary['average_mastery']:.2f}")

    return tracker


async def demo_badge_system(tracker):
    """Demonstrate badge awarding."""
    print_section("4. Badge System")

    badges = get_badge_system()

    # Check for earned badges
    user_skills = {s.skill_id: s for s in tracker.get_user_skills()}

    earned = badges.check_and_award_badges(
        user_id="demo-user",
        skill_masteries=user_skills,
        quest_completions=1,
        current_streak=1,
        best_streak=1,
        quest_score=85.5,
    )

    print(f"  Available badges: {len(badges.definitions)}")
    print(f"  Badges earned this session: {len(earned)}")

    if earned:
        for badge in earned:
            defn = badges.definitions.get(badge.badge_id)
            if defn:
                print(f"    • {defn.name} ({defn.rarity.value})")
                print(f"      {defn.description}")

    # Show XP
    total_xp = badges.get_total_xp("demo-user")
    print(f"\n  Total XP earned: {total_xp}")


async def demo_pcos_integration(progress):
    """Demonstrate PCOS integration."""
    print_section("5. PCOS Integration (QSurface Packets)")

    pcos = get_pcos_integration()

    # Emit quest start
    packet = await pcos.emit_quest_start(
        user_id=progress.user_id,
        quest_id=progress.quest_id,
        challenge_id=progress.challenge_id,
        quest_title="Make a Basic Omelette",
        quest_skills=["cooking", "heat_control"],
    )
    print(f"  Emitted: {packet.packet_type.value}")
    print(f"    Packet ID: {packet.packet_id}")
    print(f"    Intent: {packet.intent}")

    # Emit skill assessment
    packet = await pcos.emit_skill_assessed(
        user_id=progress.user_id,
        skill_id="cooking",
        skill_name="Cooking",
        mastery_score=0.85,
        mastery_level="master",
        delta=0.15,
    )
    print(f"  Emitted: {packet.packet_type.value}")
    print(f"    Skill: cooking → Master (0.85)")

    # Show stats
    stats = pcos.get_stats()
    print(f"\n  PCOS Stats:")
    print(f"    Total packets: {stats['total_packets']}")
    print(f"    QSurface available: {stats['qsurface_available']}")
    print(f"    TwinFlow available: {stats['twinflow_available']}")


async def demo_completion(progress):
    """Demonstrate challenge completion."""
    print_section("6. Challenge Completion")

    controller = get_challenge_controller()
    pcos = get_pcos_integration()

    # Complete the challenge
    print("  Completing challenge...")
    result = await controller.complete_challenge(progress.challenge_id)

    print(f"  ✓ Phase: {result.phase.value}")
    print(f"  ✓ Overall Score: {result.overall_score:.1f}%")
    print(f"  ✓ Passed: {result.passed}")
    print(f"  ✓ Time: {result.elapsed_seconds:.1f}s")

    # Emit completion packet
    await pcos.emit_quest_complete(
        user_id=result.user_id,
        quest_id=result.quest_id,
        challenge_id=result.challenge_id,
        passed=result.passed,
        overall_score=result.overall_score,
        time_elapsed=result.elapsed_seconds,
        skill_deltas=result.skill_deltas,
        badges_earned=result.badges_earned,
    )

    return result


def print_summary():
    """Print demo summary."""
    print("\n" + "=" * 60)
    print("  RefQuest 2.0 Demo Complete!")
    print("=" * 60)
    print("""
  What was demonstrated:
    1. Quest Definition Engine - Schema-based task definitions
    2. Challenge Controller - Full execution flow management
    3. SkillDNA Engine - Mastery tracking and assessment
    4. Badge System - Achievement awarding
    5. PCOS Integration - QSurface packet generation
    6. Challenge Completion - Results and scoring

  RefQuest 2.0 is now ready for:
    • Video ingestion via TwinFlow
    • Real-time skill verification
    • Multi-camera evidence capture
    • Full PCOS integration

  Run the API server:
    uvicorn refquest.backend.api.main:app --reload

  CyberHopeAI - PrecognitionOS Studio
""")


async def main():
    """Run the complete demo."""
    print_header()

    # Run demo steps
    library = await demo_quest_definition()
    progress = await demo_challenge_flow(library)
    tracker = await demo_skill_assessment(progress)
    await demo_badge_system(tracker)
    await demo_pcos_integration(progress)
    await demo_completion(progress)

    print_summary()


if __name__ == "__main__":
    asyncio.run(main())
