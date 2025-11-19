"""
Unit Tests for Phase 3B-1 Advanced Event Detection

Tests velocity-based foul classification, occlusion detection, and regional coverage.
"""
import pytest
import asyncio
from typing import List, Tuple
from collections import namedtuple

# Mock track object
MockTrack = namedtuple('MockTrack', ['track_id', 'bbox', 'actor_type', 'frame_number', 'confidence'])


class TestVelocityCalculation:
    """Test velocity calculation helpers"""

    def test_calculate_velocity_basic(self):
        """Test basic velocity calculation with 5-frame window"""
        from analysis.event_detector import calculate_velocity

        # Create position history: moving 10px/frame in X direction
        track_history = [
            (0, (100.0, 200.0)),
            (1, (110.0, 200.0)),
            (2, (120.0, 200.0)),
            (3, (130.0, 200.0)),
            (4, (140.0, 200.0)),
        ]
        current_position = (140.0, 200.0)

        velocity_x, velocity_y = calculate_velocity(current_position, track_history)

        assert abs(velocity_x - 10.0) < 0.1, f"Expected velocity_x ~10.0, got {velocity_x}"
        assert abs(velocity_y - 0.0) < 0.1, f"Expected velocity_y ~0.0, got {velocity_y}"

    def test_calculate_speed(self):
        """Test scalar speed calculation"""
        from analysis.event_detector import calculate_speed

        # Velocity vector (3, 4) should give speed 5
        velocity = (3.0, 4.0)
        speed = calculate_speed(velocity)

        assert abs(speed - 5.0) < 0.1, f"Expected speed ~5.0, got {speed}"


class TestBlockVsChargeClassification:
    """Test block vs charge classification logic"""

    @pytest.mark.asyncio
    async def test_classify_charge_stationary_defender(self):
        """Test that stationary defender results in CHARGE classification"""
        from analysis.event_detector import EventDetector

        detector = EventDetector(game_id="test-game")

        # Create mock tracks: defender is stationary (speed < 20 px/frame)
        offensive_track = MockTrack('player1', [100, 100, 150, 180], 'player', 10, 0.9)
        defensive_track = MockTrack('player2', [200, 200, 250, 280], 'player', 10, 0.9)

        # Build stationary history for defensive player
        for frame in range(5):
            detector.track_position_history['player2'].append((frame, (225.0, 240.0)))

        foul_type, confidence = detector._classify_block_vs_charge(
            offensive_track, defensive_track, 10
        )

        assert foul_type == "charge", f"Expected 'charge', got '{foul_type}'"
        assert 0.75 <= confidence <= 0.95, f"Expected confidence 0.75-0.95, got {confidence}"

    @pytest.mark.asyncio
    async def test_classify_block_moving_defender(self):
        """Test that moving defender results in BLOCK classification"""
        from analysis.event_detector import EventDetector

        detector = EventDetector(game_id="test-game")

        offensive_track = MockTrack('player1', [100, 100, 150, 180], 'player', 10, 0.9)
        defensive_track = MockTrack('player2', [200, 200, 250, 280], 'player', 10, 0.9)

        # Build moving history for defensive player (30+ px/frame)
        for frame in range(5):
            detector.track_position_history['player2'].append((frame, (225.0 + frame * 35, 240.0)))

        foul_type, confidence = detector._classify_block_vs_charge(
            offensive_track, defensive_track, 10
        )

        assert foul_type == "block", f"Expected 'block', got '{foul_type}'"
        assert 0.70 <= confidence <= 0.95, f"Expected confidence 0.70-0.95, got {confidence}"


class TestIllegalScreenDetection:
    """Test illegal screen detection logic"""

    @pytest.mark.asyncio
    async def test_detect_illegal_screen_moving_screener(self):
        """Test that moving screener during contact is flagged as illegal screen"""
        from analysis.event_detector import EventDetector

        detector = EventDetector(game_id="test-game")

        track1 = MockTrack('player1', [100, 100, 150, 180], 'player', 20, 0.9)
        track2 = MockTrack('player2', [200, 200, 250, 280], 'player', 20, 0.9)

        # Build stationary history (frames 0-14), then sudden movement
        for frame in range(15):
            detector.track_position_history['player2'].append((frame, (225.0, 240.0)))

        # Add current frame with significant movement (> 15 px/frame)
        detector.track_position_history['player2'].append((20, (245.0, 240.0)))

        is_illegal, confidence = detector._detect_illegal_screen(track1, track2, 20)

        assert is_illegal is True, "Expected illegal screen to be detected"
        assert 0.70 <= confidence <= 0.95, f"Expected confidence 0.70-0.95, got {confidence}"

    @pytest.mark.asyncio
    async def test_detect_legal_screen_stationary(self):
        """Test that stationary screener is legal"""
        from analysis.event_detector import EventDetector

        detector = EventDetector(game_id="test-game")

        track1 = MockTrack('player1', [100, 100, 150, 180], 'player', 20, 0.9)
        track2 = MockTrack('player2', [200, 200, 250, 280], 'player', 20, 0.9)

        # Build fully stationary history
        for frame in range(21):
            detector.track_position_history['player2'].append((frame, (225.0, 240.0)))

        is_illegal, confidence = detector._detect_illegal_screen(track1, track2, 20)

        assert is_illegal is False, "Expected legal screen (no illegal detection)"
        assert confidence == 0.0, f"Expected confidence 0.0, got {confidence}"


