"""
Event Detector - Semantic Officiating Event Detection (Phase 3A v1)

Analyzes detections and tracks to identify candidate fouls, mechanics deviations,
and crew rotations using heuristic-based logic.

Follows PCOS Event Layer standards and SPEC_KIT requirements.
"""
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from pydantic import BaseModel
import uuid
import math
import logging
from collections import defaultdict

logger = logging.getLogger(__name__)


class CandidateFoulEvent(BaseModel):
    """Candidate foul event (block/charge, illegal screen, etc.)"""
    id: str
    event_type: str = "candidate_foul"
    timestamp: float
    frame_number: int
    foul_type: Optional[str] = None  # "block", "charge", "illegal_screen", "contact", etc.
    confidence: float
    actors_involved: List[str]  # Actor IDs
    location: Optional[Dict[str, Any]] = None
    metadata: Dict[str, Any] = {}


class RefMechanicsEvent(BaseModel):
    """Referee mechanics evaluation event"""
    id: str
    event_type: str = "ref_mechanics"
    timestamp: float
    frame_number: int
    official_id: str
    position_score: float
    visibility_score: float
    rotation_correct: bool
    metadata: Dict[str, Any] = {}


class CrewRotationEvent(BaseModel):
    """Crew rotation quality event"""
    id: str
    event_type: str = "crew_rotation"
    timestamp: float
    frame_number: int
    rotation_quality: float
    late: bool
    misaligned: bool
    metadata: Dict[str, Any] = {}


def euclidean_distance(point1: Tuple[float, float], point2: Tuple[float, float]) -> float:
    """Calculate Euclidean distance between two points"""
    return math.sqrt((point1[0] - point2[0])**2 + (point1[1] - point2[1])**2)


