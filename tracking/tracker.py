"""
Multi-Object Tracking using ByteTrack (Vale-Certified for PCOS Sports)

Maintains actor identities across frames using ByteTrack algorithm.
Follows PCOS Vision Standards and SPEC_KIT requirements.

Phase 2 Implementation - Production Ready
- ByteTrack algorithm (best for sports - Vale-certified)
- Actor ID persistence across frames
- Trajectory management
- Occlusion handling

ByteTrack Reference: https://arxiv.org/abs/2110.06864
Best performance for sports tracking in crowded scenes.
"""
from typing import List, Dict, Any, Optional, Tuple
from pydantic import BaseModel, Field
import numpy as np
import logging
from collections import defaultdict, deque

logger = logging.getLogger(__name__)


class TrackerConfig(BaseModel):
    """
    Configuration for ByteTrack tracker.

    Follows PCOS Vision Standards for sports tracking.
    """
    track_thresh: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="High confidence threshold for track association"
    )
    track_buffer: int = Field(
        default=30,
        ge=1,
        description="Number of frames to keep lost tracks"
    )
    match_thresh: float = Field(
        default=0.8,
        ge=0.0,
        le=1.0,
        description="IOU threshold for matching detections to tracks"
    )
    min_box_area: float = Field(
        default=10.0,
        ge=0.0,
        description="Minimum bbox area to consider"
    )
    mot20: bool = Field(
        default=False,
        description="Use MOT20 settings (more tracks, less pruning)"
    )
    trajectory_history_length: int = Field(
        default=30,
        ge=1,
        description="Number of positions to keep in trajectory history"
    )

    class Config:
        frozen = False


class Track(BaseModel):
    """
    Single tracked actor with trajectory history.

    Represents a persistent actor across multiple frames.
    """
    track_id: int  # Unique persistent ID
    actor_type: str  # "player", "referee", "ball"
    bbox: List[float]  # [x1, y1, x2, y2] current frame
    confidence: float  # Detection confidence
    frame_number: int  # Current frame
    age: int = 0  # Frames since first detection
    hits: int = 0  # Number of successful updates
    time_since_update: int = 0  # Frames since last successful match
    state: str = "tentative"  # "tentative", "confirmed", "deleted"

    # Trajectory data
    trajectory: List[Dict[str, Any]] = Field(default_factory=list)
    # Each entry: {"frame": int, "bbox": List[float], "center": List[float]}

    class Config:
        frozen = False
        arbitrary_types_allowed = True


def bbox_iou(bbox1: List[float], bbox2: List[float]) -> float:
    """
    Calculate IoU (Intersection over Union) between two bounding boxes.

    Args:
        bbox1: [x1, y1, x2, y2]
        bbox2: [x1, y1, x2, y2]

    Returns:
        IoU value between 0 and 1
    """
    x1_min, y1_min, x1_max, y1_max = bbox1
    x2_min, y2_min, x2_max, y2_max = bbox2

    # Calculate intersection area
    inter_x_min = max(x1_min, x2_min)
    inter_y_min = max(y1_min, y2_min)
    inter_x_max = min(x1_max, x2_max)
    inter_y_max = min(y1_max, y2_max)

    inter_width = max(0, inter_x_max - inter_x_min)
    inter_height = max(0, inter_y_max - inter_y_min)
    inter_area = inter_width * inter_height

    # Calculate union area
    bbox1_area = (x1_max - x1_min) * (y1_max - y1_min)
    bbox2_area = (x2_max - x2_min) * (y2_max - y2_min)
    union_area = bbox1_area + bbox2_area - inter_area

    if union_area == 0:
        return 0.0

    return inter_area / union_area


