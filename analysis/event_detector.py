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


# Phase 3B-1: Velocity calculation helpers
def calculate_velocity(
    current_position: Tuple[float, float],
    track_history: List[Tuple[int, Tuple[float, float]]],
    frames_window: int = 5
) -> Tuple[float, float]:
    """
    Calculate velocity (dx/dt, dy/dt) from position history.

    Phase 3B-1: Uses 5-frame window for velocity calculation

    Args:
        current_position: current (x, y) position
        track_history: List of (frame_number, (x, y)) tuples
        frames_window: Number of frames to look back (default 5)

    Returns:
        (velocity_x, velocity_y) in pixels/frame
    """
    if not track_history or len(track_history) < 2:
        return (0.0, 0.0)

    # Get positions from last N frames
    recent_history = track_history[-frames_window:]

    if len(recent_history) < 2:
        return (0.0, 0.0)

    # Calculate average velocity over window
    start_frame, start_pos = recent_history[0]
    end_frame, end_pos = recent_history[-1]

    frame_delta = end_frame - start_frame

    if frame_delta == 0:
        return (0.0, 0.0)

    velocity_x = (end_pos[0] - start_pos[0]) / frame_delta
    velocity_y = (end_pos[1] - start_pos[1]) / frame_delta

    return (velocity_x, velocity_y)


def calculate_speed(velocity: Tuple[float, float]) -> float:
    """
    Calculate scalar speed from velocity vector.

    Args:
        velocity: (vx, vy) velocity tuple

    Returns:
        Speed in pixels/frame
    """
    return math.sqrt(velocity[0]**2 + velocity[1]**2)


def velocity_angle(velocity: Tuple[float, float]) -> float:
    """
    Calculate angle of velocity vector in degrees.

    Args:
        velocity: (vx, vy) velocity tuple

    Returns:
        Angle in degrees (0-360)
    """
    angle_rad = math.atan2(velocity[1], velocity[0])
    angle_deg = math.degrees(angle_rad)
    return angle_deg % 360


# Phase 3B-1: Occlusion detection helpers
def line_bbox_intersection(
    line_start: Tuple[float, float],
    line_end: Tuple[float, float],
    bbox: List[float]
) -> bool:
    """
    Check if a line segment intersects with a bounding box.

    Phase 3B-1: Simple line-bbox intersection for occlusion detection

    Args:
        line_start: (x, y) start point
        line_end: (x, y) end point
        bbox: [x1, y1, x2, y2] bounding box

    Returns:
        True if line intersects bbox
    """
    x1, y1 = line_start
    x2, y2 = line_end
    bbox_x1, bbox_y1, bbox_x2, bbox_y2 = bbox

    # Check if either endpoint is inside bbox
    if (bbox_x1 <= x1 <= bbox_x2 and bbox_y1 <= y1 <= bbox_y2) or \
       (bbox_x1 <= x2 <= bbox_x2 and bbox_y1 <= y2 <= bbox_y2):
        return True

    # Check if line crosses bbox boundaries (simplified Liang-Barsky)
    # For Phase 3B-1, use simple center-based approximation
    center_x = (bbox_x1 + bbox_x2) / 2
    center_y = (bbox_y1 + bbox_y2) / 2

    # Check if bbox center is near the line
    # Using perpendicular distance from point to line
    line_length = euclidean_distance(line_start, line_end)

    if line_length == 0:
        return False

    # Calculate perpendicular distance
    distance = abs((y2 - y1) * center_x - (x2 - x1) * center_y + x2 * y1 - y2 * x1) / line_length

    # Bbox "thickness" - half of diagonal
    bbox_thickness = math.sqrt((bbox_x2 - bbox_x1)**2 + (bbox_y2 - bbox_y1)**2) / 2

    return distance < bbox_thickness


def check_occlusion(
    ref_position: Tuple[float, float],
    play_position: Tuple[float, float],
    player_bboxes: List[List[float]]
) -> Tuple[bool, int]:
    """
    Check if any player occludes referee's line of sight to play.

    Phase 3B-1: Simple line-of-sight occlusion detection

    Args:
        ref_position: Referee (x, y) position
        play_position: Play center (x, y) position
        player_bboxes: List of player bounding boxes

    Returns:
        (is_occluded, num_occluding_players) tuple
    """
    if not player_bboxes:
        return (False, 0)

    occluding_count = 0

    for player_bbox in player_bboxes:
        if line_bbox_intersection(ref_position, play_position, player_bbox):
            occluding_count += 1

    is_occluded = occluding_count > 0

    return (is_occluded, occluding_count)


