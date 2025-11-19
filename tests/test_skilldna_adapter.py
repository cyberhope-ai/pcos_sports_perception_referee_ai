"""
Unit Tests for Phase 3B-2 SkillDNA Adapter

Tests SkillDNA aggregation logic for referees, players, crews, and game summaries.
"""
import pytest
import asyncio
from typing import List
from collections import namedtuple
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4


# Mock database models
MockActor = namedtuple('MockActor', ['id', 'actor_type', 'first_seen_frame', 'last_seen_frame'])
MockEvent = namedtuple('MockEvent', ['event_type', 'official_id', 'position_score', 'visibility_score',
                                      'rotation_correct', 'actors_involved', 'foul_type', 'rotation_quality',
                                      'late', 'misaligned', 'metadata'])
MockQSurface = namedtuple('MockQSurface', ['surface_type', 'persona_id', 'metadata', 'fairness_index',
                                            'consistency_signal', 'decision_quality_score', 'risk_factor'])


class TestSkillDNAAdapter:
    """Test SkillDNA Adapter core logic"""

    @pytest.mark.asyncio
    async def test_process_referee_skilldna_basic(self):
        """Test referee SkillDNA computation from mechanics events"""
        from analysis.skilldna_adapter import SkillDNAAdapter

        # Mock database session
        mock_db = AsyncMock()
        mock_db.execute = AsyncMock()
        mock_db.commit = AsyncMock()

        adapter = SkillDNAAdapter(mock_db, str(uuid4()))

        # Create mock referee
        ref_id = str(uuid4())
        referee = MockActor(ref_id, 'referee', 0, 100)

        # Create mock mechanics events
        events = [
            MockEvent(
                event_type='ref_mechanics',
                official_id=ref_id,
                position_score=0.8,
                visibility_score=0.75,
                rotation_correct=True,
                actors_involved=[],
                foul_type=None,
                rotation_quality=None,
                late=None,
                misaligned=None,
                metadata={}
            ),
            MockEvent(
                event_type='ref_mechanics',
                official_id=ref_id,
                position_score=0.85,
                visibility_score=0.80,
                rotation_correct=True,
                actors_involved=[],
                foul_type=None,
                rotation_quality=None,
                late=None,
                misaligned=None,
                metadata={}
            ),
            MockEvent(
                event_type='ref_mechanics',
                official_id=ref_id,
                position_score=0.70,
                visibility_score=0.70,
                rotation_correct=False,
                actors_involved=[],
                foul_type=None,
                rotation_quality=None,
                late=None,
                misaligned=None,
                metadata={}
            ),
        ]

        # Create mock QSurfaces
        qsurfaces = [
            MockQSurface(
                surface_type='referee_view',
                persona_id=ref_id,
                metadata={'occlusion_factor': 0.1},
                fairness_index=None,
                consistency_signal=None,
                decision_quality_score=None,
                risk_factor=None
            ),
            MockQSurface(
                surface_type='referee_view',
                persona_id=ref_id,
                metadata={'occlusion_factor': 0.15},
                fairness_index=None,
                consistency_signal=None,
                decision_quality_score=None,
                risk_factor=None
            ),
        ]

        # Process referee SkillDNA
        updates = await adapter._process_referee_skilldna([referee], events, qsurfaces)

        assert len(updates) == 1
        update = updates[0]

        # Check aggregated metrics
        assert update.actor_id == ref_id
        assert 0.75 <= update.delta_values['mechanics_score'] <= 0.85  # avg of 0.8, 0.85, 0.70
        assert 0.70 <= update.delta_values['visibility_score'] <= 0.80
        assert update.rotation_efficiency == pytest.approx(2/3, abs=0.01)  # 2 correct out of 3
        assert 0.10 <= update.delta_values['occlusion_avg'] <= 0.15

    @pytest.mark.asyncio
    async def test_process_player_skilldna_foul_tendencies(self):
        """Test player SkillDNA computation from foul events"""
        from analysis.skilldna_adapter import SkillDNAAdapter

        mock_db = AsyncMock()
        mock_db.execute = AsyncMock()
        mock_db.commit = AsyncMock()

        adapter = SkillDNAAdapter(mock_db, str(uuid4()))

        # Create mock player
        player_id = str(uuid4())
        player = MockActor(player_id, 'player', 0, 1000)

        # Create mock foul events
        events = [
            MockEvent(
                event_type='candidate_foul',
                official_id=None,
                position_score=None,
                visibility_score=None,
                rotation_correct=None,
                actors_involved=[player_id],
                foul_type='charge',
                rotation_quality=None,
                late=None,
                misaligned=None,
                metadata={}
            ),
            MockEvent(
                event_type='candidate_foul',
                official_id=None,
                position_score=None,
                visibility_score=None,
                rotation_correct=None,
                actors_involved=[player_id],
                foul_type='block',
                rotation_quality=None,
                late=None,
                misaligned=None,
                metadata={}
            ),
            MockEvent(
                event_type='candidate_foul',
                official_id=None,
                position_score=None,
                visibility_score=None,
                rotation_correct=None,
                actors_involved=[player_id],
                foul_type='charge',
                rotation_quality=None,
                late=None,
                misaligned=None,
                metadata={}
            ),
        ]

        # Create mock player QSurfaces
        qsurfaces = [
            MockQSurface(
                surface_type='player_view',
                persona_id=player_id,
                metadata={},
                fairness_index=None,
                consistency_signal=None,
                decision_quality_score=0.65,
                risk_factor=0.7
            ),
            MockQSurface(
                surface_type='player_view',
                persona_id=player_id,
                metadata={},
                fairness_index=None,
                consistency_signal=None,
                decision_quality_score=0.70,
                risk_factor=0.75
            ),
        ]

        # Process player SkillDNA
        updates = await adapter._process_player_skilldna([player], events, qsurfaces)

        assert len(updates) == 1
        update = updates[0]

        # Check foul tendencies
        assert update.actor_id == player_id
        assert 'charge' in update.foul_tendency
        assert 'block' in update.foul_tendency
        assert update.foul_tendency['charge'] == pytest.approx(2/3, abs=0.01)  # 2 charges out of 3 fouls
        assert update.foul_tendency['block'] == pytest.approx(1/3, abs=0.01)  # 1 block out of 3 fouls

        # Check contact behavior
        assert update.contact_behavior['total_fouls'] == 3
        assert update.contact_behavior['frames_analyzed'] == 1000

        # Check decision quality
        assert 0.65 <= update.decision_quality <= 0.70

    @pytest.mark.asyncio
    async def test_process_crew_skilldna(self):
        """Test crew SkillDNA computation from rotation events"""
        from analysis.skilldna_adapter import SkillDNAAdapter

        mock_db = AsyncMock()
        mock_db.execute = AsyncMock()
        mock_db.commit = AsyncMock()

        adapter = SkillDNAAdapter(mock_db, str(uuid4()))

        # Create mock referees
        ref1_id = str(uuid4())
        ref2_id = str(uuid4())
        referees = [
            MockActor(ref1_id, 'referee', 0, 100),
            MockActor(ref2_id, 'referee', 0, 100)
        ]

        # Create mock rotation events
        events = [
            MockEvent(
                event_type='crew_rotation',
                official_id=None,
                position_score=None,
                visibility_score=None,
                rotation_correct=None,
                actors_involved=[],
                foul_type=None,
                rotation_quality=0.85,
                late=False,
                misaligned=False,
                metadata={}
            ),
            MockEvent(
                event_type='crew_rotation',
                official_id=None,
                position_score=None,
                visibility_score=None,
                rotation_correct=None,
                actors_involved=[],
                foul_type=None,
                rotation_quality=0.75,
                late=True,
                misaligned=False,
                metadata={}
            ),
            MockEvent(
                event_type='crew_rotation',
                official_id=None,
                position_score=None,
                visibility_score=None,
                rotation_correct=None,
                actors_involved=[],
                foul_type=None,
                rotation_quality=0.90,
                late=False,
                misaligned=True,
                metadata={}
            ),
        ]

        # Create mock league QSurfaces
        qsurfaces = [
            MockQSurface(
                surface_type='league_view',
                persona_id='league',
                metadata={},
                fairness_index=0.80,
                consistency_signal=0.75,
                decision_quality_score=None,
                risk_factor=None
            ),
            MockQSurface(
                surface_type='league_view',
                persona_id='league',
                metadata={},
                fairness_index=0.85,
                consistency_signal=0.80,
                decision_quality_score=None,
                risk_factor=None
            ),
        ]

        # Process crew SkillDNA
        crew_update = await adapter._process_crew_skilldna(referees, events, qsurfaces)

        assert crew_update is not None

        # Check rotation metrics
        assert crew_update.avg_rotation_quality == pytest.approx((0.85 + 0.75 + 0.90) / 3, abs=0.01)
        assert crew_update.late_rotations == 1
        assert crew_update.misaligned_rotations == 1

        # Check league metrics
        assert crew_update.avg_fairness_index == pytest.approx((0.80 + 0.85) / 2, abs=0.01)
        assert crew_update.avg_consistency_signal == pytest.approx((0.75 + 0.80) / 2, abs=0.01)

    @pytest.mark.asyncio
    async def test_process_game_summary(self):
        """Test game officiating summary computation"""
        from analysis.skilldna_adapter import SkillDNAAdapter

        mock_db = AsyncMock()
        mock_db.execute = AsyncMock()
        mock_db.commit = AsyncMock()

        game_id = str(uuid4())
        adapter = SkillDNAAdapter(mock_db, game_id)

        # Create mock events
        events = [
            MockEvent('candidate_foul', None, None, None, None, [], 'charge', None, None, None, {}),
            MockEvent('candidate_foul', None, None, None, None, [], 'block', None, None, None, {}),
            MockEvent('ref_mechanics', None, 0.8, 0.75, True, [], None, None, None, None, {'ref_region': 0, 'occlusion_factor': 0.1}),
            MockEvent('ref_mechanics', None, 0.85, 0.80, True, [], None, None, None, None, {'ref_region': 1, 'occlusion_factor': 0.15}),
            MockEvent('crew_rotation', None, None, None, None, [], None, 0.85, False, False, {}),
        ]

        # Create mock league QSurfaces
        qsurfaces = [
            MockQSurface('league_view', 'league', {}, 0.80, 0.75, None, None),
            MockQSurface('league_view', 'league', {}, 0.85, 0.80, None, None),
        ]

        # Process game summary
        summary = await adapter._process_game_summary(events, qsurfaces)

        assert summary is not None
        assert summary.game_id == game_id
        assert summary.events_count == 5
        assert summary.candidate_foul_count == 2
        assert summary.ref_mechanics_count == 2
        assert summary.crew_rotation_count == 1
        assert summary.fairness_index_avg == pytest.approx((0.80 + 0.85) / 2, abs=0.01)
        assert summary.consistency_signal_avg == pytest.approx((0.75 + 0.80) / 2, abs=0.01)
        assert summary.regional_coverage_quality == pytest.approx(2/6, abs=0.01)  # 2 regions covered out of 6
        assert summary.occlusion_frequency == pytest.approx((0.1 + 0.15) / 2, abs=0.01)


class TestSkillDNAIntegration:
    """Integration tests for SkillDNA adapter"""

    @pytest.mark.asyncio
    async def test_incremental_averaging(self):
        """Test that incremental averaging works correctly for multiple games"""
        # This would test the _persist_referee_profiles and _persist_player_profiles methods
        # with simulated multiple game updates to ensure averages are computed correctly
        pass  # TODO: Implement with actual DB mock

    @pytest.mark.asyncio
    async def test_edge_case_no_events(self):
        """Test behavior when there are no events for an actor"""
        from analysis.skilldna_adapter import SkillDNAAdapter

        mock_db = AsyncMock()
        mock_db.execute = AsyncMock()
        mock_db.commit = AsyncMock()

        adapter = SkillDNAAdapter(mock_db, str(uuid4()))

        # Create actors with no associated events
        referee = MockActor(str(uuid4()), 'referee', 0, 100)
        player = MockActor(str(uuid4()), 'player', 0, 1000)

        # Process with empty events and QSurfaces
        ref_updates = await adapter._process_referee_skilldna([referee], [], [])
        player_updates = await adapter._process_player_skilldna([player], [], [])

        assert len(ref_updates) == 0
        assert len(player_updates) == 0


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
