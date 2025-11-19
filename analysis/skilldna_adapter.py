"""
SkillDNA Adapter - Phase 3B-2 Implementation

Aggregates events + QSurfaces into longitudinal SkillDNA profiles.

Implements PCOS SkillDNA integration for:
- Referee SkillDNA (call accuracy, mechanics, rotation, visibility)
- Player SkillDNA (foul tendencies, risk, decision quality)
- Crew SkillDNA (rotation quality, fairness, consistency)
- Game summaries (league-level aggregates)

Follows SPEC_KIT and PCOS Mapping Surface semantics.
"""
from typing import Dict, Any, List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)


class RefereeSkillDNAUpdate(BaseModel):
    """Referee SkillDNA update (Phase 3B-2)"""
    actor_id: str
    update_type: str = "referee"
    call_accuracy: Optional[float] = None
    missed_call_rate: Optional[float] = None
    rotation_efficiency: Optional[float] = None
    mechanics_consistency: Optional[float] = None
    visibility_efficiency: Optional[float] = None
    high_pressure_accuracy: Optional[float] = None
    bias_tendency: Optional[Dict[str, Any]] = None
    delta_values: Dict[str, Any] = {}
    confidence: float = 0.5


class PlayerSkillDNAUpdate(BaseModel):
    """Player SkillDNA update (Phase 3B-2)"""
    actor_id: str
    update_type: str = "player"
    foul_tendency: Optional[Dict[str, float]] = None
    contact_behavior: Optional[Dict[str, Any]] = None
    defensive_discipline: Optional[float] = None
    decision_quality: Optional[float] = None
    delta_values: Dict[str, Any] = {}
    confidence: float = 0.5


class CrewSkillDNAUpdate(BaseModel):
    """Crew SkillDNA update (Phase 3B-2)"""
    crew_id: str
    avg_rotation_quality: float
    avg_fairness_index: float
    avg_consistency_signal: float
    late_rotations: int
    misaligned_rotations: int
    confidence: float = 0.5


class GameOfficiatingSummaryUpdate(BaseModel):
    """Game officiating summary (Phase 3B-2)"""
    game_id: str
    events_count: int
    candidate_foul_count: int
    ref_mechanics_count: int
    crew_rotation_count: int
    fairness_index_avg: float
    consistency_signal_avg: float
    regional_coverage_quality: float
    occlusion_frequency: float


