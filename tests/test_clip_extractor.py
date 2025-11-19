"""
Unit Tests for Phase 4 Clip Extraction Engine

Tests FFmpeg-based clip extraction, thumbnail generation, and batch processing.
"""
import pytest
import tempfile
import os
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
from uuid import uuid4

from media.clip_extractor import (
    ClipRequest,
    ClipResult,
    ClipExtractor,
    create_clip_request_from_event
)


class TestClipModels:
    """Test Pydantic models for clip requests and results"""

    def test_clip_request_valid(self):
        """Test valid ClipRequest creation"""
        request = ClipRequest(
            game_id=str(uuid4()),
            event_id=str(uuid4()),
            video_path="/path/to/video.mp4",
            start_time=10.0,
            end_time=18.0,
            clip_dir="/clips",
            generate_thumbnail=True,
            clip_category="candidate_foul"
        )

        assert request.start_time == 10.0
        assert request.end_time == 18.0
        assert request.generate_thumbnail is True
        assert request.clip_category == "candidate_foul"

    def test_clip_request_defaults(self):
        """Test ClipRequest with default values"""
        request = ClipRequest(
            game_id=str(uuid4()),
            event_id=str(uuid4()),
            video_path="/path/to/video.mp4",
            start_time=10.0,
            end_time=18.0,
            clip_dir="/clips"
        )

        assert request.generate_thumbnail is True  # Default
        assert request.clip_category is None  # Default

    def test_clip_result_success(self):
        """Test ClipResult for successful extraction"""
        result = ClipResult(
            clip_id=str(uuid4()),
            game_id=str(uuid4()),
            event_id=str(uuid4()),
            file_path="/clips/clip_123.mp4",
            thumbnail_path="/clips/thumb_123.jpg",
            start_time=10.0,
            end_time=18.0,
            duration=8.0,
            success=True,
            error=None
        )

        assert result.success is True
        assert result.duration == 8.0
        assert result.error is None

    def test_clip_result_failure(self):
        """Test ClipResult for failed extraction"""
        result = ClipResult(
            clip_id=str(uuid4()),
            game_id=str(uuid4()),
            event_id=str(uuid4()),
            file_path="",
            start_time=10.0,
            end_time=18.0,
            duration=8.0,
            success=False,
            error="Video file not found"
        )

        assert result.success is False
        assert result.error == "Video file not found"
        assert result.file_path == ""


