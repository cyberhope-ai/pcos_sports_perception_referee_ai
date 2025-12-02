"""
Phase 12.6: YouTube Video Ingestion Module

Downloads YouTube videos using yt-dlp and prepares them for processing.
"""

import asyncio
import logging
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Optional
from uuid import UUID

import yt_dlp

logger = logging.getLogger(__name__)


@dataclass
class YouTubeMetadata:
    """Metadata extracted from YouTube video."""
    video_id: str
    title: str
    duration: int  # seconds
    thumbnail_url: str
    channel: str
    view_count: Optional[int] = None
    description: Optional[str] = None


@dataclass
class DownloadResult:
    """Result of a YouTube download operation."""
    success: bool
    video_path: Optional[Path] = None
    metadata: Optional[YouTubeMetadata] = None
    error: Optional[str] = None


def extract_video_id(url: str) -> Optional[str]:
    """
    Extract YouTube video ID from various URL formats.

    Supports:
    - https://www.youtube.com/watch?v=VIDEO_ID
    - https://youtu.be/VIDEO_ID
    - https://www.youtube.com/embed/VIDEO_ID
    """
    patterns = [
        r'(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})',
    ]

    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)

    return None


async def fetch_youtube_metadata(url: str) -> Optional[YouTubeMetadata]:
    """
    Fetch metadata for a YouTube video without downloading.

    Uses yt-dlp's extract_info with download=False.
    """
    video_id = extract_video_id(url)
    if not video_id:
        logger.error(f"Could not extract video ID from URL: {url}")
        return None

    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
    }

    try:
        loop = asyncio.get_event_loop()

        def _extract():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                return ydl.extract_info(url, download=False)

        info = await loop.run_in_executor(None, _extract)

        if not info:
            return None

        return YouTubeMetadata(
            video_id=video_id,
            title=info.get('title', 'Unknown'),
            duration=info.get('duration', 0),
            thumbnail_url=info.get('thumbnail', f'https://img.youtube.com/vi/{video_id}/maxresdefault.jpg'),
            channel=info.get('uploader', 'Unknown'),
            view_count=info.get('view_count'),
            description=info.get('description'),
        )

    except Exception as e:
        logger.error(f"Failed to fetch YouTube metadata: {e}")
        return None


async def download_youtube_video(
    url: str,
    output_dir: Path,
    game_id: UUID,
    progress_callback: Optional[callable] = None,
) -> DownloadResult:
    """
    Download a YouTube video to local storage.

    Args:
        url: YouTube video URL
        output_dir: Directory to save the video
        game_id: UUID for the game (used in filename)
        progress_callback: Optional callback for download progress (0-100)

    Returns:
        DownloadResult with success status and video path
    """
    video_id = extract_video_id(url)
    if not video_id:
        return DownloadResult(
            success=False,
            error=f"Could not extract video ID from URL: {url}"
        )

    # Ensure output directory exists
    output_dir.mkdir(parents=True, exist_ok=True)

    # Output filename template
    output_template = str(output_dir / f"{game_id}.%(ext)s")

    def progress_hook(d):
        """Hook for yt-dlp progress updates."""
        if progress_callback and d['status'] == 'downloading':
            try:
                # Calculate percentage
                downloaded = d.get('downloaded_bytes', 0)
                total = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
                if total > 0:
                    percent = int((downloaded / total) * 100)
                    progress_callback(percent)
            except Exception:
                pass

    ydl_opts = {
        # Prefer h264 codec, exclude AV1 (hardware decode issues), limit to 1080p
        # Format priority: h264 mp4 > any mp4 > h264 any > fallback to best
        'format': (
            'bestvideo[height<=1080][vcodec^=avc1][ext=mp4]+bestaudio[ext=m4a]/'
            'bestvideo[height<=1080][vcodec^=avc1]+bestaudio/'
            'bestvideo[height<=1080][ext=mp4][vcodec!=av01]+bestaudio[ext=m4a]/'
            'bestvideo[height<=1080][vcodec!=av01]+bestaudio/'
            'best[height<=1080][ext=mp4]/best[height<=1080]'
        ),
        'outtmpl': output_template,
        'quiet': True,
        'no_warnings': True,
        'progress_hooks': [progress_hook],
        'merge_output_format': 'mp4',
        # Prefer ffmpeg for merging to ensure h264 output
        'postprocessors': [{
            'key': 'FFmpegVideoConvertor',
            'preferedformat': 'mp4',
        }],
        # Limit video length to prevent abuse (2 hours max)
        'match_filter': yt_dlp.utils.match_filter_func('duration < 7200'),
    }

    try:
        loop = asyncio.get_event_loop()

        def _download():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                return info

        logger.info(f"Starting YouTube download for game {game_id}: {url}")
        info = await loop.run_in_executor(None, _download)

        if not info:
            return DownloadResult(
                success=False,
                error="Failed to download video - no info returned"
            )

        # Find the downloaded file
        video_path = output_dir / f"{game_id}.mp4"
        if not video_path.exists():
            # Try with webm extension
            video_path = output_dir / f"{game_id}.webm"
            if not video_path.exists():
                # Try to find any file with the game_id
                for ext in ['mp4', 'webm', 'mkv', 'avi']:
                    candidate = output_dir / f"{game_id}.{ext}"
                    if candidate.exists():
                        video_path = candidate
                        break

        if not video_path.exists():
            return DownloadResult(
                success=False,
                error=f"Video file not found after download in {output_dir}"
            )

        metadata = YouTubeMetadata(
            video_id=video_id,
            title=info.get('title', 'Unknown'),
            duration=info.get('duration', 0),
            thumbnail_url=info.get('thumbnail', f'https://img.youtube.com/vi/{video_id}/maxresdefault.jpg'),
            channel=info.get('uploader', 'Unknown'),
            view_count=info.get('view_count'),
            description=info.get('description'),
        )

        logger.info(f"YouTube download complete for game {game_id}: {video_path}")

        return DownloadResult(
            success=True,
            video_path=video_path,
            metadata=metadata,
        )

    except yt_dlp.utils.DownloadError as e:
        error_msg = str(e)
        if 'Video unavailable' in error_msg:
            error_msg = "Video is unavailable (may be private or deleted)"
        elif 'Sign in' in error_msg:
            error_msg = "Video requires sign-in (age-restricted or members-only)"
        elif 'duration' in error_msg.lower():
            error_msg = "Video exceeds maximum duration (2 hours)"

        logger.error(f"YouTube download failed: {error_msg}")
        return DownloadResult(success=False, error=error_msg)

    except Exception as e:
        logger.error(f"Unexpected error during YouTube download: {e}")
        return DownloadResult(success=False, error=str(e))