def bbox_center(bbox: List[float]) -> Tuple[float, float]:
    """Get center of bounding box [x1, y1, x2, y2]"""
    return ((bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2)


def bbox_area(bbox: List[float]) -> float:
    """Calculate bbox area"""
    return (bbox[2] - bbox[0]) * (bbox[3] - bbox[1])


def bboxes_overlap(bbox1: List[float], bbox2: List[float]) -> float:
    """Calculate overlap ratio between two bboxes"""
    x1_min, y1_min, x1_max, y1_max = bbox1
    x2_min, y2_min, x2_max, y2_max = bbox2

    inter_x_min = max(x1_min, x2_min)
    inter_y_min = max(y1_min, y2_min)
    inter_x_max = min(x1_max, x2_max)
    inter_y_max = min(y1_max, y2_max)

    if inter_x_max < inter_x_min or inter_y_max < inter_y_min:
        return 0.0

    inter_area = (inter_x_max - inter_x_min) * (inter_y_max - inter_y_min)
    area1 = bbox_area(bbox1)
    area2 = bbox_area(bbox2)

    return inter_area / min(area1, area2) if min(area1, area2) > 0 else 0.0


class EventDetector:
    """
    Detects semantic officiating events from perception data.

    Phase 3A v1 Implementation - Heuristic-based:
    - Proximity + overlap detection for fouls
    - Distance + angle metrics for referee mechanics
    - Basic rotation pattern detection

    Future Phases:
    - Phase 3B: Advanced SkillDNA integration
    - Phase 4: Pose-based micro-heuristics
    - Phase 5: ML-based event classification
    """

    # Thresholds (Phase 3A - conservative heuristics)
    PROXIMITY_THRESHOLD_PX = 100  # Pixels - candidate for contact
    CONTACT_OVERLAP_THRESHOLD = 0.15  # 15% overlap = likely contact
    FOUL_CONFIDENCE_BASE = 0.6  # Base confidence for proximity events

    # Referee mechanics thresholds
    OPTIMAL_DISTANCE_TO_PLAY = 200  # pixels - ideal ref distance
    MAX_DISTANCE_TO_PLAY = 500  # pixels - too far
    GOOD_ANGLE_RANGE = (30, 150)  # degrees - good viewing angle

    # Rotation detection
    ROTATION_DISTANCE_THRESHOLD = 300  # pixels - significant movement
    ROTATION_TIME_WINDOW = 90  # frames (~3 seconds at 30fps)

    def __init__(self, game_id: str):
        """
        Initialize event detector.

        Args:
            game_id: Game UUID for database storage
        """
        self.game_id = game_id
        self.events: List[Any] = []
        self.frame_history = defaultdict(list)  # Track frame-by-frame data

    async def detect_fouls(
        self,
        tracks: List[Any],
        frame_number: int,
        timestamp: float
    ) -> List[CandidateFoulEvent]:
        """
        Detect candidate foul situations using proximity + overlap heuristics.

        Phase 3A v1 Heuristics:
        - Proximity: Players within threshold distance
        - Overlap: Bounding boxes overlapping
        - Confidence: Based on proximity + overlap amount

        Args:
            tracks: current frame tracks
            frame_number: frame index
            timestamp: video timestamp

        Returns:
            List of candidate foul events
        """
        foul_events = []

        # Filter player tracks only
        player_tracks = [t for t in tracks if getattr(t, 'actor_type', '') == 'player']

        # Pairwise proximity check
        for i, track1 in enumerate(player_tracks):
            for track2 in player_tracks[i+1:]:
                # Get centers
                center1 = bbox_center(track1.bbox)
                center2 = bbox_center(track2.bbox)

                # Calculate distance
                distance = euclidean_distance(center1, center2)

                # Check proximity
                if distance < self.PROXIMITY_THRESHOLD_PX:
                    # Calculate overlap
                    overlap = bboxes_overlap(track1.bbox, track2.bbox)

                    # Determine foul type and confidence
                    if overlap > self.CONTACT_OVERLAP_THRESHOLD:
                        foul_type = "contact"
                        confidence = self.FOUL_CONFIDENCE_BASE + (overlap * 0.3)
                    else:
                        foul_type = "proximity"
                        confidence = self.FOUL_CONFIDENCE_BASE * (1 - distance / self.PROXIMITY_THRESHOLD_PX)

                    # Create event
                    event = CandidateFoulEvent(
                        id=str(uuid.uuid4()),
                        timestamp=timestamp,
                        frame_number=frame_number,
                        foul_type=foul_type,
                        confidence=min(confidence, 0.95),  # Cap at 95%
                        actors_involved=[str(track1.track_id), str(track2.track_id)],
                        location={
                            "x": (center1[0] + center2[0]) / 2,
                            "y": (center1[1] + center2[1]) / 2
                        },
                        metadata={
                            "distance_px": distance,
                            "overlap_ratio": overlap,
                            "bbox1": track1.bbox,
                            "bbox2": track2.bbox
                        }
                    )
                    foul_events.append(event)

        if foul_events:
            logger.info(f"Frame {frame_number}: Detected {len(foul_events)} candidate foul events")

        return foul_events

    async def evaluate_mechanics(
        self,
        referee_tracks: List[Any],
        player_tracks: List[Any],
        ball_track: Optional[Any],
        frame_number: int,
        timestamp: float
    ) -> List[RefMechanicsEvent]:
        """
        Evaluate referee positioning and mechanics.

        Phase 3A v1 Heuristics:
        - Distance from play (ball or player cluster center)
        - Viewing angle relative to play
        - Optimal distance scoring

        Args:
            referee_tracks: referee positions
            player_tracks: player positions
            ball_track: ball position (if available)
            frame_number: frame index
            timestamp: video timestamp

        Returns:
            List of mechanics evaluation events
        """
        mechanics_events = []

        if not referee_tracks:
            return []

        # Determine "play center" (ball if available, else player cluster center)
        if ball_track:
            play_center = bbox_center(ball_track.bbox)
        elif player_tracks:
            # Average player positions
            player_centers = [bbox_center(t.bbox) for t in player_tracks]
            play_center = (
                sum(c[0] for c in player_centers) / len(player_centers),
                sum(c[1] for c in player_centers) / len(player_centers)
            )
        else:
            return []  # No play to evaluate

        # Evaluate each referee
        for ref_track in referee_tracks:
            ref_center = bbox_center(ref_track.bbox)

            # Calculate distance to play
            distance = euclidean_distance(ref_center, play_center)

            # Calculate position score (0-1, optimal at OPTIMAL_DISTANCE_TO_PLAY)
            if distance <= self.OPTIMAL_DISTANCE_TO_PLAY:
                position_score = 1.0 - (abs(distance - self.OPTIMAL_DISTANCE_TO_PLAY) / self.OPTIMAL_DISTANCE_TO_PLAY)
            else:
                position_score = max(0.0, 1.0 - (distance - self.OPTIMAL_DISTANCE_TO_PLAY) / self.MAX_DISTANCE_TO_PLAY)

            # Calculate viewing angle (simplified - relative to play center)
            # Phase 3B+ will use proper court geometry
            angle_deg = math.degrees(math.atan2(play_center[1] - ref_center[1], play_center[0] - ref_center[0]))
            angle_deg = abs(angle_deg) % 180  # Normalize to 0-180

            # Visibility score (1.0 if within good angle range)
            if self.GOOD_ANGLE_RANGE[0] <= angle_deg <= self.GOOD_ANGLE_RANGE[1]:
                visibility_score = 1.0
            else:
                visibility_score = 0.6  # Suboptimal angle

            # Rotation correct (Phase 3A: assume correct if position/visibility acceptable)
            rotation_correct = position_score > 0.5 and visibility_score > 0.7

            # Create mechanics event
            event = RefMechanicsEvent(
                id=str(uuid.uuid4()),
                timestamp=timestamp,
                frame_number=frame_number,
                official_id=str(ref_track.track_id),
                position_score=position_score,
                visibility_score=visibility_score,
                rotation_correct=rotation_correct,
                metadata={
                    "distance_to_play_px": distance,
                    "viewing_angle_deg": angle_deg,
                    "ref_position": list(ref_center),
                    "play_center": list(play_center)
                }
            )
            mechanics_events.append(event)

        return mechanics_events

    async def detect_rotations(
        self,
        referee_tracks: List[Any],
        frame_number: int,
        timestamp: float
    ) -> List[CrewRotationEvent]:
        """
        Detect crew rotation events and evaluate quality.

        Phase 3A v1 Heuristics:
        - Detect significant referee movement over time window
        - Evaluate if movement indicates rotation
        - Score rotation quality based on distance covered

        Args:
            referee_tracks: referee positions
            frame_number: frame index
            timestamp: video timestamp

        Returns:
            List of crew rotation events
        """
        rotation_events = []

        # Store current referee positions in history
        self.frame_history[frame_number] = {
            'refs': [(str(t.track_id), bbox_center(t.bbox)) for t in referee_tracks],
            'timestamp': timestamp
        }

        # Check for rotation (need history)
        if frame_number < self.ROTATION_TIME_WINDOW:
            return []

        # Compare current positions to positions N frames ago
        past_frame = frame_number - self.ROTATION_TIME_WINDOW
        if past_frame not in self.frame_history:
            return []

        current_refs = {ref_id: pos for ref_id, pos in self.frame_history[frame_number]['refs']}
        past_refs = {ref_id: pos for ref_id, pos in self.frame_history[past_frame]['refs']}

        # Calculate movement for each referee
        movements = []
        for ref_id, current_pos in current_refs.items():
            if ref_id in past_refs:
                past_pos = past_refs[ref_id]
                distance_moved = euclidean_distance(current_pos, past_pos)
                movements.append((ref_id, distance_moved))

        # Detect rotation if at least one ref moved significantly
        significant_movements = [m for m in movements if m[1] > self.ROTATION_DISTANCE_THRESHOLD]

        if significant_movements:
            # Calculate rotation quality
            avg_movement = sum(m[1] for m in significant_movements) / len(significant_movements)
            rotation_quality = min(avg_movement / (self.ROTATION_DISTANCE_THRESHOLD * 2), 1.0)

            # Determine if late or misaligned (Phase 3A: simple heuristics)
            late = avg_movement > self.ROTATION_DISTANCE_THRESHOLD * 1.5  # Moved too much = late
            misaligned = len(significant_movements) < len(current_refs)  # Not all refs rotated

            event = CrewRotationEvent(
                id=str(uuid.uuid4()),
                timestamp=timestamp,
                frame_number=frame_number,
                rotation_quality=rotation_quality,
                late=late,
                misaligned=misaligned,
                metadata={
                    "refs_rotated": len(significant_movements),
                    "total_refs": len(current_refs),
                    "avg_distance_moved_px": avg_movement,
                    "movements": {ref_id: dist for ref_id, dist in movements}
                }
            )
            rotation_events.append(event)

        # Cleanup old history (keep last 200 frames)
        if frame_number > 200:
            del_frame = frame_number - 200
            if del_frame in self.frame_history:
                del self.frame_history[del_frame]

        return rotation_events

    async def process_frame(
        self,
        all_tracks: List[Any],
        frame_number: int,
        timestamp: float
    ) -> List[Any]:
        """
        Process a single frame and generate all event types.

        Args:
            all_tracks: all actor tracks
            frame_number: frame index
            timestamp: video timestamp

        Returns:
            List of all detected events
        """
        events = []

        # Separate tracks by type
        referee_tracks = [t for t in all_tracks if getattr(t, 'actor_type', '') == 'referee']
        player_tracks = [t for t in all_tracks if getattr(t, 'actor_type', '') == 'player']
        ball_tracks = [t for t in all_tracks if getattr(t, 'actor_type', '') == 'ball']
        ball_track = ball_tracks[0] if ball_tracks else None

        # Detect fouls
        foul_events = await self.detect_fouls(player_tracks, frame_number, timestamp)
        events.extend(foul_events)

        # Evaluate mechanics (sample every N frames to reduce noise)
        if frame_number % 30 == 0:  # Every 30 frames (~1 second)
            mechanics_events = await self.evaluate_mechanics(
                referee_tracks, player_tracks, ball_track, frame_number, timestamp
            )
            events.extend(mechanics_events)

        # Detect rotations (check periodically)
        if frame_number % 30 == 0:
            rotation_events = await self.detect_rotations(referee_tracks, frame_number, timestamp)
            events.extend(rotation_events)

        return events


# TODO Phase 3B+:
# - Add velocity-based foul detection (block vs charge differentiation)
# - Add court geometry awareness (zones, paint, three-point line)
# - Add temporal patterns (sequence of events)
# - Add pose-based mechanics (whistle position, hand signals)
# - Add ML-based event classification
# - Add SkillDNA integration for personalized scoring