class TestShootingFoulDetection:
    """Test shooting foul detection logic"""

    @pytest.mark.asyncio
    async def test_detect_shooting_foul_ball_high_upward(self):
        """Test shooting foul when ball is high and moving upward"""
        from analysis.event_detector import EventDetector

        detector = EventDetector(game_id="test-game")

        track1 = MockTrack('player1', [100, 100, 150, 180], 'player', 10, 0.9)
        track2 = MockTrack('player2', [200, 200, 250, 280], 'player', 10, 0.9)
        ball_track = MockTrack('ball', [150, 300, 170, 320], 'ball', 10, 0.95)  # Y=300 < 0.4*1080=432

        # Build upward velocity history for ball (negative dy in screen coordinates)
        for frame in range(5):
            detector.track_position_history['ball'].append((frame, (160.0, 350.0 - frame * 15)))

        is_shooting, confidence = detector._detect_shooting_foul(
            track1, track2, ball_track, frame_height=1080
        )

        assert is_shooting is True, "Expected shooting foul to be detected"
        assert 0.70 <= confidence <= 0.95, f"Expected confidence 0.70-0.95, got {confidence}"

    @pytest.mark.asyncio
    async def test_no_shooting_foul_ball_low(self):
        """Test no shooting foul when ball is low in frame"""
        from analysis.event_detector import EventDetector

        detector = EventDetector(game_id="test-game")

        track1 = MockTrack('player1', [100, 100, 150, 180], 'player', 10, 0.9)
        track2 = MockTrack('player2', [200, 200, 250, 280], 'player', 10, 0.9)
        ball_track = MockTrack('ball', [150, 700, 170, 720], 'ball', 10, 0.95)  # Y=700 > 0.4*1080

        is_shooting, confidence = detector._detect_shooting_foul(
            track1, track2, ball_track, frame_height=1080
        )

        assert is_shooting is False, "Expected no shooting foul (ball too low)"
        assert confidence == 0.0, f"Expected confidence 0.0, got {confidence}"


class TestOcclusionDetection:
    """Test occlusion detection helpers"""

    def test_check_occlusion_with_blocking_player(self):
        """Test occlusion when player blocks line of sight"""
        from analysis.event_detector import check_occlusion

        ref_position = (100.0, 500.0)
        play_position = (500.0, 500.0)
        player_bboxes = [
            [280, 450, 320, 550],  # Player in the middle of line of sight
        ]

        is_occluded, num_occluding = check_occlusion(ref_position, play_position, player_bboxes)

        assert is_occluded is True, "Expected occlusion to be detected"
        assert num_occluding == 1, f"Expected 1 occluding player, got {num_occluding}"

    def test_no_occlusion_clear_line(self):
        """Test no occlusion when line of sight is clear"""
        from analysis.event_detector import check_occlusion

        ref_position = (100.0, 500.0)
        play_position = (500.0, 500.0)
        player_bboxes = [
            [100, 100, 150, 150],  # Player far away from line
        ]

        is_occluded, num_occluding = check_occlusion(ref_position, play_position, player_bboxes)

        assert is_occluded is False, "Expected no occlusion"
        assert num_occluding == 0, f"Expected 0 occluding players, got {num_occluding}"


class TestRegionalCoverage:
    """Test regional coverage helpers"""

    def test_get_court_region_top_left(self):
        """Test region assignment for top-left corner"""
        from analysis.event_detector import get_court_region

        position = (320.0, 270.0)  # Top-left quadrant (< 640px X, < 540px Y)
        region = get_court_region(position, frame_width=1920, frame_height=1080)

        assert region == 0, f"Expected region 0 (top-left), got {region}"

    def test_get_court_region_bottom_right(self):
        """Test region assignment for bottom-right corner"""
        from analysis.event_detector import get_court_region

        position = (1600.0, 900.0)  # Bottom-right quadrant
        region = get_court_region(position, frame_width=1920, frame_height=1080)

        assert region == 5, f"Expected region 5 (bottom-right), got {region}"


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
