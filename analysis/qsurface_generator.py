"""
QSurface Generator - Multi-Perspective Event Interpretation (Phase 3B-1)

Generates QSurfaces (Referee, Coach, Player, League perspectives) for each event.

Phase 3A v1 Implementation:
- Heuristic-based metrics from EventDetector data
- Basic tactical analysis for coaches
- Simple decision quality scoring for players
- Aggregate fairness metrics for league

Phase 3B-1 Enhancements:
- RefereeQSurface: Occlusion factors, foul proximity, regional assignment, 4D positioning vectors
- CoachQSurface: Distance-based formation inference, spacing quality, variance analysis
- PlayerQSurface: Velocity-aware decision quality, frequency-based risk factors, foul history tracking
- LeagueQSurface: Weighted fairness index, regional coverage consistency, crew performance aggregation

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

        Phase 3B-1 Enhancements:
        - Added occlusion_factor from Phase 3B-1 metadata
        - Added foul_proximity calculation (inverse distance to nearest foul)
        - Added region_assignment from metadata
        - Enhanced positioning_vector with occlusion_penalty

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

            # Phase 3B-1: Extract enhanced metadata fields
            occlusion_factor = metadata.get('occlusion_factor', 0.0)
            region_assignment = metadata.get('ref_region', 0)
            is_occluded = metadata.get('is_occluded', False)
            num_occluding_players = metadata.get('num_occluding_players', 0)

            # Phase 3B-1: Calculate occlusion penalty for positioning quality
            occlusion_penalty = occlusion_factor  # 0.0 to 1.0 (higher = worse)

            # Phase 3B-1: Enhanced positioning vector: [x, y, quality_score, occlusion_penalty]
            quality_score = (mechanics_score + visibility_score) / 2
            positioning_vector = [
                ref_position[0] if len(ref_position) > 0 else 0.0,
                ref_position[1] if len(ref_position) > 1 else 0.0,
                quality_score,  # Overall positioning quality
                occlusion_penalty  # Phase 3B-1: occlusion penalty
            ]

            rotation_correct = getattr(event, 'rotation_correct', False)

            logger.debug(
                f"RefereeQSurface: official={official_id}, region={region_assignment}, "
                f"occlusion_factor={occlusion_factor:.2f}, quality={quality_score:.2f}"
            )

        else:
            # For other event types, use default/placeholder values
            mechanics_score = 0.5
            visibility_score = 0.5
            official_id = str(getattr(official_track, 'track_id', 'unknown')) if official_track else 'unknown'
            positioning_vector = [0.0, 0.0, 0.5, 0.0]  # Phase 3B-1: added occlusion_penalty
            rotation_correct = False
            occlusion_factor = 0.0
            region_assignment = 0
            is_occluded = False
            num_occluding_players = 0

        # Phase 3B-1: Calculate foul_proximity (inverse distance to nearest foul event)
        # This requires checking if there are recent foul events in the system
        # For now, use placeholder logic (Phase 4+ will integrate with event history)
        foul_proximity = 0.0  # Default: no nearby fouls
        event_metadata = getattr(event, 'metadata', {})
        if 'nearest_foul_distance_px' in event_metadata:
            # If event detector provides nearest foul distance
            nearest_foul_dist = event_metadata['nearest_foul_distance_px']
            if nearest_foul_dist > 0:
                # Inverse distance: closer fouls = higher proximity score
                foul_proximity = max(0.0, 1.0 - (nearest_foul_dist / 500.0))  # Normalize to 500px
                logger.debug(f"Foul proximity calculated: {foul_proximity:.2f} (distance={nearest_foul_dist:.1f}px)")

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
                "event_type": event_type,
                # Phase 3B-1: Enhanced metadata fields
                "occlusion_factor": occlusion_factor,
                "foul_proximity": foul_proximity,
                "region_assignment": region_assignment,
                "is_occluded": is_occluded,
                "num_occluding_players": num_occluding_players,
                "occlusion_penalty": positioning_vector[3] if len(positioning_vector) > 3 else 0.0
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

        Phase 3B-1 Enhancements:
        - Enhanced formation inference using avg_distance thresholds
        - Added spacing_quality field (variance-based)
        - Added defensive_structure analysis based on clustering

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

        # Phase 3B-1: Enhanced formation inference using avg_distance thresholds
        avg_distance = clustering_metrics['avg_distance']
        cluster_tightness = clustering_metrics['cluster_tightness']

        # Phase 3B-1: Distance-based formation classification
        if avg_distance < 200:
            offensive_structure = "tight_formation"  # tight < 200px
            defensive_structure = "zone_defense"
        elif 200 <= avg_distance <= 350:
            offensive_structure = "balanced_spread"  # 200-350px
            defensive_structure = "mixed_coverage"
        else:  # > 350px
            offensive_structure = "wide_spread"
            defensive_structure = "man_to_man"

        logger.debug(
            f"CoachQSurface: avg_distance={avg_distance:.1f}px, "
            f"formation={offensive_structure}, defensive={defensive_structure}"
        )

        # Phase 3B-1: Calculate spacing_quality (1.0 - variance/max_variance)
        # Calculate variance in pairwise distances
        if len(player_tracks) >= 2:
            centers = [bbox_center(t.bbox) for t in player_tracks if hasattr(t, 'bbox')]
            distances = []
            for i, c1 in enumerate(centers):
                for c2 in centers[i+1:]:
                    distances.append(euclidean_distance(c1, c2))

            if distances:
                mean_distance = sum(distances) / len(distances)
                variance = sum((d - mean_distance)**2 for d in distances) / len(distances)
                max_variance = 50000.0  # Empirical max variance for normalization (500px spread)

                # Spacing quality: lower variance = better spacing
                spacing_quality = max(0.0, 1.0 - (variance / max_variance))
                logger.debug(f"Spacing quality: {spacing_quality:.2f} (variance={variance:.1f})")
            else:
                spacing_quality = 0.5  # Neutral if can't calculate
        else:
            spacing_quality = 0.5  # Neutral for too few players

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
                "avg_player_distance": avg_distance,
                "num_players_analyzed": len(player_tracks),
                "event_type": event_type,
                # Phase 3B-1: Enhanced metadata
                "spacing_quality": spacing_quality,
                "formation_classification_method": "distance_threshold",
                "avg_distance_threshold_used": "tight<200, balanced=200-350, wide>350"
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

        Phase 3B-1 Enhancements:
        - Frequency-based risk_factor calculation (fouls_per_100_frames * type_weights)
        - Enhanced decision_quality_score with velocity awareness
        - Foul tendency tracking over time with metadata

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

        # Phase 3B-1: Extract velocity data from event metadata
        event_metadata = getattr(event, 'metadata', {})
        player_speed = 0.0
        player_velocity = [0.0, 0.0]

        # Adjust based on event type
        if event_type == 'candidate_foul':
            # Check if this player was involved
            actors_involved = getattr(event, 'actors_involved', [])

            if str(player_id) in [str(a) for a in actors_involved]:
                # Player involved in foul event
                foul_type = getattr(event, 'foul_type', 'unknown')
                confidence = getattr(event, 'confidence', 0.5)

                # Phase 3B-1: Extract player velocity from metadata
                # Determine which player this is (player1 or player2)
                if len(actors_involved) >= 2:
                    if str(player_id) == str(actors_involved[0]):
                        player_velocity = event_metadata.get('player1_velocity', [0.0, 0.0])
                        player_speed = event_metadata.get('player1_speed', 0.0)
                    elif str(player_id) == str(actors_involved[1]):
                        player_velocity = event_metadata.get('player2_velocity', [0.0, 0.0])
                        player_speed = event_metadata.get('player2_speed', 0.0)

                # Phase 3B-1: Enhanced decision quality with velocity awareness
                # High speed during contact = worse decision quality
                speed_penalty = min(player_speed / 50.0, 0.3)  # Up to 0.3 penalty for high speed

                if foul_type == 'contact':
                    # Direct contact = higher risk, lower decision quality
                    decision_quality_score = max(0.1, 0.3 - speed_penalty)  # Worse with higher speed
                    risk_factor = 0.7 + (confidence * 0.2)  # High risk
                elif foul_type == 'proximity':
                    # Close proximity = moderate risk
                    decision_quality_score = max(0.2, 0.5 - speed_penalty)
                    risk_factor = 0.5 + (confidence * 0.1)  # Moderate risk
                elif foul_type in ['block', 'charge', 'illegal_screen', 'shooting_foul']:
                    # Phase 3B-1: Advanced foul types
                    decision_quality_score = max(0.1, 0.4 - speed_penalty)
                    risk_factor = 0.6 + (confidence * 0.2)
                else:
                    decision_quality_score = max(0.3, 0.6 - speed_penalty)
                    risk_factor = 0.4

                logger.debug(
                    f"PlayerQSurface: player={player_id}, foul={foul_type}, "
                    f"speed={player_speed:.1f}px/frame, decision_quality={decision_quality_score:.2f}"
                )

                # Phase 3B-1: Enhanced foul tendency tracking
                # Track foul_history in metadata for frequency-based risk calculation
                foul_tendency_update = {
                    foul_type: 1.0  # Increment by 1
                }
            else:
                # Not involved = neutral
                foul_tendency_update = None

        else:
            foul_tendency_update = None

        # Phase 3B-1: Frequency-based risk_factor calculation
        # This requires tracking foul_history over time (Phase 4+ will integrate with database)
        # For now, use event-level risk_factor
        # Formula: fouls_per_100_frames * type_weights
        # Placeholder for Phase 3B-1: assume we have foul_history in player_track metadata
        foul_history = getattr(player_track, 'foul_history', {})
        if foul_history:
            # Type weights for different foul types
            type_weights = {
                'contact': 1.0,
                'block': 0.9,
                'charge': 0.8,
                'illegal_screen': 0.85,
                'shooting_foul': 0.95,
                'proximity': 0.5
            }

            # Calculate weighted foul frequency
            total_frames = getattr(player_track, 'total_frames_tracked', 100)
            fouls_per_100 = 0.0

            for foul_type_key, count in foul_history.items():
                weight = type_weights.get(foul_type_key, 0.6)
                fouls_per_100 += (count / total_frames) * 100 * weight

            # Update risk_factor based on history
            frequency_risk = min(fouls_per_100 / 10.0, 0.5)  # Cap at 0.5 from frequency
            risk_factor = min(risk_factor + frequency_risk, 1.0)

            logger.debug(f"Risk factor adjusted by history: {frequency_risk:.2f} (fouls_per_100={fouls_per_100:.2f})")

        return PlayerQSurface(
            id=str(uuid.uuid4()),
            event_id=getattr(event, 'id', 'unknown'),
            persona_id=player_id,
            decision_quality_score=decision_quality_score,
            risk_factor=min(risk_factor, 1.0),  # Cap at 1.0
            foul_tendency_update=foul_tendency_update,
            metadata={
                "event_type": event_type,
                "involved_in_event": str(player_id) in [str(a) for a in getattr(event, 'actors_involved', [])],
                # Phase 3B-1: Enhanced metadata
                "player_velocity": player_velocity,
                "player_speed": player_speed,
                "speed_penalty_applied": min(player_speed / 50.0, 0.3) if player_speed > 0 else 0.0,
                "foul_history": foul_history if foul_history else {}
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

        Phase 3B-1 Enhancements:
        - Compute fairness_index as weighted average (mechanics*0.4 + visibility*0.35 + rotation*0.25)
        - Enhanced consistency_signal using regional coverage metrics
        - Added crew_performance_aggregate from rotation metadata

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
            # Phase 3B-1: Enhanced fairness calculation
            # Formula: mechanics_score * 0.4 + visibility_score * 0.35 + rotation_correct * 0.25
            position_score = getattr(event, 'position_score', 0.5)
            visibility_score = getattr(event, 'visibility_score', 0.5)
            rotation_correct = getattr(event, 'rotation_correct', False)

            # Rotation score: 1.0 if correct, 0.3 if not
            rotation_score = 1.0 if rotation_correct else 0.3

            # Phase 3B-1: Weighted fairness index
            fairness_index = (
                position_score * 0.4 +
                visibility_score * 0.35 +
                rotation_score * 0.25
            )

            # Phase 3B-1: Enhanced consistency signal using regional coverage
            metadata = getattr(event, 'metadata', {})
            regions_covered = metadata.get('regions_covered_last_30', 1)

            # Good consistency = covering multiple regions + good rotation
            if rotation_correct and regions_covered >= 2:
                consistency_signal = 1.0  # Excellent coverage
            elif rotation_correct or regions_covered >= 2:
                consistency_signal = 0.8  # Good coverage
            else:
                consistency_signal = 0.5  # Suboptimal coverage

            logger.debug(
                f"LeagueQSurface (ref_mechanics): fairness={fairness_index:.2f}, "
                f"consistency={consistency_signal:.2f}, regions_covered={regions_covered}"
            )

            # Update crew score
            official_id = getattr(event, 'official_id', 'unknown')
            crew_score_update = {
                str(official_id): fairness_index
            }

        elif event_type == 'crew_rotation':
            # Phase 3B-1: Enhanced fairness using rotation metadata
            rotation_quality = getattr(event, 'rotation_quality', 0.5)
            metadata = getattr(event, 'metadata', {})

            # Extract Phase 3B-1 rotation metrics
            movement_quality = metadata.get('movement_quality', 0.5)
            coverage_quality = metadata.get('coverage_quality', 0.5)
            regional_balance = metadata.get('regional_balance_score', 0.5)

            # Enhanced fairness: weighted combination of all rotation metrics
            fairness_index = (
                rotation_quality * 0.5 +
                coverage_quality * 0.3 +
                regional_balance * 0.2
            )

            # Phase 3B-1: Enhanced consistency using regional coverage
            late = getattr(event, 'late', False)
            misaligned = getattr(event, 'misaligned', False)
            regions_covered_current = metadata.get('regions_covered_current', [])
            systematic_miscoverage = metadata.get('systematic_miscoverage_count', 0)

            # Good consistency = no late/misaligned + good regional coverage
            if not late and not misaligned and systematic_miscoverage == 0:
                consistency_signal = 1.0  # Perfect rotation and coverage
            elif not late and not misaligned:
                consistency_signal = 0.8  # Good rotation, some coverage gaps
            elif systematic_miscoverage > 2:
                consistency_signal = 0.4  # Poor coverage (multiple uncovered regions)
            else:
                consistency_signal = 0.6  # Suboptimal rotation

            logger.debug(
                f"LeagueQSurface (crew_rotation): fairness={fairness_index:.2f}, "
                f"consistency={consistency_signal:.2f}, miscoverage={systematic_miscoverage}"
            )

            # Phase 3B-1: Enhanced crew_performance_aggregate from rotation metadata
            movements = metadata.get('movements', {})
            if movements:
                # Average movement quality across all refs
                avg_movement = sum(movements.values()) / len(movements) if movements else 0.0

                # Crew performance combines movement, coverage, and balance
                crew_performance = (
                    min(avg_movement / 300.0, 1.0) * 0.4 +  # Normalize movement to 300px
                    coverage_quality * 0.35 +
                    regional_balance * 0.25
                )

                crew_score_update = {
                    "crew_aggregate": crew_performance,
                    "crew_movement_quality": movement_quality,
                    "crew_coverage_quality": coverage_quality,
                    "crew_regional_balance": regional_balance
                }

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
                "num_players": len([t for t in all_tracks if getattr(t, 'actor_type', '') == 'player']),
                # Phase 3B-1: Enhanced metadata
                "fairness_calculation_method": "weighted_average" if event_type in ['ref_mechanics', 'crew_rotation'] else "default",
                "consistency_includes_regional_coverage": event_type in ['ref_mechanics', 'crew_rotation']
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