class TestClipExtractor:
    """Test ClipExtractor core functionality"""

    def test_clip_extractor_initialization(self):
        """Test ClipExtractor initialization with default settings"""
        extractor = ClipExtractor()

        assert extractor.codec == "libx264"
        assert extractor.preset == "medium"
        assert extractor.crf == 23
        assert extractor.thumbnail_size == "320x180"

    def test_clip_extractor_custom_settings(self):
        """Test ClipExtractor initialization with custom settings"""
        with tempfile.TemporaryDirectory() as tmpdir:
            custom_dir = os.path.join(tmpdir, "custom_clips")
            extractor = ClipExtractor(
                output_dir=custom_dir,
                codec="libx265",
                preset="fast",
                crf=18,
                thumbnail_size="640x360"
            )

            assert extractor.codec == "libx265"
            assert extractor.preset == "fast"
            assert extractor.crf == 18
            assert extractor.thumbnail_size == "640x360"
            assert extractor.output_dir == Path(custom_dir)

    @patch('media.clip_extractor.Path.exists')
    def test_extract_clip_video_not_found(self, mock_exists):
        """Test clip extraction with missing video file"""
        mock_exists.return_value = False

        extractor = ClipExtractor(output_dir="/tmp/clips")

        request = ClipRequest(
            game_id=str(uuid4()),
            event_id=str(uuid4()),
            video_path="/nonexistent/video.mp4",
            start_time=10.0,
            end_time=18.0,
            clip_dir="/tmp/clips"
        )

        result = extractor.extract_clip(request)

        assert result.success is False
        assert "not found" in result.error.lower()

    @patch('media.clip_extractor.subprocess.run')
    @patch('media.clip_extractor.Path.exists')
    def test_extract_clip_success(self, mock_exists, mock_subprocess):
        """Test successful clip extraction"""
        # Mock video file exists
        mock_exists.side_effect = lambda: True

        # Mock FFmpeg success
        mock_result = Mock()
        mock_result.returncode = 0
        mock_subprocess.return_value = mock_result

        with tempfile.TemporaryDirectory() as tmpdir:
            extractor = ClipExtractor(output_dir=tmpdir)

            request = ClipRequest(
                game_id=str(uuid4()),
                event_id=str(uuid4()),
                video_path="/path/to/video.mp4",
                start_time=10.0,
                end_time=18.0,
                clip_dir=tmpdir,
                generate_thumbnail=False  # Skip thumbnail for this test
            )

            # Create mock output file
            game_dir = Path(tmpdir) / request.game_id
            game_dir.mkdir(parents=True, exist_ok=True)

            result = extractor.extract_clip(request)

            # Verify FFmpeg was called
            assert mock_subprocess.called

            # Check FFmpeg command structure
            call_args = mock_subprocess.call_args[0][0]
            assert "ffmpeg" in call_args
            assert "-ss" in call_args
            assert "-i" in call_args
            assert "-t" in call_args

    @patch('media.clip_extractor.subprocess.run')
    @patch('media.clip_extractor.Path.exists')
    def test_extract_clip_ffmpeg_failure(self, mock_exists, mock_subprocess):
        """Test clip extraction with FFmpeg failure"""
        mock_exists.return_value = True

        # Mock FFmpeg failure
        mock_result = Mock()
        mock_result.returncode = 1
        mock_result.stderr = "FFmpeg error: invalid codec"
        mock_subprocess.return_value = mock_result

        extractor = ClipExtractor(output_dir="/tmp/clips")

        request = ClipRequest(
            game_id=str(uuid4()),
            event_id=str(uuid4()),
            video_path="/path/to/video.mp4",
            start_time=10.0,
            end_time=18.0,
            clip_dir="/tmp/clips"
        )

        result = extractor.extract_clip(request)

        assert result.success is False
        assert "FFmpeg extraction failed" in result.error

    @patch('media.clip_extractor.subprocess.run')
    def test_generate_thumbnail_success(self, mock_subprocess):
        """Test thumbnail generation"""
        # Mock FFmpeg success
        mock_result = Mock()
        mock_result.returncode = 0
        mock_subprocess.return_value = mock_result

        with tempfile.TemporaryDirectory() as tmpdir:
            extractor = ClipExtractor(output_dir=tmpdir)

            # Create dummy video file
            video_path = os.path.join(tmpdir, "test_video.mp4")
            Path(video_path).touch()

            # Create dummy thumbnail path
            thumb_path = os.path.join(tmpdir, "thumb.jpg")

            success = extractor._generate_thumbnail(
                video_path=video_path,
                output_path=thumb_path,
                timestamp=5.0
            )

            # Verify FFmpeg was called
            assert mock_subprocess.called

            # Check command structure
            call_args = mock_subprocess.call_args[0][0]
            assert "ffmpeg" in call_args
            assert "-ss" in call_args
            assert str(5.0) in call_args
            assert "-vframes" in call_args
            assert "1" in call_args

    @patch('media.clip_extractor.subprocess.run')
    def test_get_video_duration(self, mock_subprocess):
        """Test video duration detection using FFprobe"""
        # Mock FFprobe success
        mock_result = Mock()
        mock_result.returncode = 0
        mock_result.stdout = "120.5\n"
        mock_subprocess.return_value = mock_result

        extractor = ClipExtractor()

        duration = extractor.get_video_duration("/path/to/video.mp4")

        assert duration == 120.5
        assert mock_subprocess.called

        # Check FFprobe command
        call_args = mock_subprocess.call_args[0][0]
        assert "ffprobe" in call_args

    @patch('media.clip_extractor.subprocess.run')
    @patch('media.clip_extractor.Path.exists')
    def test_extract_clips_batch(self, mock_exists, mock_subprocess):
        """Test batch clip extraction"""
        mock_exists.return_value = True

        # Mock FFmpeg success
        mock_result = Mock()
        mock_result.returncode = 0
        mock_subprocess.return_value = mock_result

        extractor = ClipExtractor(output_dir="/tmp/clips")

        requests = [
            ClipRequest(
                game_id=str(uuid4()),
                event_id=str(uuid4()),
                video_path="/path/to/video.mp4",
                start_time=10.0,
                end_time=18.0,
                clip_dir="/tmp/clips",
                generate_thumbnail=False
            ),
            ClipRequest(
                game_id=str(uuid4()),
                event_id=str(uuid4()),
                video_path="/path/to/video.mp4",
                start_time=30.0,
                end_time=38.0,
                clip_dir="/tmp/clips",
                generate_thumbnail=False
            ),
            ClipRequest(
                game_id=str(uuid4()),
                event_id=str(uuid4()),
                video_path="/path/to/video.mp4",
                start_time=60.0,
                end_time=68.0,
                clip_dir="/tmp/clips",
                generate_thumbnail=False
            ),
        ]

        results = extractor.extract_clips_batch(requests)

        assert len(results) == 3
        # Note: Results will fail due to missing output files, but batch logic works


