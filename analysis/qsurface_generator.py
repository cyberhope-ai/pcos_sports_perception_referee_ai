"""
QSurface Generator - Multi-Perspective Event Interpretation (Phase 3A v1)

Generates QSurfaces (Referee, Coach, Player, League perspectives) for each event.

Phase 3A v1 Implementation:
- Heuristic-based metrics from EventDetector data
- Basic tactical analysis for coaches
- Simple decision quality scoring for players
- Aggregate fairness metrics for league

Phase 4+: Advanced SkillDNA integration, ML-based scoring
"""
from typing import List, Dict, Any, Optional, Tuple
from pydantic import BaseModel
import uuid
import logging
import math
from collections import defaultdict

logger = logging.getLogger(__name__)


class RefereeQSurface(BaseModel):
    """Referee perspective surface"""
    id: str
    surface_type: str = "referee_view"
    event_id: str
    persona_id: str  # Official ID
    call_made: Optional[str] = None
    correct_call: Optional[str] = None
    mechanics_score: float = 0.0
    visibility_score: float = 0.0
    positioning_vector: List[float] = []
    metadata: Dict[str, Any] = {}


class CoachQSurface(BaseModel):
    """Coach perspective surface"""
    id: str
    surface_type: str = "coach_view"
    event_id: str
    persona_id: str
    offensive_structure: Optional[str] = None
    defensive_structure: Optional[str] = None
    impact_on_possession: Optional[str] = None
    metadata: Dict[str, Any] = {}


class PlayerQSurface(BaseModel):
    """Player perspective surface"""
    id: str
    surface_type: str = "player_view"
    event_id: str
    persona_id: str
    decision_quality_score: float = 0.0
    risk_factor: float = 0.0
    foul_tendency_update: Optional[Dict[str, float]] = None
    metadata: Dict[str, Any] = {}


class LeagueQSurface(BaseModel):
    """League/governance perspective surface"""
    id: str
    surface_type: str = "league_view"
    event_id: str
    persona_id: str = "league"
    fairness_index: float = 0.0
    consistency_signal: float = 0.0
    crew_score_update: Optional[Dict[str, float]] = None
    metadata: Dict[str, Any] = {}


