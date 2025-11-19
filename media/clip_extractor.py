"""
Clip Extraction Engine - Phase 4

Extracts video clips around detected events using FFmpeg.

Supports:
- Event-based clip extraction (±3-5 seconds around event)
- Efficient FFmpeg encoding (H.264/H.265)
- Thumbnail generation
- Batch processing
- Error handling and logging

Follows PCOS Pipeline Templates for media processing.
"""
import subprocess
import logging
from pathlib import Path
from typing import List, Optional, Tuple
from pydantic import BaseModel, Field
from uuid import UUID, uuid4
import os

logger = logging.getLogger(__name__)


class ClipRequest(BaseModel):
    """Request to extract a clip from a video"""
    game_id: str
    event_id: str
    video_path: str
    start_time: float  # seconds
    end_time: float  # seconds
    clip_dir: str  # base directory for clips
    generate_thumbnail: bool = True
    clip_category: Optional[str] = None  # "candidate_foul", "ref_mechanics", etc.


class ClipResult(BaseModel):
    """Result of clip extraction"""
    clip_id: str
    game_id: str
    event_id: str
    file_path: str
    thumbnail_path: Optional[str] = None
    start_time: float
    end_time: float
    duration: float
    success: bool
    error: Optional[str] = None


class ClipExtractor:
    """
    FFmpeg-based clip extraction engine.

    Phase 4 Implementation:
    - Extracts clips from source video using FFmpeg
    - Supports H.264/H.265 encoding
    - Generates thumbnails at mid-point
    - Batch processing for multiple events
    - Efficient keyframe seeking
    """

    def __init__(
        self,
        output_dir: str = "./clips",
        codec: str = "libx264",
        preset: str = "medium",
        crf: int = 23,
        thumbnail_size: str = "320x180"
    ):
        """
        Initialize clip extractor.

        Args:
            output_dir: Base directory for extracted clips
            codec: Video codec (libx264, libx265, copy)
            preset: FFmpeg preset (ultrafast, fast, medium, slow)
            crf: Constant Rate Factor for quality (18-28, lower = better)
            thumbnail_size: Thumbnail dimensions (WxH)
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.codec = codec
        self.preset = preset
        self.crf = crf
        self.thumbnail_size = thumbnail_size

        logger.info(f"ClipExtractor initialized: output_dir={output_dir}, codec={codec}")

    def extract_clip(self, request: ClipRequest) -> ClipResult:
        """
        Extract a single clip from video.

        Args:
            request: ClipRequest with video path, timestamps, etc.

        Returns:
            ClipResult with file paths and status
        """
        try:
            # Validate input
            if not Path(request.video_path).exists():
                return ClipResult(
                    clip_id=str(uuid4()),
                    game_id=request.game_id,
                    event_id=request.event_id,
                    file_path="",
                    start_time=request.start_time,
                    end_time=request.end_time,
                    duration=request.end_time - request.start_time,
                    success=False,
                    error=f"Video file not found: {request.video_path}"
                )

            # Generate output paths
            clip_id = str(uuid4())
            duration = request.end_time - request.start_time

            # Create game-specific subdirectory
            game_dir = self.output_dir / request.game_id
            game_dir.mkdir(parents=True, exist_ok=True)

            # Generate clip filename
            clip_filename = f"clip_{clip_id}.mp4"
            clip_path = game_dir / clip_filename

            # Generate thumbnail filename
            thumbnail_path = None
            if request.generate_thumbnail:
                thumbnail_filename = f"thumb_{clip_id}.jpg"
                thumbnail_path = game_dir / thumbnail_filename

            # Extract clip using FFmpeg
            success = self._extract_with_ffmpeg(
                video_path=request.video_path,
                output_path=str(clip_path),
                start_time=request.start_time,
                duration=duration
            )

            if not success:
                return ClipResult(
                    clip_id=clip_id,
                    game_id=request.game_id,
                    event_id=request.event_id,
                    file_path="",
                    start_time=request.start_time,
                    end_time=request.end_time,
                    duration=duration,
                    success=False,
                    error="FFmpeg extraction failed"
                )

            # Generate thumbnail if requested
            if request.generate_thumbnail and thumbnail_path:
                thumb_success = self._generate_thumbnail(
                    video_path=str(clip_path),
                    output_path=str(thumbnail_path),
                    timestamp=duration / 2.0  # Mid-point
                )
                if not thumb_success:
                    logger.warning(f"Thumbnail generation failed for clip {clip_id}")
                    thumbnail_path = None

            logger.info(f"Clip extracted successfully: {clip_path}")

            return ClipResult(
                clip_id=clip_id,
                game_id=request.game_id,
                event_id=request.event_id,
                file_path=str(clip_path),
                thumbnail_path=str(thumbnail_path) if thumbnail_path else None,
                start_time=request.start_time,
                end_time=request.end_time,
                duration=duration,
                success=True
            )

        except Exception as e:
            logger.error(f"Clip extraction failed: {e}", exc_info=True)
            return ClipResult(
                clip_id=str(uuid4()),
                game_id=request.game_id,
                event_id=request.event_id,
                file_path="",
                start_time=request.start_time,
                end_time=request.end_time,
                duration=request.end_time - request.start_time,
                success=False,
                error=str(e)
            )

    def extract_clips_batch(self, requests: List[ClipRequest]) -> List[ClipResult]:
        """
        Extract multiple clips from video(s).

        Args:
            requests: List of ClipRequests

        Returns:
            List of ClipResults
        """
        results = []
        for request in requests:
            result = self.extract_clip(request)
            results.append(result)

        successful = sum(1 for r in results if r.success)
        logger.info(f"Batch extraction complete: {successful}/{len(results)} successful")

        return results

    def _extract_with_ffmpeg(
        self,
        video_path: str,
        output_path: str,
        start_time: float,
        duration: float
    ) -> bool:
        """
        Extract clip using FFmpeg.

        Uses efficient keyframe seeking (-ss before -i) and re-encoding.

        Args:
            video_path: Source video path
            output_path: Output clip path
            start_time: Start time in seconds
            duration: Duration in seconds

        Returns:
            True if successful, False otherwise
        """
        try:
            # FFmpeg command with keyframe seeking optimization
            # -ss before -i for fast seeking
            # -t for duration
            # -c:v for video codec
            # -preset for encoding speed/quality tradeoff
            # -crf for quality control
            # -c:a copy for audio passthrough (fast)
            cmd = [
                "ffmpeg",
                "-y",  # Overwrite output
                "-ss", str(start_time),  # Seek to start (before -i for keyframe optimization)
                "-i", video_path,  # Input file
                "-t", str(duration),  # Duration
                "-c:v", self.codec,  # Video codec
                "-preset", self.preset,  # Encoding preset
                "-crf", str(self.crf),  # Quality
                "-c:a", "aac",  # Audio codec
                "-b:a", "128k",  # Audio bitrate
                "-movflags", "+faststart",  # Web optimization
                output_path
            ]

            # Run FFmpeg
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60  # 60 second timeout
            )

            if result.returncode != 0:
                logger.error(f"FFmpeg extraction failed: {result.stderr}")
                return False

            # Verify output file exists
            if not Path(output_path).exists():
                logger.error(f"Output file not created: {output_path}")
                return False

            return True

        except subprocess.TimeoutExpired:
            logger.error(f"FFmpeg extraction timed out for {video_path}")
            return False
        except Exception as e:
            logger.error(f"FFmpeg extraction error: {e}", exc_info=True)
            return False

    def _generate_thumbnail(
        self,
        video_path: str,
        output_path: str,
        timestamp: float = 0.0
    ) -> bool:
        """
        Generate thumbnail from video.

        Args:
            video_path: Source video path
            output_path: Output thumbnail path
            timestamp: Time to extract frame (seconds)

        Returns:
            True if successful, False otherwise
        """
        try:
            cmd = [
                "ffmpeg",
                "-y",  # Overwrite output
                "-ss", str(timestamp),  # Seek to timestamp
                "-i", video_path,  # Input file
                "-vframes", "1",  # Extract single frame
                "-s", self.thumbnail_size,  # Resize
                "-q:v", "2",  # Quality (1-31, lower = better)
                output_path
            ]

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode != 0:
                logger.error(f"Thumbnail generation failed: {result.stderr}")
                return False

            return Path(output_path).exists()

        except Exception as e:
            logger.error(f"Thumbnail generation error: {e}", exc_info=True)
            return False

    def get_video_duration(self, video_path: str) -> Optional[float]:
        """
        Get video duration using FFprobe.

        Args:
            video_path: Path to video file

        Returns:
            Duration in seconds, or None if failed
        """
        try:
            cmd = [
                "ffprobe",
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                video_path
            ]

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=10
            )

            if result.returncode == 0:
                return float(result.stdout.strip())

            return None

        except Exception as e:
            logger.error(f"Failed to get video duration: {e}")
            return None


def create_clip_request_from_event(
    game_id: str,
    event_id: str,
    video_path: str,
    event_timestamp: float,
    event_type: str,
    clip_dir: str,
    padding_before: float = 3.0,
    padding_after: float = 5.0
) -> ClipRequest:
    """
    Helper function to create ClipRequest from event data.

    Args:
        game_id: Game UUID
        event_id: Event UUID
        video_path: Path to source video
        event_timestamp: Event timestamp in seconds
        event_type: Event type (for categorization)
        clip_dir: Base clip directory
        padding_before: Seconds before event (default 3.0)
        padding_after: Seconds after event (default 5.0)

    Returns:
        ClipRequest ready for extraction
    """
    start_time = max(0.0, event_timestamp - padding_before)
    end_time = event_timestamp + padding_after

    return ClipRequest(
        game_id=game_id,
        event_id=event_id,
        video_path=video_path,
        start_time=start_time,
        end_time=end_time,
        clip_dir=clip_dir,
        generate_thumbnail=True,
        clip_category=event_type
    )