# Phase 3B-1: Regional coverage helpers
def get_court_region(
    position: Tuple[float, float],
    frame_width: int = 1920,
    frame_height: int = 1080
) -> int:
    """
    Get court region ID (0-5) for position.

    Phase 3B-1: Simple 3x2 grid approximation (6 regions)

    Regions:
    0 | 1 | 2
    ---------
    3 | 4 | 5

    Args:
        position: (x, y) position
        frame_width: Frame width (default 1920)
        frame_height: Frame height (default 1080)

    Returns:
        Region ID (0-5)
    """
    x, y = position

    # Determine column (0, 1, 2)
    col = min(2, int(x / (frame_width / 3)))

    # Determine row (0, 1)
    row = min(1, int(y / (frame_height / 2)))

    # Calculate region ID
    region_id = row * 3 + col

    return region_id


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

    # Phase 3B-1: Velocity-based foul classification thresholds
    STATIONARY_SPEED_THRESHOLD = 20.0  # px/frame - player is stationary
    MOVING_SPEED_THRESHOLD = 30.0  # px/frame - player is moving fast
    SCREEN_MOVEMENT_THRESHOLD = 15.0  # px/frame - screener moving during contact
    SCREEN_STATIC_FRAMES = 15  # frames - screener must be static for this long
    BALL_Y_SHOOTING_THRESHOLD = 0.4  # Ball in upper 40% of frame = likely shooting
    BALL_UPWARD_VELOCITY_THRESHOLD = 10.0  # px/frame upward = ball going up

    # Referee mechanics thresholds (Phase 3A)
    OPTIMAL_DISTANCE_TO_PLAY = 200  # pixels - ideal ref distance
    MAX_DISTANCE_TO_PLAY = 500  # pixels - too far
    GOOD_ANGLE_RANGE = (30, 150)  # degrees - good viewing angle

    # Phase 3B-1: Enhanced referee mechanics thresholds
    IDEAL_DISTANCE_WINDOW = (150, 250)  # pixels - ideal distance range
    GOOD_DISTANCE_WINDOW = (100, 400)  # pixels - acceptable distance range

    # Rotation detection (Phase 3A)
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

        # Phase 3B-1: Track position history for velocity calculation
        # Format: {track_id: [(frame_number, (x, y)), ...]}
        self.track_position_history = defaultdict(list)

        # Phase 3B-1: Regional coverage tracking for CrewRotationEvent
        # Format: {frame_number: {ref_id: region_id}}
        self.regional_coverage_history = defaultdict(dict)

    def _update_track_history(self, tracks: List[Any], frame_number: int):
        """
        Update track position history for velocity calculation.

        Phase 3B-1: Stores last 30 frames of position data per track

        Args:
            tracks: Current frame tracks
            frame_number: Current frame number
        """
        for track in tracks:
            track_id = str(getattr(track, 'track_id', 'unknown'))
            position = bbox_center(track.bbox)

            # Append current position
            self.track_position_history[track_id].append((frame_number, position))

            # Keep only last 30 frames
            if len(self.track_position_history[track_id]) > 30:
                self.track_position_history[track_id] = self.track_position_history[track_id][-30:]

    def _classify_block_vs_charge(
        self,
        track1: Any,
        track2: Any,
        frame_number: int
    ) -> Tuple[str, float]:
        """
        Classify contact as block or charge based on defensive player velocity.

        Phase 3B-1 Heuristic:
        - Defensive player (assumed track2) speed < 20 px/frame = CHARGE (defender set)
        - Defensive player speed > 20 px/frame = BLOCK (defender moving)

        Args:
            track1: Offensive player track
            track2: Defensive player track
            frame_number: Current frame number

        Returns:
            (foul_type, confidence) tuple
        """
        track2_id = str(getattr(track2, 'track_id', 'unknown'))

        # Get velocity for defensive player (track2)
        track2_history = self.track_position_history.get(track2_id, [])
        track2_center = bbox_center(track2.bbox)
        track2_velocity = calculate_velocity(track2_center, track2_history)
        track2_speed = calculate_speed(track2_velocity)

        logger.debug(f"Block/Charge analysis: Defensive player {track2_id} speed = {track2_speed:.2f} px/frame")

        # Classify based on defensive speed
        if track2_speed < self.STATIONARY_SPEED_THRESHOLD:
            # Defensive player stationary = CHARGE on offensive player
            foul_type = "charge"
            confidence = 0.75 + (0.15 * (1 - track2_speed / self.STATIONARY_SPEED_THRESHOLD))
        else:
            # Defensive player moving = BLOCK (defensive foul)
            foul_type = "block"
            confidence = 0.70 + (0.15 * min(track2_speed / self.MOVING_SPEED_THRESHOLD, 1.0))

        return (foul_type, min(confidence, 0.95))

    def _detect_illegal_screen(
        self,
        track1: Any,
        track2: Any,
        frame_number: int
    ) -> Tuple[bool, float]:
        """
        Detect if a screen was illegal (screener moving during contact).

        Phase 3B-1 Heuristic:
        - Check if either player was stationary for 15+ frames before contact
        - If stationary player is moving > 15 px/frame during contact = illegal screen

        Args:
            track1: Player 1 track
            track2: Player 2 track
            frame_number: Current frame number

        Returns:
            (is_illegal_screen, confidence) tuple
        """
        for track in [track1, track2]:
            track_id = str(getattr(track, 'track_id', 'unknown'))
            track_history = self.track_position_history.get(track_id, [])

            if len(track_history) < self.SCREEN_STATIC_FRAMES:
                continue

            # Check if player was stationary for last N frames
            recent_history = track_history[-self.SCREEN_STATIC_FRAMES:]
            speeds = []

            for i in range(1, len(recent_history)):
                prev_frame, prev_pos = recent_history[i-1]
                curr_frame, curr_pos = recent_history[i]
                frame_delta = curr_frame - prev_frame

                if frame_delta > 0:
                    speed = euclidean_distance(prev_pos, curr_pos) / frame_delta
                    speeds.append(speed)

            if not speeds:
                continue

            avg_speed = sum(speeds) / len(speeds)

            # If average speed was low (stationary), but current speed is high = illegal screen
            if avg_speed < self.STATIONARY_SPEED_THRESHOLD:
                current_velocity = calculate_velocity(bbox_center(track.bbox), track_history)
                current_speed = calculate_speed(current_velocity)

                if current_speed > self.SCREEN_MOVEMENT_THRESHOLD:
                    logger.info(f"Illegal screen detected: Player {track_id} moved {current_speed:.2f} px/frame during contact")
                    confidence = 0.70 + (0.20 * min(current_speed / self.MOVING_SPEED_THRESHOLD, 1.0))
                    return (True, min(confidence, 0.95))

        return (False, 0.0)

    def _detect_shooting_foul(
        self,
        track1: Any,
        track2: Any,
        ball_track: Optional[Any],
        frame_height: int = 1080
    ) -> Tuple[bool, float]:
        """
        Detect if contact occurred during a shooting motion.

        Phase 3B-1 Heuristic:
        - Ball position in upper 40% of frame (Y < 0.4 * height)
        - Ball has upward velocity (negative dy/dt) > 10 px/frame
        - Contact detected = shooting foul

        Args:
            track1: Player 1 track
            track2: Player 2 track
            ball_track: Ball track (if available)
            frame_height: Frame height for ball position normalization

        Returns:
            (is_shooting_foul, confidence) tuple
        """
        if not ball_track:
            return (False, 0.0)

        ball_center = bbox_center(ball_track.bbox)
        ball_y_normalized = ball_center[1] / frame_height

        # Check if ball is in upper portion of frame
        if ball_y_normalized > self.BALL_Y_SHOOTING_THRESHOLD:
            return (False, 0.0)

        # Check ball velocity (upward = negative Y velocity in screen coordinates)
        ball_id = str(getattr(ball_track, 'track_id', 'ball'))
        ball_history = self.track_position_history.get(ball_id, [])
        ball_velocity = calculate_velocity(ball_center, ball_history)

        # Upward velocity = negative dy (screen coordinates: y increases downward)
        upward_velocity = -ball_velocity[1]

        if upward_velocity > self.BALL_UPWARD_VELOCITY_THRESHOLD:
            logger.info(f"Shooting foul detected: Ball at Y={ball_y_normalized:.2f}, upward velocity={upward_velocity:.2f} px/frame")
            confidence = 0.70 + (0.20 * min(upward_velocity / (self.BALL_UPWARD_VELOCITY_THRESHOLD * 2), 1.0))
            return (True, min(confidence, 0.95))

        return (False, 0.0)

    async def detect_fouls(
        self,
        tracks: List[Any],
        frame_number: int,
        timestamp: float,
        ball_track: Optional[Any] = None
    ) -> List[CandidateFoulEvent]:
        """
        Detect candidate foul situations using proximity + overlap heuristics.

        Phase 3A v1 Heuristics:
        - Proximity: Players within threshold distance
        - Overlap: Bounding boxes overlapping
        - Confidence: Based on proximity + overlap amount

        Phase 3B-1 Enhancements:
        - Velocity-based block/charge classification
        - Illegal screen detection
        - Shooting foul detection
        - Enhanced metadata with player velocities

        Args:
            tracks: current frame tracks
            frame_number: frame index
            timestamp: video timestamp
            ball_track: ball track (optional, for shooting foul detection)

        Returns:
            List of candidate foul events
        """
        # Phase 3B-1: Update track history for velocity calculations
        self._update_track_history(tracks, frame_number)

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

                    # Phase 3B-1: Calculate player velocities
                    track1_id = str(getattr(track1, 'track_id', 'unknown'))
                    track2_id = str(getattr(track2, 'track_id', 'unknown'))
                    track1_history = self.track_position_history.get(track1_id, [])
                    track2_history = self.track_position_history.get(track2_id, [])
                    track1_velocity = calculate_velocity(center1, track1_history)
                    track2_velocity = calculate_velocity(center2, track2_history)
                    track1_speed = calculate_speed(track1_velocity)
                    track2_speed = calculate_speed(track2_velocity)

                    # Phase 3B-1: Advanced foul classification
                    foul_type = "contact"  # Default
                    confidence = self.FOUL_CONFIDENCE_BASE

                    # Priority 1: Check for shooting foul
                    is_shooting_foul, shooting_conf = self._detect_shooting_foul(
                        track1, track2, ball_track
                    )
                    if is_shooting_foul:
                        foul_type = "shooting_foul"
                        confidence = shooting_conf
                        logger.info(f"Frame {frame_number}: Shooting foul detected (conf={confidence:.2f})")

                    # Priority 2: Check for illegal screen
                    elif overlap > self.CONTACT_OVERLAP_THRESHOLD:
                        is_illegal_screen, screen_conf = self._detect_illegal_screen(
                            track1, track2, frame_number
                        )
                        if is_illegal_screen:
                            foul_type = "illegal_screen"
                            confidence = screen_conf
                            logger.info(f"Frame {frame_number}: Illegal screen detected (conf={confidence:.2f})")

                        # Priority 3: Classify block vs charge
                        else:
                            block_charge_type, bc_conf = self._classify_block_vs_charge(
                                track1, track2, frame_number
                            )
                            foul_type = block_charge_type
                            confidence = bc_conf
                            logger.debug(f"Frame {frame_number}: {foul_type} classified (conf={confidence:.2f})")

                    # No significant overlap = proximity event
                    else:
                        foul_type = "proximity"
                        confidence = self.FOUL_CONFIDENCE_BASE * (1 - distance / self.PROXIMITY_THRESHOLD_PX)

                    # Create event with Phase 3B-1 enhanced metadata
                    event = CandidateFoulEvent(
                        id=str(uuid.uuid4()),
                        timestamp=timestamp,
                        frame_number=frame_number,
                        foul_type=foul_type,
                        confidence=min(confidence, 0.95),  # Cap at 95%
                        actors_involved=[track1_id, track2_id],
                        location={
                            "x": (center1[0] + center2[0]) / 2,
                            "y": (center1[1] + center2[1]) / 2
                        },
                        metadata={
                            "distance_px": distance,
                            "overlap_ratio": overlap,
                            "bbox1": track1.bbox,
                            "bbox2": track2.bbox,
                            # Phase 3B-1: Velocity metadata
                            "player1_velocity": list(track1_velocity),
                            "player2_velocity": list(track2_velocity),
                            "player1_speed": track1_speed,
                            "player2_speed": track2_speed,
                            "classification_method": "velocity_based" if foul_type in ["block", "charge", "illegal_screen", "shooting_foul"] else "proximity_based"
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

        Phase 3B-1 Enhancements:
        - Ideal distance window scoring (150-250px = 1.0, etc.)
        - Occlusion detection (line-of-sight blocking)
        - Regional coverage tracking
        - Enhanced rotation correctness logic

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

        # Get player bboxes for occlusion detection
        player_bboxes = [t.bbox for t in player_tracks]

        # Evaluate each referee
        for ref_track in referee_tracks:
            ref_center = bbox_center(ref_track.bbox)
            ref_id = str(getattr(ref_track, 'track_id', 'unknown'))

            # Calculate distance to play
            distance = euclidean_distance(ref_center, play_center)

            # Phase 3B-1: Ideal distance window scoring
            if self.IDEAL_DISTANCE_WINDOW[0] <= distance <= self.IDEAL_DISTANCE_WINDOW[1]:
                # Perfect distance
                position_score = 1.0
            elif self.GOOD_DISTANCE_WINDOW[0] <= distance <= self.GOOD_DISTANCE_WINDOW[1]:
                # Acceptable distance - score based on how far from ideal
                if distance < self.IDEAL_DISTANCE_WINDOW[0]:
                    # Too close (100-150px)
                    position_score = 0.8 + 0.2 * (distance - self.GOOD_DISTANCE_WINDOW[0]) / (self.IDEAL_DISTANCE_WINDOW[0] - self.GOOD_DISTANCE_WINDOW[0])
                else:
                    # Too far (250-400px)
                    position_score = 0.7 + 0.3 * (1 - (distance - self.IDEAL_DISTANCE_WINDOW[1]) / (self.GOOD_DISTANCE_WINDOW[1] - self.IDEAL_DISTANCE_WINDOW[1]))
            else:
                # Outside acceptable range
                if distance < self.GOOD_DISTANCE_WINDOW[0]:
                    # Way too close
                    position_score = max(0.0, 0.5 * (distance / self.GOOD_DISTANCE_WINDOW[0]))
                else:
                    # Way too far
                    position_score = max(0.0, 0.5 * (1 - (distance - self.GOOD_DISTANCE_WINDOW[1]) / 500))

            # Phase 3B-1: Occlusion detection
            is_occluded, num_occluding = check_occlusion(ref_center, play_center, player_bboxes)
            occlusion_factor = min(num_occluding * 0.2, 1.0) if is_occluded else 0.0

            # Calculate viewing angle (simplified - relative to play center)
            angle_deg = math.degrees(math.atan2(play_center[1] - ref_center[1], play_center[0] - ref_center[0]))
            angle_deg = abs(angle_deg) % 180  # Normalize to 0-180

            # Phase 3B-1: Enhanced visibility score (accounts for occlusion)
            if self.GOOD_ANGLE_RANGE[0] <= angle_deg <= self.GOOD_ANGLE_RANGE[1]:
                angle_visibility = 1.0
            else:
                angle_visibility = 0.6  # Suboptimal angle

            # Reduce visibility by occlusion factor
            visibility_score = angle_visibility * (1.0 - occlusion_factor)

            # Phase 3B-1: Regional coverage tracking
            ref_region = get_court_region(ref_center)
            self.regional_coverage_history[frame_number][ref_id] = ref_region

            # Phase 3B-1: Enhanced rotation correct logic
            # Check regional coverage over last 30 frames
            region_history = []
            for past_frame in range(max(0, frame_number - 30), frame_number + 1):
                if past_frame in self.regional_coverage_history and ref_id in self.regional_coverage_history[past_frame]:
                    region_history.append(self.regional_coverage_history[past_frame][ref_id])

            # Good rotation = ref has covered multiple regions OR maintains good position/visibility
            unique_regions = len(set(region_history)) if region_history else 1
            rotation_correct = (position_score > 0.7 and visibility_score > 0.6) or unique_regions >= 2

            logger.debug(
                f"Frame {frame_number}: Ref {ref_id} - "
                f"distance={distance:.1f}px, position_score={position_score:.2f}, "
                f"visibility={visibility_score:.2f}, occluded={is_occluded}, "
                f"region={ref_region}, rotation_correct={rotation_correct}"
            )

            # Create mechanics event with Phase 3B-1 enhanced metadata
            event = RefMechanicsEvent(
                id=str(uuid.uuid4()),
                timestamp=timestamp,
                frame_number=frame_number,
                official_id=ref_id,
                position_score=position_score,
                visibility_score=visibility_score,
                rotation_correct=rotation_correct,
                metadata={
                    "distance_to_play_px": distance,
                    "viewing_angle_deg": angle_deg,
                    "ref_position": list(ref_center),
                    "play_center": list(play_center),
                    # Phase 3B-1: Enhanced metadata
                    "is_occluded": is_occluded,
                    "num_occluding_players": num_occluding,
                    "occlusion_factor": occlusion_factor,
                    "ref_region": ref_region,
                    "regions_covered_last_30": unique_regions,
                    "in_ideal_distance_window": self.IDEAL_DISTANCE_WINDOW[0] <= distance <= self.IDEAL_DISTANCE_WINDOW[1]
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

        Phase 3B-1 Enhancements:
        - Regional clustering analysis (court coverage)
        - Systematic mis-coverage detection (uncovered regions)
        - Enhanced rotation quality scoring (regional balance)

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

            # Phase 3B-1: Regional clustering analysis
            # Get current regional coverage
            current_regions_covered = set()
            ref_regional_distribution = defaultdict(int)

            for ref_id, pos in current_refs.items():
                region = get_court_region(pos)
                current_regions_covered.add(region)
                ref_regional_distribution[region] += 1

            # Get past regional coverage
            past_regions_covered = set()
            for ref_id, pos in past_refs.items():
                region = get_court_region(pos)
                past_regions_covered.add(region)

            # Phase 3B-1: Mis-coverage detection
            # Ideally, all 6 regions (0-5) should be covered at some point
            all_regions = set(range(6))
            uncovered_regions = all_regions - current_regions_covered

            # Check coverage over time window
            regions_covered_in_window = set()
            for past_f in range(past_frame, frame_number + 1):
                if past_f in self.regional_coverage_history:
                    for ref_id in self.regional_coverage_history[past_f]:
                        regions_covered_in_window.add(self.regional_coverage_history[past_f][ref_id])

            systematic_miscoverage = len(all_regions - regions_covered_in_window)

            # Phase 3B-1: Enhanced rotation quality
            # Factor in regional balance (even distribution = good rotation)
            # Perfect balance: each region covered by ~1 ref (for 3-ref crew)
            regional_balance_score = 1.0
            if len(current_refs) > 0:
                # Calculate variance in regional distribution
                avg_refs_per_region = len(current_refs) / 6.0
                variance = sum((count - avg_refs_per_region)**2 for count in ref_regional_distribution.values()) / 6.0
                regional_balance_score = max(0.0, 1.0 - (variance / 2.0))  # Normalize

            # Combined rotation quality
            movement_quality = min(avg_movement / (self.ROTATION_DISTANCE_THRESHOLD * 2), 1.0)
            coverage_quality = len(current_regions_covered) / 6.0  # 6 total regions
            rotation_quality = (movement_quality * 0.4 + coverage_quality * 0.3 + regional_balance_score * 0.3)

            # Determine if late or misaligned (Phase 3A + 3B-1)
            late = avg_movement > self.ROTATION_DISTANCE_THRESHOLD * 1.5  # Moved too much = late
            misaligned = len(significant_movements) < len(current_refs)  # Not all refs rotated

            logger.info(
                f"Frame {frame_number}: Rotation detected - "
                f"quality={rotation_quality:.2f}, regions_covered={len(current_regions_covered)}/6, "
                f"systematic_miscoverage={systematic_miscoverage}, late={late}, misaligned={misaligned}"
            )

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
                    "movements": {ref_id: dist for ref_id, dist in movements},
                    # Phase 3B-1: Regional metadata
                    "regions_covered_current": list(current_regions_covered),
                    "regions_covered_past": list(past_regions_covered),
                    "uncovered_regions_current": list(uncovered_regions),
                    "systematic_miscoverage_count": systematic_miscoverage,
                    "regional_distribution": dict(ref_regional_distribution),
                    "regional_balance_score": regional_balance_score,
                    "movement_quality": movement_quality,
                    "coverage_quality": coverage_quality
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

        # Detect fouls (Phase 3B-1: pass ball_track for shooting foul detection)
        foul_events = await self.detect_fouls(player_tracks, frame_number, timestamp, ball_track)
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