class SkillDNAAdapter:
    """
    Phase 3B-2: SkillDNA Integration

    Aggregates game events + QSurfaces → SkillDNA profiles.

    Flow:
    1. Load all events + QSurfaces for game
    2. Compute referee metrics (mechanics, visibility, rotation, occlusion)
    3. Compute player metrics (foul tendencies, risk, decision quality)
    4. Compute crew metrics (rotation quality, fairness)
    5. Compute game summary (league-level aggregates)
    6. Persist profiles to DB
    7. (Optional) Emit SkillDNAUpdateEvent to PCOS bus
    """

    def __init__(self, db_session: AsyncSession, game_id: str):
        """
        Initialize SkillDNA adapter for a game.

        Args:
            db_session: Database session
            game_id: Game UUID
        """
        self.db = db_session
        self.game_id = game_id

    async def process_game(self):
        """
        Main entry point: Process all SkillDNA updates for this game.

        Loads events, QSurfaces, computes aggregates, and persists profiles.
        """
        from ..models import Event, QSurface, Actor, EventType, SurfaceType

        logger.info(f"Processing SkillDNA for game {self.game_id}")

        # Load all events
        events_result = await self.db.execute(
            select(Event).where(Event.game_id == UUID(self.game_id))
        )
        all_events = events_result.scalars().all()

        # Load all QSurfaces
        qsurfaces_result = await self.db.execute(
            select(QSurface).join(Event).where(Event.game_id == UUID(self.game_id))
        )
        all_qsurfaces = qsurfaces_result.scalars().all()

        # Load all actors
        actors_result = await self.db.execute(
            select(Actor).where(Actor.game_id == UUID(self.game_id))
        )
        all_actors = actors_result.scalars().all()

        logger.info(f"Loaded {len(all_events)} events, {len(all_qsurfaces)} QSurfaces, {len(all_actors)} actors")

        # Process referee SkillDNA
        referee_updates = await self._process_referee_skilldna(all_actors, all_events, all_qsurfaces)

        # Process player SkillDNA
        player_updates = await self._process_player_skilldna(all_actors, all_events, all_qsurfaces)

        # Process crew SkillDNA
        crew_update = await self._process_crew_skilldna(all_actors, all_events, all_qsurfaces)

        # Process game summary
        game_summary = await self._process_game_summary(all_events, all_qsurfaces)

        # Persist to DB
        await self._persist_referee_profiles(referee_updates)
        await self._persist_player_profiles(player_updates)
        if crew_update:
            await self._persist_crew_profile(crew_update)
        if game_summary:
            await self._persist_game_summary(game_summary)

        logger.info(f"SkillDNA processing complete: {len(referee_updates)} refs, {len(player_updates)} players")

        return {
            "referee_updates": len(referee_updates),
            "player_updates": len(player_updates),
            "crew_update": crew_update is not None,
            "game_summary": game_summary is not None
        }

    async def _process_referee_skilldna(
        self,
        all_actors: List[Any],
        all_events: List[Any],
        all_qsurfaces: List[Any]
    ) -> List[RefereeSkillDNAUpdate]:
        """
        Compute referee SkillDNA updates from events and QSurfaces.

        Aggregates:
        - Mechanics score avg
        - Visibility score avg
        - Rotation efficiency
        - Occlusion avg
        - Call accuracy (foul classifications)
        - Regional coverage
        """
        from ..models import ActorType

        referee_updates = []
        referees = [a for a in all_actors if a.actor_type == ActorType.referee]

        for referee in referees:
            ref_id = str(referee.id)

            # Filter events involving this referee
            ref_mechanics_events = [
                e for e in all_events
                if getattr(e, 'event_type', None) == 'ref_mechanics' and
                   getattr(e, 'official_id', None) == UUID(ref_id)
            ]

            # Filter QSurfaces for this referee
            ref_qsurfaces = [
                s for s in all_qsurfaces
                if getattr(s, 'surface_type', None) == 'referee_view' and
                   getattr(s, 'persona_id', None) == ref_id
            ]

            if not ref_mechanics_events and not ref_qsurfaces:
                continue

            # Aggregate mechanics scores
            mechanics_scores = [getattr(e, 'position_score', 0.0) for e in ref_mechanics_events]
            visibility_scores = [getattr(e, 'visibility_score', 0.0) for e in ref_mechanics_events]
            rotation_correct_count = sum(1 for e in ref_mechanics_events if getattr(e, 'rotation_correct', False))

            # Aggregate QSurface occlusion factors
            occlusion_factors = [
                getattr(s.metadata, 'occlusion_factor', 0.0) if hasattr(s, 'metadata') and s.metadata
                else 0.0
                for s in ref_qsurfaces
            ]

            # Calculate averages
            avg_mechanics = sum(mechanics_scores) / len(mechanics_scores) if mechanics_scores else 0.5
            avg_visibility = sum(visibility_scores) / len(visibility_scores) if visibility_scores else 0.5
            rotation_efficiency = rotation_correct_count / len(ref_mechanics_events) if ref_mechanics_events else 0.5
            avg_occlusion = sum(occlusion_factors) / len(occlusion_factors) if occlusion_factors else 0.0

            # Mechanics consistency (variance-based)
            mechanics_variance = (
                sum((s - avg_mechanics)**2 for s in mechanics_scores) / len(mechanics_scores)
                if len(mechanics_scores) > 1 else 0.0
            )
            mechanics_consistency = max(0.0, 1.0 - mechanics_variance)

            # Visibility efficiency (avg visibility - occlusion penalty)
            visibility_efficiency = max(0.0, avg_visibility - avg_occlusion * 0.3)

            # Call accuracy placeholder (Phase 4+: compare correct_call vs call_made)
            call_accuracy = 0.75  # TODO: Phase 4 - actual call evaluation

            update = RefereeSkillDNAUpdate(
                actor_id=ref_id,
                call_accuracy=call_accuracy,
                missed_call_rate=1.0 - call_accuracy,
                rotation_efficiency=rotation_efficiency,
                mechanics_consistency=mechanics_consistency,
                visibility_efficiency=visibility_efficiency,
                high_pressure_accuracy=call_accuracy,  # TODO: Phase 4 - stress detection
                bias_tendency={},  # TODO: Phase 4 - bias analysis
                delta_values={
                    "mechanics_score": avg_mechanics,
                    "visibility_score": avg_visibility,
                    "occlusion_avg": avg_occlusion
                },
                confidence=0.8 if len(ref_mechanics_events) > 5 else 0.6
            )

            referee_updates.append(update)

        return referee_updates

    async def _process_player_skilldna(
        self,
        all_actors: List[Any],
        all_events: List[Any],
        all_qsurfaces: List[Any]
    ) -> List[PlayerSkillDNAUpdate]:
        """
        Compute player SkillDNA updates from events and QSurfaces.

        Aggregates:
        - Foul tendencies by type
        - Fouls per 100 frames
        - Risk index
        - Decision quality
        - Contact behavior
        """
        from ..models import ActorType

        player_updates = []
        players = [a for a in all_actors if a.actor_type == ActorType.player]

        for player in players:
            player_id = str(player.id)

            # Filter candidate foul events involving this player
            player_foul_events = [
                e for e in all_events
                if getattr(e, 'event_type', None) == 'candidate_foul' and
                   player_id in str(getattr(e, 'actors_involved', []))
            ]

            # Filter PlayerQSurfaces for this player
            player_qsurfaces = [
                s for s in all_qsurfaces
                if getattr(s, 'surface_type', None) == 'player_view' and
                   getattr(s, 'persona_id', None) == player_id
            ]

            if not player_foul_events and not player_qsurfaces:
                continue

            # Aggregate foul types
            foul_counts = defaultdict(int)
            for event in player_foul_events:
                foul_type = getattr(event, 'foul_type', 'contact')
                foul_counts[foul_type] += 1

            total_fouls = sum(foul_counts.values())
            foul_tendency = {k: v / total_fouls for k, v in foul_counts.items()} if total_fouls > 0 else {}

            # Aggregate decision quality from PlayerQSurfaces
            decision_scores = [getattr(s, 'decision_quality_score', 0.5) for s in player_qsurfaces]
            risk_factors = [getattr(s, 'risk_factor', 0.5) for s in player_qsurfaces]

            avg_decision_quality = sum(decision_scores) / len(decision_scores) if decision_scores else 0.5
            avg_risk = sum(risk_factors) / len(risk_factors) if risk_factors else 0.5

            # Fouls per 100 frames (approximation)
            frames_analyzed = getattr(player, 'last_seen_frame', 1) - getattr(player, 'first_seen_frame', 0)
            fouls_per_100 = (total_fouls / frames_analyzed * 100) if frames_analyzed > 0 else 0.0

            # Defensive discipline (inverse of foul rate)
            defensive_discipline = max(0.0, 1.0 - min(fouls_per_100 / 10.0, 1.0))

            update = PlayerSkillDNAUpdate(
                actor_id=player_id,
                foul_tendency=foul_tendency,
                contact_behavior={
                    "total_fouls": total_fouls,
                    "fouls_per_100_frames": fouls_per_100,
                    "frames_analyzed": frames_analyzed
                },
                defensive_discipline=defensive_discipline,
                decision_quality=avg_decision_quality,
                delta_values={
                    "risk_index": avg_risk,
                    "foul_counts": dict(foul_counts)
                },
                confidence=0.8 if total_fouls > 3 else 0.6
            )

            player_updates.append(update)

        return player_updates

    async def _process_crew_skilldna(
        self,
        all_actors: List[Any],
        all_events: List[Any],
        all_qsurfaces: List[Any]
    ) -> Optional[CrewSkillDNAUpdate]:
        """
        Compute crew SkillDNA from rotation events and league QSurfaces.

        Aggregates:
        - Rotation quality avg
        - Fairness index avg
        - Consistency signal avg
        - Late/misaligned rotation counts
        """
        from ..models import ActorType

        # Get all referees for crew_id
        referees = [a for a in all_actors if a.actor_type == ActorType.referee]
        if not referees:
            return None

        crew_id = "_".join(sorted([str(r.id) for r in referees]))

        # Filter crew rotation events
        rotation_events = [
            e for e in all_events
            if getattr(e, 'event_type', None) == 'crew_rotation'
        ]

        # Filter league QSurfaces
        league_qsurfaces = [
            s for s in all_qsurfaces
            if getattr(s, 'surface_type', None) == 'league_view'
        ]

        if not rotation_events and not league_qsurfaces:
            return None

        # Aggregate rotation metrics
        rotation_qualities = [getattr(e, 'rotation_quality', 0.5) for e in rotation_events]
        late_count = sum(1 for e in rotation_events if getattr(e, 'late', False))
        misaligned_count = sum(1 for e in rotation_events if getattr(e, 'misaligned', False))

        avg_rotation_quality = sum(rotation_qualities) / len(rotation_qualities) if rotation_qualities else 0.5

        # Aggregate league metrics
        fairness_indices = [getattr(s, 'fairness_index', 0.5) for s in league_qsurfaces]
        consistency_signals = [getattr(s, 'consistency_signal', 0.5) for s in league_qsurfaces]

        avg_fairness = sum(fairness_indices) / len(fairness_indices) if fairness_indices else 0.5
        avg_consistency = sum(consistency_signals) / len(consistency_signals) if consistency_signals else 0.5

        return CrewSkillDNAUpdate(
            crew_id=crew_id,
            avg_rotation_quality=avg_rotation_quality,
            avg_fairness_index=avg_fairness,
            avg_consistency_signal=avg_consistency,
            late_rotations=late_count,
            misaligned_rotations=misaligned_count,
            confidence=0.8 if len(rotation_events) > 3 else 0.6
        )

    async def _process_game_summary(
        self,
        all_events: List[Any],
        all_qsurfaces: List[Any]
    ) -> Optional[GameOfficiatingSummaryUpdate]:
        """
        Compute game officiating summary (league-level aggregates).

        Aggregates:
        - Event counts by type
        - Fairness index avg
        - Consistency signal avg
        - Regional coverage quality
        - Occlusion frequency
        """
        if not all_events:
            return None

        # Event counts
        candidate_foul_count = sum(1 for e in all_events if getattr(e, 'event_type', None) == 'candidate_foul')
        ref_mechanics_count = sum(1 for e in all_events if getattr(e, 'event_type', None) == 'ref_mechanics')
        crew_rotation_count = sum(1 for e in all_events if getattr(e, 'event_type', None) == 'crew_rotation')

        # League QSurface aggregates
        league_qsurfaces = [s for s in all_qsurfaces if getattr(s, 'surface_type', None) == 'league_view']

        fairness_indices = [getattr(s, 'fairness_index', 0.5) for s in league_qsurfaces]
        consistency_signals = [getattr(s, 'consistency_signal', 0.5) for s in league_qsurfaces]

        avg_fairness = sum(fairness_indices) / len(fairness_indices) if fairness_indices else 0.5
        avg_consistency = sum(consistency_signals) / len(consistency_signals) if consistency_signals else 0.5

        # Regional coverage (from ref mechanics events metadata)
        ref_mechanics_events = [e for e in all_events if getattr(e, 'event_type', None) == 'ref_mechanics']
        regions_covered = set()
        occlusion_factors = []

        for event in ref_mechanics_events:
            metadata = getattr(event, 'metadata', {})
            if metadata:
                ref_region = metadata.get('ref_region')
                if ref_region is not None:
                    regions_covered.add(ref_region)
                occlusion = metadata.get('occlusion_factor', 0.0)
                occlusion_factors.append(occlusion)

        regional_coverage_quality = len(regions_covered) / 6.0 if regions_covered else 0.0
        occlusion_frequency = sum(occlusion_factors) / len(occlusion_factors) if occlusion_factors else 0.0

        return GameOfficiatingSummaryUpdate(
            game_id=self.game_id,
            events_count=len(all_events),
            candidate_foul_count=candidate_foul_count,
            ref_mechanics_count=ref_mechanics_count,
            crew_rotation_count=crew_rotation_count,
            fairness_index_avg=avg_fairness,
            consistency_signal_avg=avg_consistency,
            regional_coverage_quality=regional_coverage_quality,
            occlusion_frequency=occlusion_frequency
        )

    async def _persist_referee_profiles(self, updates: List[RefereeSkillDNAUpdate]):
        """Persist referee SkillDNA updates to RefereeSkillProfile table."""
        from ..models import RefereeSkillProfile
        from sqlalchemy import select

        for update in updates:
            # Check if profile exists
            result = await self.db.execute(
                select(RefereeSkillProfile).where(RefereeSkillProfile.referee_id == update.actor_id)
            )
            profile = result.scalar_one_or_none()

            if not profile:
                # Create new profile
                profile = RefereeSkillProfile(
                    referee_id=update.actor_id,
                    games_count=1,
                    total_events=1,
                    avg_mechanics_score=update.delta_values.get('mechanics_score', 0.0),
                    avg_visibility_score=update.delta_values.get('visibility_score', 0.0),
                    avg_rotation_quality=update.rotation_efficiency or 0.0,
                    occlusion_avg=update.delta_values.get('occlusion_avg', 0.0),
                    foul_counts_by_type={}
                )
                self.db.add(profile)
            else:
                # Update existing profile (incremental averaging)
                n = profile.games_count
                profile.games_count = n + 1
                profile.total_events += 1

                # Incremental average: new_avg = (old_avg * n + new_value) / (n + 1)
                mechanics = update.delta_values.get('mechanics_score', profile.avg_mechanics_score)
                visibility = update.delta_values.get('visibility_score', profile.avg_visibility_score)
                rotation = update.rotation_efficiency or profile.avg_rotation_quality
                occlusion = update.delta_values.get('occlusion_avg', profile.occlusion_avg)

                profile.avg_mechanics_score = (profile.avg_mechanics_score * n + mechanics) / (n + 1)
                profile.avg_visibility_score = (profile.avg_visibility_score * n + visibility) / (n + 1)
                profile.avg_rotation_quality = (profile.avg_rotation_quality * n + rotation) / (n + 1)
                profile.occlusion_avg = (profile.occlusion_avg * n + occlusion) / (n + 1)

        await self.db.commit()
        logger.info(f"Persisted {len(updates)} referee SkillDNA profiles")

    async def _persist_player_profiles(self, updates: List[PlayerSkillDNAUpdate]):
        """Persist player SkillDNA updates to PlayerSkillProfile table."""
        from ..models import PlayerSkillProfile
        from sqlalchemy import select

        for update in updates:
            result = await self.db.execute(
                select(PlayerSkillProfile).where(PlayerSkillProfile.player_id == update.actor_id)
            )
            profile = result.scalar_one_or_none()

            contact_behavior = update.contact_behavior or {}
            total_fouls = contact_behavior.get('total_fouls', 0)
            fouls_per_100 = contact_behavior.get('fouls_per_100_frames', 0.0)

            if not profile:
                profile = PlayerSkillProfile(
                    player_id=update.actor_id,
                    games_count=1,
                    total_fouls=total_fouls,
                    foul_counts_by_type=update.foul_tendency or {},
                    fouls_per_100_frames=fouls_per_100,
                    avg_decision_quality_score=update.decision_quality or 0.5,
                    risk_index=update.delta_values.get('risk_index', 0.5)
                )
                self.db.add(profile)
            else:
                n = profile.games_count
                profile.games_count = n + 1
                profile.total_fouls += total_fouls

                # Update foul counts
                existing_counts = profile.foul_counts_by_type or {}
                new_counts = update.foul_tendency or {}
                for foul_type, count in new_counts.items():
                    existing_counts[foul_type] = existing_counts.get(foul_type, 0) + count
                profile.foul_counts_by_type = existing_counts

                # Incremental averages
                decision = update.decision_quality or profile.avg_decision_quality_score
                risk = update.delta_values.get('risk_index', profile.risk_index)

                profile.avg_decision_quality_score = (profile.avg_decision_quality_score * n + decision) / (n + 1)
                profile.risk_index = (profile.risk_index * n + risk) / (n + 1)
                profile.fouls_per_100_frames = (profile.total_fouls / profile.games_count)

        await self.db.commit()
        logger.info(f"Persisted {len(updates)} player SkillDNA profiles")

    async def _persist_crew_profile(self, update: CrewSkillDNAUpdate):
        """Persist crew SkillDNA update to CrewSkillProfile table."""
        from ..models import CrewSkillProfile
        from sqlalchemy import select

        result = await self.db.execute(
            select(CrewSkillProfile).where(CrewSkillProfile.crew_id == update.crew_id)
        )
        profile = result.scalar_one_or_none()

        if not profile:
            profile = CrewSkillProfile(
                crew_id=update.crew_id,
                games_count=1,
                avg_rotation_quality=update.avg_rotation_quality,
                avg_fairness_index=update.avg_fairness_index,
                avg_consistency_signal=update.avg_consistency_signal,
                late_rotation_count=update.late_rotations,
                misaligned_rotation_count=update.misaligned_rotations
            )
            self.db.add(profile)
        else:
            n = profile.games_count
            profile.games_count = n + 1
            profile.late_rotation_count += update.late_rotations
            profile.misaligned_rotation_count += update.misaligned_rotations

            # Incremental averages
            profile.avg_rotation_quality = (profile.avg_rotation_quality * n + update.avg_rotation_quality) / (n + 1)
            profile.avg_fairness_index = (profile.avg_fairness_index * n + update.avg_fairness_index) / (n + 1)
            profile.avg_consistency_signal = (profile.avg_consistency_signal * n + update.avg_consistency_signal) / (n + 1)

        await self.db.commit()
        logger.info(f"Persisted crew SkillDNA profile for {update.crew_id}")

    async def _persist_game_summary(self, summary: GameOfficiatingSummaryUpdate):
        """Persist game officiating summary to GameOfficiatingSummary table."""
        from ..models import GameOfficiatingSummary
        from sqlalchemy import select

        result = await self.db.execute(
            select(GameOfficiatingSummary).where(GameOfficiatingSummary.game_id == UUID(summary.game_id))
        )
        existing = result.scalar_one_or_none()

        if not existing:
            game_summary = GameOfficiatingSummary(
                game_id=UUID(summary.game_id),
                events_count=summary.events_count,
                candidate_foul_count=summary.candidate_foul_count,
                ref_mechanics_count=summary.ref_mechanics_count,
                crew_rotation_count=summary.crew_rotation_count,
                fairness_index_avg=summary.fairness_index_avg,
                consistency_signal_avg=summary.consistency_signal_avg,
                regional_coverage_quality=summary.regional_coverage_quality,
                occlusion_frequency=summary.occlusion_frequency
            )
            self.db.add(game_summary)
        else:
            # Update existing
            existing.events_count = summary.events_count
            existing.candidate_foul_count = summary.candidate_foul_count
            existing.ref_mechanics_count = summary.ref_mechanics_count
            existing.crew_rotation_count = summary.crew_rotation_count
            existing.fairness_index_avg = summary.fairness_index_avg
            existing.consistency_signal_avg = summary.consistency_signal_avg
            existing.regional_coverage_quality = summary.regional_coverage_quality
            existing.occlusion_frequency = summary.occlusion_frequency

        await self.db.commit()
        logger.info(f"Persisted game officiating summary for game {summary.game_id}")