# Helper functions
def bbox_center(bbox: List[float]) -> Tuple[float, float]:
    """Get center of bounding box [x1, y1, x2, y2]"""
    return ((bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2)


def euclidean_distance(point1: Tuple[float, float], point2: Tuple[float, float]) -> float:
    """Calculate Euclidean distance between two points"""
    return math.sqrt((point1[0] - point2[0])**2 + (point1[1] - point2[1])**2)


def calculate_player_clustering(player_tracks: List[Any]) -> Dict[str, Any]:
    """
    Calculate player clustering metrics for tactical analysis.

    Phase 3A v1: Simple centroid-based clustering
    Phase 4+: Advanced formation detection

    Returns:
        Dict with clustering metrics
    """
    if len(player_tracks) < 2:
        return {"cluster_tightness": 0.0, "avg_distance": 0.0, "num_clusters": 0}

    # Get player centers
    centers = [bbox_center(t.bbox) for t in player_tracks if hasattr(t, 'bbox')]

    if not centers:
        return {"cluster_tightness": 0.0, "avg_distance": 0.0, "num_clusters": 0}

    # Calculate average pairwise distance
    distances = []
    for i, c1 in enumerate(centers):
        for c2 in centers[i+1:]:
            distances.append(euclidean_distance(c1, c2))

    avg_distance = sum(distances) / len(distances) if distances else 0.0

    # Tightness score (inverse of average distance, normalized)
    # Lower distance = tighter formation = higher score
    cluster_tightness = max(0.0, 1.0 - (avg_distance / 500.0))  # 500px = very spread out

    return {
        "cluster_tightness": cluster_tightness,
        "avg_distance": avg_distance,
        "num_clusters": 1  # Phase 3A: simple single cluster
    }


class QSurfaceGenerator:
    """
    Generates multi-perspective QSurfaces from events.

    Phase 3A v1 Implementation:
    - RefereeQSurface: Uses RefMechanicsEvent metrics directly
    - CoachQSurface: Basic formation/clustering analysis
    - PlayerQSurface: Proximity-based decision quality
    - LeagueQSurface: Aggregate fairness metrics

    Phase 4+:
    - Advanced SkillDNA integration
    - ML-based scoring
    - Cross-game consistency tracking
    - Pose-based micro-analysis
    """

    async def generate_referee_surface(
        self,
        event: Any,
        official_track: Optional[Any] = None,
        player_tracks: Optional[List[Any]] = None
    ) -> RefereeQSurface:
        """
        Generate RefereeQSurface from RefMechanicsEvent.

        Phase 3A v1:
        - Extracts position_score and visibility_score from RefMechanicsEvent
        - Computes positioning_vector from metadata
        - Evaluates rotation correctness

        Args:
            event: RefMechanicsEvent or other event type
            official_track: Optional referee track data
            player_tracks: Optional player track data

        Returns:
            RefereeQSurface with computed metrics
        """
        event_type = getattr(event, 'event_type', 'unknown')

        # For RefMechanicsEvent, extract scores directly
        if event_type == 'ref_mechanics':
            mechanics_score = getattr(event, 'position_score', 0.5)
            visibility_score = getattr(event, 'visibility_score', 0.5)
            official_id = getattr(event, 'official_id', 'unknown')

            # Extract positioning vector from metadata
            metadata = getattr(event, 'metadata', {})
            ref_position = metadata.get('ref_position', [0.0, 0.0])
            distance_to_play = metadata.get('distance_to_play_px', 0.0)

            # 3D positioning vector: [x, y, quality_score]
            positioning_vector = [
                ref_position[0] if len(ref_position) > 0 else 0.0,
                ref_position[1] if len(ref_position) > 1 else 0.0,
                (mechanics_score + visibility_score) / 2  # Overall positioning quality
            ]

            rotation_correct = getattr(event, 'rotation_correct', False)

        else:
            # For other event types, use default/placeholder values
            mechanics_score = 0.5
            visibility_score = 0.5
            official_id = str(getattr(official_track, 'track_id', 'unknown')) if official_track else 'unknown'
            positioning_vector = [0.0, 0.0, 0.5]
            rotation_correct = False

        return RefereeQSurface(
            id=str(uuid.uuid4()),
            event_id=getattr(event, 'id', 'unknown'),
            persona_id=str(official_id),
            mechanics_score=mechanics_score,
            visibility_score=visibility_score,
            positioning_vector=positioning_vector,
            call_made=None,  # Phase 4+: whistle detection
            correct_call=None,  # Phase 4+: AI correctness evaluation
            metadata={
                "rotation_correct": rotation_correct,
                "event_type": event_type
            }
        )

    async def generate_coach_surface(
        self,
        event: Any,
        player_tracks: List[Any]
    ) -> CoachQSurface:
        """
        Generate CoachQSurface with basic tactical analysis.

        Phase 3A v1:
        - Player clustering metrics (tight vs spread formation)
        - Contact/proximity impact on possession flow
        - Basic offensive/defensive structure identification

        Phase 4+:
        - Advanced formation recognition
        - Play sequence detection
        - Strategic pattern analysis

        Args:
            event: Any event type
            player_tracks: List of player tracks

        Returns:
            CoachQSurface with tactical metrics
        """
        event_type = getattr(event, 'event_type', 'unknown')

        # Calculate player clustering
        clustering_metrics = calculate_player_clustering(player_tracks)

        # Determine structure based on clustering (Phase 3A: simple heuristic)
        cluster_tightness = clustering_metrics['cluster_tightness']

        if cluster_tightness > 0.7:
            offensive_structure = "tight_formation"  # Players clustered
            defensive_structure = "zone_defense"
        elif cluster_tightness > 0.4:
            offensive_structure = "balanced_spread"
            defensive_structure = "mixed_coverage"
        else:
            offensive_structure = "wide_spread"
            defensive_structure = "man_to_man"

        # Impact on possession (based on event type)
        if event_type == 'candidate_foul':
            foul_type = getattr(event, 'foul_type', 'unknown')
            if foul_type == 'contact':
                impact_on_possession = "disruption_likely"  # Contact disrupts flow
            else:
                impact_on_possession = "minimal_impact"
        elif event_type == 'crew_rotation':
            impact_on_possession = "neutral"  # Rotations don't affect possession
        else:
            impact_on_possession = "neutral"

        return CoachQSurface(
            id=str(uuid.uuid4()),
            event_id=getattr(event, 'id', 'unknown'),
            persona_id="coach",
            offensive_structure=offensive_structure,
            defensive_structure=defensive_structure,
            impact_on_possession=impact_on_possession,
            metadata={
                "cluster_tightness": cluster_tightness,
                "avg_player_distance": clustering_metrics['avg_distance'],
                "num_players_analyzed": len(player_tracks),
                "event_type": event_type
            }
        )

    async def generate_player_surface(
        self,
        event: Any,
        player_track: Any
    ) -> PlayerQSurface:
        """
        Generate PlayerQSurface with decision quality analysis.

        Phase 3A v1:
        - Proximity-based decision quality (involvement in fouls)
        - Risk factor based on contact confidence
        - Simple foul tendency tracking

        Phase 4+:
        - Advanced decision tree analysis
        - Behavioral pattern recognition
        - SkillDNA-personalized scoring

        Args:
            event: Any event type
            player_track: Player track data

        Returns:
            PlayerQSurface with player metrics
        """
        event_type = getattr(event, 'event_type', 'unknown')
        player_id = str(getattr(player_track, 'track_id', 'unknown'))

        # Default scores
        decision_quality_score = 0.7  # Neutral/good decision
        risk_factor = 0.3  # Low risk

        # Adjust based on event type
        if event_type == 'candidate_foul':
            # Check if this player was involved
            actors_involved = getattr(event, 'actors_involved', [])

            if str(player_id) in [str(a) for a in actors_involved]:
                # Player involved in foul event
                foul_type = getattr(event, 'foul_type', 'unknown')
                confidence = getattr(event, 'confidence', 0.5)

                if foul_type == 'contact':
                    # Direct contact = higher risk, lower decision quality
                    decision_quality_score = 0.3  # Poor decision (made contact)
                    risk_factor = 0.7 + (confidence * 0.2)  # High risk
                elif foul_type == 'proximity':
                    # Close proximity = moderate risk
                    decision_quality_score = 0.5  # Marginal decision
                    risk_factor = 0.5 + (confidence * 0.1)  # Moderate risk
                else:
                    decision_quality_score = 0.6
                    risk_factor = 0.4

                # Foul tendency update (increment contact count)
                foul_tendency_update = {
                    foul_type: 1.0  # Increment by 1
                }
            else:
                # Not involved = neutral
                foul_tendency_update = None

        else:
            foul_tendency_update = None

        return PlayerQSurface(
            id=str(uuid.uuid4()),
            event_id=getattr(event, 'id', 'unknown'),
            persona_id=player_id,
            decision_quality_score=decision_quality_score,
            risk_factor=min(risk_factor, 1.0),  # Cap at 1.0
            foul_tendency_update=foul_tendency_update,
            metadata={
                "event_type": event_type,
                "involved_in_event": str(player_id) in [str(a) for a in getattr(event, 'actors_involved', [])]
            }
        )

    async def generate_league_surface(
        self,
        event: Any,
        all_tracks: List[Any]
    ) -> LeagueQSurface:
        """
        Generate LeagueQSurface with governance metrics.

        Phase 3A v1:
        - Fairness index based on referee mechanics scores
        - Consistency signal from rotation patterns
        - Crew performance aggregation

        Phase 4+:
        - Cross-game consistency tracking
        - Historical pattern analysis
        - League-wide fairness benchmarking

        Args:
            event: Any event type
            all_tracks: All actor tracks

        Returns:
            LeagueQSurface with governance metrics
        """
        event_type = getattr(event, 'event_type', 'unknown')

        # Default scores
        fairness_index = 0.7  # Neutral fairness
        consistency_signal = 0.7  # Neutral consistency
        crew_score_update = {}

        # Calculate based on event type
        if event_type == 'ref_mechanics':
            # Fairness = how well positioned the ref was
            position_score = getattr(event, 'position_score', 0.5)
            visibility_score = getattr(event, 'visibility_score', 0.5)

            # Higher scores = fairer officiating (better position/visibility)
            fairness_index = (position_score + visibility_score) / 2

            # Consistency = rotation correctness
            rotation_correct = getattr(event, 'rotation_correct', False)
            consistency_signal = 1.0 if rotation_correct else 0.5

            # Update crew score
            official_id = getattr(event, 'official_id', 'unknown')
            crew_score_update = {
                str(official_id): fairness_index
            }

        elif event_type == 'crew_rotation':
            # Fairness = rotation quality (smooth rotations = fairer coverage)
            rotation_quality = getattr(event, 'rotation_quality', 0.5)
            fairness_index = rotation_quality

            # Consistency = not late and not misaligned
            late = getattr(event, 'late', False)
            misaligned = getattr(event, 'misaligned', False)

            if not late and not misaligned:
                consistency_signal = 1.0  # Perfect rotation
            elif late or misaligned:
                consistency_signal = 0.5  # Suboptimal rotation
            else:
                consistency_signal = 0.3  # Poor rotation

            # Aggregate crew score from metadata
            metadata = getattr(event, 'metadata', {})
            movements = metadata.get('movements', {})
            if movements:
                # Average all referee movement scores
                avg_crew_score = sum(movements.values()) / len(movements) if movements else 0.5
                crew_score_update = {"crew_aggregate": avg_crew_score / 500.0}  # Normalize

        elif event_type == 'candidate_foul':
            # Fairness = inverse of foul confidence (lower confidence = more ambiguous = less fair)
            confidence = getattr(event, 'confidence', 0.5)
            fairness_index = 1.0 - confidence  # High confidence foul = less fair for involved player

            # Consistency = neutral for fouls (Phase 3A)
            consistency_signal = 0.7

        return LeagueQSurface(
            id=str(uuid.uuid4()),
            event_id=getattr(event, 'id', 'unknown'),
            fairness_index=fairness_index,
            consistency_signal=consistency_signal,
            crew_score_update=crew_score_update if crew_score_update else None,
            metadata={
                "event_type": event_type,
                "num_officials": len([t for t in all_tracks if getattr(t, 'actor_type', '') == 'referee']),
                "num_players": len([t for t in all_tracks if getattr(t, 'actor_type', '') == 'player'])
            }
        )

    async def generate_all_surfaces(
        self,
        event: Any,
        all_tracks: List[Any]
    ) -> List[Any]:
        """
        Generate all four QSurface types for an event.

        Phase 3A v1:
        - Generates surfaces based on event type
        - RefereeQSurface for each official (or one per ref_mechanics event)
        - CoachQSurface (one per event)
        - PlayerQSurface for involved players
        - LeagueQSurface (one per event)

        Args:
            event: PCOSEvent (CandidateFoulEvent, RefMechanicsEvent, CrewRotationEvent)
            all_tracks: all actor tracks

        Returns:
            List of all generated QSurfaces
        """
        surfaces = []
        event_type = getattr(event, 'event_type', 'unknown')

        # Separate tracks by actor type
        referee_tracks = [t for t in all_tracks if getattr(t, 'actor_type', '') == 'referee']
        player_tracks = [t for t in all_tracks if getattr(t, 'actor_type', '') == 'player']

        # Generate referee surfaces
        if event_type == 'ref_mechanics':
            # RefMechanicsEvent already has official_id - generate one surface
            ref_surface = await self.generate_referee_surface(event, None, player_tracks)
            surfaces.append(ref_surface)
        elif referee_tracks:
            # Generate surface for each referee
            for ref_track in referee_tracks:
                ref_surface = await self.generate_referee_surface(event, ref_track, player_tracks)
                surfaces.append(ref_surface)

        # Generate coach surface (always generated)
        if player_tracks:
            coach_surface = await self.generate_coach_surface(event, player_tracks)
            surfaces.append(coach_surface)

        # Generate player surfaces
        if event_type == 'candidate_foul':
            # Only for involved players
            actors_involved = getattr(event, 'actors_involved', [])
            involved_player_tracks = [
                t for t in player_tracks
                if str(getattr(t, 'track_id', '')) in [str(a) for a in actors_involved]
            ]

            for player_track in involved_player_tracks:
                player_surface = await self.generate_player_surface(event, player_track)
                surfaces.append(player_surface)
        elif player_tracks:
            # For other events, generate for first 2 players (proximity-based)
            for player_track in player_tracks[:2]:
                player_surface = await self.generate_player_surface(event, player_track)
                surfaces.append(player_surface)

        # Generate league surface (always generated)
        league_surface = await self.generate_league_surface(event, all_tracks)
        surfaces.append(league_surface)

        logger.debug(f"Generated {len(surfaces)} QSurfaces for event {getattr(event, 'id', 'unknown')}")
        return surfaces