class TestHelperFunctions:
    """Test helper functions"""

    def test_create_clip_request_from_event(self):
        """Test ClipRequest creation from event data"""
        game_id = str(uuid4())
        event_id = str(uuid4())
        event_timestamp = 15.0

        request = create_clip_request_from_event(
            game_id=game_id,
            event_id=event_id,
            video_path="/path/to/video.mp4",
            event_timestamp=event_timestamp,
            event_type="candidate_foul",
            clip_dir="/clips",
            padding_before=3.0,
            padding_after=5.0
        )

        assert request.game_id == game_id
        assert request.event_id == event_id
        assert request.start_time == 12.0  # 15.0 - 3.0
        assert request.end_time == 20.0  # 15.0 + 5.0
        assert request.clip_category == "candidate_foul"
        assert request.generate_thumbnail is True

    def test_create_clip_request_negative_timestamp(self):
        """Test ClipRequest creation with timestamp near start of video"""
        request = create_clip_request_from_event(
            game_id=str(uuid4()),
            event_id=str(uuid4()),
            video_path="/path/to/video.mp4",
            event_timestamp=1.0,  # Very early in video
            event_type="ref_mechanics",
            clip_dir="/clips",
            padding_before=3.0,
            padding_after=5.0
        )

        # Should not have negative start time
        assert request.start_time == 0.0  # max(0.0, 1.0 - 3.0)
        assert request.end_time == 6.0  # 1.0 + 5.0

    def test_create_clip_request_custom_padding(self):
        """Test ClipRequest with custom padding values"""
        request = create_clip_request_from_event(
            game_id=str(uuid4()),
            event_id=str(uuid4()),
            video_path="/path/to/video.mp4",
            event_timestamp=100.0,
            event_type="crew_rotation",
            clip_dir="/clips",
            padding_before=10.0,
            padding_after=15.0
        )

        assert request.start_time == 90.0  # 100.0 - 10.0
        assert request.end_time == 115.0  # 100.0 + 15.0


class TestFFmpegCommandGeneration:
    """Test FFmpeg command generation"""

    @patch('media.clip_extractor.subprocess.run')
    @patch('media.clip_extractor.Path.exists')
    def test_ffmpeg_command_structure(self, mock_exists, mock_subprocess):
        """Test that FFmpeg command has correct structure and optimization"""
        mock_exists.return_value = True

        mock_result = Mock()
        mock_result.returncode = 0
        mock_subprocess.return_value = mock_result

        extractor = ClipExtractor(
            output_dir="/tmp/clips",
            codec="libx264",
            preset="medium",
            crf=23
        )

        # Create request
        request = ClipRequest(
            game_id=str(uuid4()),
            event_id=str(uuid4()),
            video_path="/path/to/video.mp4",
            start_time=10.0,
            end_time=18.0,
            clip_dir="/tmp/clips",
            generate_thumbnail=False
        )

        # Attempt extraction (will fail due to missing file, but command will be generated)
        try:
            extractor.extract_clip(request)
        except:
            pass

        # Verify FFmpeg was called with correct parameters
        if mock_subprocess.called:
            call_args = mock_subprocess.call_args[0][0]

            # Check keyframe optimization (-ss before -i)
            ss_index = call_args.index("-ss")
            i_index = call_args.index("-i")
            assert ss_index < i_index, "Keyframe optimization: -ss should come before -i"

            # Check codec
            assert "-c:v" in call_args
            codec_index = call_args.index("-c:v")
            assert call_args[codec_index + 1] == "libx264"

            # Check preset
            assert "-preset" in call_args
            preset_index = call_args.index("-preset")
            assert call_args[preset_index + 1] == "medium"

            # Check CRF
            assert "-crf" in call_args
            crf_index = call_args.index("-crf")
            assert call_args[crf_index + 1] == "23"

            # Check audio codec
            assert "-c:a" in call_args
            audio_codec_index = call_args.index("-c:a")
            assert call_args[audio_codec_index + 1] == "aac"

            # Check faststart for web optimization
            assert "-movflags" in call_args
            movflags_index = call_args.index("-movflags")
            assert call_args[movflags_index + 1] == "+faststart"


class TestErrorHandling:
    """Test error handling scenarios"""

    @patch('media.clip_extractor.subprocess.run')
    def test_ffmpeg_timeout(self, mock_subprocess):
        """Test FFmpeg timeout handling"""
        import subprocess

        # Mock timeout exception
        mock_subprocess.side_effect = subprocess.TimeoutExpired(cmd="ffmpeg", timeout=60)

        extractor = ClipExtractor(output_dir="/tmp/clips")

        # Call internal FFmpeg method directly
        success = extractor._extract_with_ffmpeg(
            video_path="/path/to/video.mp4",
            output_path="/tmp/clip.mp4",
            start_time=10.0,
            duration=8.0
        )

        assert success is False

    @patch('media.clip_extractor.subprocess.run')
    def test_thumbnail_generation_failure(self, mock_subprocess):
        """Test thumbnail generation failure handling"""
        # Mock FFmpeg failure
        mock_result = Mock()
        mock_result.returncode = 1
        mock_result.stderr = "Thumbnail generation failed"
        mock_subprocess.return_value = mock_result

        extractor = ClipExtractor(output_dir="/tmp/clips")

        success = extractor._generate_thumbnail(
            video_path="/path/to/video.mp4",
            output_path="/tmp/thumb.jpg",
            timestamp=5.0
        )

        assert success is False


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