def bbox_center(bbox: List[float]) -> Tuple[float, float]:
    """Get center point of bbox"""
    return ((bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2)


class Tracker:
    """
    ByteTrack-based multi-object tracker for sports officiating.

    Implements simplified ByteTrack algorithm:
    - High confidence detections matched to existing tracks
    - Low confidence detections used for track re-identification
    - Track management (birth, update, death)
    - Trajectory history for motion analysis

    Vale-Certified as best tracker for sports applications.

    Reference: https://arxiv.org/abs/2110.06864
    """

    def __init__(self, config: TrackerConfig):
        """
        Initialize tracker.

        Args:
            config: TrackerConfig with matching thresholds
        """
        self.config = config
        self.tracks: Dict[int, Track] = {}
        self.next_id = 1
        self.frame_count = 0

        logger.info(f"Tracker initialized with config: {config.model_dump()}")

    def update(
        self,
        detections: List[Any],
        frame_number: int
    ) -> List[Track]:
        """
        Update tracks with new detections for current frame.

        Implements ByteTrack algorithm:
        1. Separate high/low confidence detections
        2. Match high conf detections to tracks (first association)
        3. Match low conf detections to unmatched tracks (second association)
        4. Initialize new tracks from unmatched high conf detections
        5. Update track states and prune old tracks

        Args:
            detections: list of Detection objects from detector
            frame_number: current frame number

        Returns:
            List of active Track objects
        """
        self.frame_count = frame_number

        # Separate high and low confidence detections
        high_conf_dets = []
        low_conf_dets = []

        for det in detections:
            if hasattr(det, 'confidence'):
                if det.confidence >= self.config.track_thresh:
                    high_conf_dets.append(det)
                else:
                    low_conf_dets.append(det)
            else:
                high_conf_dets.append(det)  # No confidence, treat as high

        # First association: match high confidence detections to tracks
        matched_tracks, unmatched_dets, unmatched_tracks = self._first_association(
            high_conf_dets, frame_number
        )

        # Second association: match low confidence detections to remaining tracks
        if low_conf_dets and unmatched_tracks:
            matched_tracks_2, _, unmatched_tracks = self._second_association(
                low_conf_dets, unmatched_tracks, frame_number
            )
            matched_tracks.extend(matched_tracks_2)

        # Initialize new tracks from unmatched high confidence detections
        for det in unmatched_dets:
            self._init_track(det, frame_number)

        # Update track states
        self._update_track_states(unmatched_tracks)

        # Remove old tracks
        self._remove_old_tracks()

        # Return confirmed tracks
        active_tracks = [t for t in self.tracks.values() if t.state != "deleted"]

        logger.debug(f"Frame {frame_number}: {len(active_tracks)} active tracks")
        return active_tracks

    def _first_association(
        self,
        detections: List[Any],
        frame_number: int
    ) -> Tuple[List[Track], List[Any], List[int]]:
        """
        First association: match high confidence detections to tracks.

        Args:
            detections: high confidence detections
            frame_number: current frame

        Returns:
            (matched_tracks, unmatched_detections, unmatched_track_ids)
        """
        if not detections:
            return [], [], list(self.tracks.keys())

        # Get confirmed and tentative tracks
        active_track_ids = [
            tid for tid, t in self.tracks.items()
            if t.state in ["confirmed", "tentative"]
        ]

        if not active_track_ids:
            return [], detections, []

        # Compute IoU matrix
        iou_matrix = np.zeros((len(detections), len(active_track_ids)))

        for i, det in enumerate(detections):
            det_bbox = det.bbox if hasattr(det, 'bbox') else [0, 0, 0, 0]
            for j, track_id in enumerate(active_track_ids):
                track_bbox = self.tracks[track_id].bbox
                iou_matrix[i, j] = bbox_iou(det_bbox, track_bbox)

        # Match using greedy assignment (simplified ByteTrack)
        matched_tracks = []
        matched_det_indices = set()
        matched_track_indices = set()

        # Greedy matching: highest IoU first
        while True:
            if iou_matrix.size == 0:
                break

            max_iou = np.max(iou_matrix)
            if max_iou < self.config.match_thresh:
                break

            i, j = np.unravel_index(np.argmax(iou_matrix), iou_matrix.shape)

            # Match found
            det = detections[i]
            track_id = active_track_ids[j]

            # Update track
            self._update_track(track_id, det, frame_number)
            matched_tracks.append(self.tracks[track_id])

            matched_det_indices.add(i)
            matched_track_indices.add(j)

            # Zero out matched row/col
            iou_matrix[i, :] = 0
            iou_matrix[:, j] = 0

        # Unmatched detections and tracks
        unmatched_dets = [d for i, d in enumerate(detections) if i not in matched_det_indices]
        unmatched_track_ids = [
            active_track_ids[j]
            for j in range(len(active_track_ids))
            if j not in matched_track_indices
        ]

        return matched_tracks, unmatched_dets, unmatched_track_ids

    def _second_association(
        self,
        detections: List[Any],
        track_ids: List[int],
        frame_number: int
    ) -> Tuple[List[Track], List[Any], List[int]]:
        """
        Second association: match low confidence detections to unmatched tracks.

        Args:
            detections: low confidence detections
            track_ids: unmatched track IDs from first association
            frame_number: current frame

        Returns:
            (matched_tracks, unmatched_detections, unmatched_track_ids)
        """
        if not detections or not track_ids:
            return [], detections, track_ids

        # Compute IoU matrix
        iou_matrix = np.zeros((len(detections), len(track_ids)))

        for i, det in enumerate(detections):
            det_bbox = det.bbox if hasattr(det, 'bbox') else [0, 0, 0, 0]
            for j, track_id in enumerate(track_ids):
                track_bbox = self.tracks[track_id].bbox
                iou_matrix[i, j] = bbox_iou(det_bbox, track_bbox)

        # Greedy matching with lower threshold
        matched_tracks = []
        matched_det_indices = set()
        matched_track_indices = set()

        lower_thresh = self.config.match_thresh * 0.7  # Lower threshold for second association

        while True:
            if iou_matrix.size == 0:
                break

            max_iou = np.max(iou_matrix)
            if max_iou < lower_thresh:
                break

            i, j = np.unravel_index(np.argmax(iou_matrix), iou_matrix.shape)

            # Match found
            det = detections[i]
            track_id = track_ids[j]

            # Update track
            self._update_track(track_id, det, frame_number)
            matched_tracks.append(self.tracks[track_id])

            matched_det_indices.add(i)
            matched_track_indices.add(j)

            # Zero out matched row/col
            iou_matrix[i, :] = 0
            iou_matrix[:, j] = 0

        unmatched_dets = [d for i, d in enumerate(detections) if i not in matched_det_indices]
        unmatched_track_ids = [track_ids[j] for j in range(len(track_ids)) if j not in matched_track_indices]

        return matched_tracks, unmatched_dets, unmatched_track_ids

    def _init_track(self, detection: Any, frame_number: int) -> None:
        """Initialize new track from detection"""
        track_id = self.next_id
        self.next_id += 1

        bbox = detection.bbox if hasattr(detection, 'bbox') else [0, 0, 0, 0]
        confidence = detection.confidence if hasattr(detection, 'confidence') else 0.5
        actor_type = detection.actor_type if hasattr(detection, 'actor_type') else "player"

        center = bbox_center(bbox)

        track = Track(
            track_id=track_id,
            actor_type=actor_type,
            bbox=bbox,
            confidence=confidence,
            frame_number=frame_number,
            age=1,
            hits=1,
            time_since_update=0,
            state="tentative",
            trajectory=[{
                "frame": frame_number,
                "bbox": bbox,
                "center": list(center)
            }]
        )

        self.tracks[track_id] = track
        logger.debug(f"New track {track_id} initialized at frame {frame_number}")

    def _update_track(self, track_id: int, detection: Any, frame_number: int) -> None:
        """Update existing track with new detection"""
        track = self.tracks[track_id]

        bbox = detection.bbox if hasattr(detection, 'bbox') else track.bbox
        confidence = detection.confidence if hasattr(detection, 'confidence') else track.confidence

        # Update track
        track.bbox = bbox
        track.confidence = confidence
        track.frame_number = frame_number
        track.age += 1
        track.hits += 1
        track.time_since_update = 0

        # Confirm track after N successful matches
        if track.state == "tentative" and track.hits >= 3:
            track.state = "confirmed"

        # Add to trajectory
        center = bbox_center(bbox)
        track.trajectory.append({
            "frame": frame_number,
            "bbox": bbox,
            "center": list(center)
        })

        # Limit trajectory length
        if len(track.trajectory) > self.config.trajectory_history_length:
            track.trajectory = track.trajectory[-self.config.trajectory_history_length:]

    def _update_track_states(self, unmatched_track_ids: List[int]) -> None:
        """Update states of unmatched tracks"""
        for track_id in unmatched_track_ids:
            if track_id in self.tracks:
                track = self.tracks[track_id]
                track.time_since_update += 1

                # Mark for deletion if lost too long
                if track.time_since_update > self.config.track_buffer:
                    track.state = "deleted"

    def _remove_old_tracks(self) -> None:
        """Remove tracks marked for deletion"""
        to_remove = [tid for tid, t in self.tracks.items() if t.state == "deleted"]

        for tid in to_remove:
            logger.debug(f"Removing track {tid}")
            del self.tracks[tid]

    def get_track(self, track_id: int) -> Optional[Track]:
        """Get track by ID"""
        return self.tracks.get(track_id)

    def get_all_tracks(self) -> List[Track]:
        """Get all active tracks"""
        return [t for t in self.tracks.values() if t.state != "deleted"]

    def get_track_count(self) -> int:
        """Get number of active tracks"""
        return len([t for t in self.tracks.values() if t.state != "deleted"])

    def reset(self) -> None:
        """Reset tracker (clear all tracks)"""
        self.tracks = {}
        self.next_id = 1
        self.frame_count = 0
        logger.info("Tracker reset")


# TODO Phase 3+: Enhanced tracking features
# - Kalman filter for motion prediction (smoother trajectories)
# - Re-ID features for better occlusion handling
# - Cross-camera tracking integration
# - Team assignment based on jersey color clustering

# TODO Phase 4+: Optimize for Jetson
# - Profile ByteTrack performance
# - Optimize IoU computation (vectorization)
# - Consider CUDA kernels for association step
