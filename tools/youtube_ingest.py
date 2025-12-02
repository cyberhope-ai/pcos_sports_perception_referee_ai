#!/usr/bin/env python3
"""
YouTube Video Download and Ingest Tool for RefQuest
Downloads basketball game videos from YouTube and ingests them for AI processing.

Usage:
    # Search for basketball videos
    python tools/youtube_ingest.py search "NBA highlights 2024"

    # Download and ingest a specific video
    python tools/youtube_ingest.py ingest "https://www.youtube.com/watch?v=VIDEO_ID"

    # Download only (no processing)
    python tools/youtube_ingest.py download "https://www.youtube.com/watch?v=VIDEO_ID"

    # List downloaded videos ready for ingestion
    python tools/youtube_ingest.py list
"""

import argparse
import subprocess
import sys
import json
import os
import requests
from pathlib import Path
from datetime import datetime

# Configuration
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8088")
DOWNLOAD_DIR = Path(__file__).parent.parent / "videos" / "youtube"
YTDLP_PATH = Path(__file__).parent.parent / "venv" / "bin" / "yt-dlp"

def ensure_download_dir():
    """Ensure download directory exists."""
    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    return DOWNLOAD_DIR

def search_youtube(query: str, limit: int = 10):
    """Search YouTube for videos matching query."""
    print(f"\n🔍 Searching YouTube for: '{query}'")
    print("-" * 60)

    cmd = [
        str(YTDLP_PATH),
        f"ytsearch{limit}:{query}",
        "--get-id",
        "--get-title",
        "--get-duration",
        "--no-warnings",
        "--flat-playlist"
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)

        if result.returncode != 0:
            print(f"❌ Search failed: {result.stderr}")
            return []

        # Parse output (alternating: title, id, duration)
        lines = result.stdout.strip().split('\n')
        videos = []

        i = 0
        while i < len(lines) - 2:
            title = lines[i]
            video_id = lines[i + 1]
            duration = lines[i + 2] if i + 2 < len(lines) else "N/A"

            videos.append({
                'id': video_id,
                'title': title[:60] + '...' if len(title) > 60 else title,
                'duration': duration,
                'url': f"https://www.youtube.com/watch?v={video_id}"
            })
            i += 3

        # Display results
        print(f"\n📺 Found {len(videos)} videos:\n")
        for idx, v in enumerate(videos, 1):
            print(f"  [{idx}] {v['title']}")
            print(f"      Duration: {v['duration']} | URL: {v['url']}\n")

        return videos

    except subprocess.TimeoutExpired:
        print("❌ Search timed out")
        return []
    except Exception as e:
        print(f"❌ Error: {e}")
        return []

def download_video(url: str, output_name: str = None) -> Path:
    """Download video from YouTube."""
    ensure_download_dir()

    # Generate output filename
    if output_name:
        output_template = str(DOWNLOAD_DIR / f"{output_name}.%(ext)s")
    else:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_template = str(DOWNLOAD_DIR / f"game_{timestamp}_%(title).30s.%(ext)s")

    print(f"\n📥 Downloading video from: {url}")
    print(f"   Output: {DOWNLOAD_DIR}")
    print("-" * 60)

    # Prefer h264 codec, exclude AV1 (hardware decode issues on some platforms)
    # Format priority: h264 mp4 > any mp4 excluding AV1 > fallback
    format_spec = (
        "bestvideo[height<=1080][vcodec^=avc1][ext=mp4]+bestaudio[ext=m4a]/"
        "bestvideo[height<=1080][vcodec^=avc1]+bestaudio/"
        "bestvideo[height<=1080][ext=mp4][vcodec!=av01]+bestaudio[ext=m4a]/"
        "bestvideo[height<=1080][vcodec!=av01]+bestaudio/"
        "best[height<=1080][ext=mp4]/best[height<=1080]"
    )

    cmd = [
        str(YTDLP_PATH),
        url,
        "-f", format_spec,
        "--merge-output-format", "mp4",
        "-o", output_template,
        "--no-warnings",
        "--progress",
        "--print", "after_move:filepath"
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=1800)  # 30 min timeout

        if result.returncode != 0:
            print(f"❌ Download failed: {result.stderr}")
            return None

        # Get the output filepath from stdout
        filepath = result.stdout.strip().split('\n')[-1]

        if filepath and Path(filepath).exists():
            file_size = Path(filepath).stat().st_size / (1024 * 1024)  # MB
            print(f"\n✅ Download complete!")
            print(f"   File: {filepath}")
            print(f"   Size: {file_size:.1f} MB")
            return Path(filepath)
        else:
            # Try to find the most recent file
            files = sorted(DOWNLOAD_DIR.glob("*.mp4"), key=lambda x: x.stat().st_mtime, reverse=True)
            if files:
                print(f"\n✅ Download complete!")
                print(f"   File: {files[0]}")
                return files[0]
            print("❌ Could not locate downloaded file")
            return None

    except subprocess.TimeoutExpired:
        print("❌ Download timed out (>30 minutes)")
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def ingest_video(video_path: Path, sport: str = "basketball") -> dict:
    """Ingest video into RefQuest backend for AI processing."""
    print(f"\n🚀 Ingesting video into RefQuest AI")
    print(f"   File: {video_path}")
    print(f"   Sport: {sport}")
    print("-" * 60)

    if not video_path.exists():
        print(f"❌ Video file not found: {video_path}")
        return None

    url = f"{BACKEND_URL}/api/v1/ingest/video"

    try:
        with open(video_path, 'rb') as f:
            files = {'file': (video_path.name, f, 'video/mp4')}
            data = {'sport': sport}

            print("   Uploading video to backend...")
            response = requests.post(url, files=files, data=data, timeout=300)

        if response.status_code == 200:
            result = response.json()
            print(f"\n✅ Ingestion started!")
            print(f"   Game ID: {result.get('game_id')}")
            print(f"   Status: {result.get('status')}")
            print(f"   Message: {result.get('message')}")
            print(f"\n💡 Check processing status:")
            print(f"   curl {BACKEND_URL}/api/v1/games/{result.get('game_id')}")
            return result
        else:
            print(f"❌ Ingestion failed: HTTP {response.status_code}")
            print(f"   {response.text}")
            return None

    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to backend at {BACKEND_URL}")
        print("   Is the backend running? Try: ./START_REFQUEST.sh --full")
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def list_downloaded():
    """List downloaded videos ready for ingestion."""
    ensure_download_dir()

    print(f"\n📁 Downloaded Videos in: {DOWNLOAD_DIR}")
    print("-" * 60)

    files = sorted(DOWNLOAD_DIR.glob("*.mp4"), key=lambda x: x.stat().st_mtime, reverse=True)

    if not files:
        print("   No videos found. Use 'download' command first.")
        return

    for idx, f in enumerate(files, 1):
        size = f.stat().st_size / (1024 * 1024)
        mtime = datetime.fromtimestamp(f.stat().st_mtime).strftime("%Y-%m-%d %H:%M")
        print(f"\n  [{idx}] {f.name}")
        print(f"      Size: {size:.1f} MB | Modified: {mtime}")
        print(f"      Path: {f}")

def check_status(game_id: str):
    """Check processing status of a game."""
    url = f"{BACKEND_URL}/api/v1/games/{game_id}"

    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"\n📊 Game Status: {game_id}")
            print("-" * 60)
            print(f"   Status: {data.get('processing_status')}")
            print(f"   Sport: {data.get('sport')}")
            print(f"   Video: {data.get('video_path')}")

            # Get events count
            events_url = f"{BACKEND_URL}/api/v1/games/{game_id}/events"
            events_resp = requests.get(events_url, timeout=10)
            if events_resp.status_code == 200:
                events = events_resp.json()
                print(f"   Events detected: {len(events)}")

            return data
        else:
            print(f"❌ Game not found: {game_id}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(
        description="YouTube Video Download and Ingest Tool for RefQuest",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s search "NBA Lakers Celtics highlights"
  %(prog)s download "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  %(prog)s ingest "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  %(prog)s ingest-local /path/to/video.mp4
  %(prog)s list
  %(prog)s status <game_id>
        """
    )

    subparsers = parser.add_subparsers(dest='command', help='Commands')

    # Search command
    search_parser = subparsers.add_parser('search', help='Search YouTube for videos')
    search_parser.add_argument('query', help='Search query (e.g., "NBA highlights 2024")')
    search_parser.add_argument('-n', '--limit', type=int, default=10, help='Number of results')

    # Download command
    download_parser = subparsers.add_parser('download', help='Download video from YouTube')
    download_parser.add_argument('url', help='YouTube video URL')
    download_parser.add_argument('-o', '--output', help='Output filename (without extension)')

    # Ingest command (download + process)
    ingest_parser = subparsers.add_parser('ingest', help='Download and ingest video')
    ingest_parser.add_argument('url', help='YouTube video URL')
    ingest_parser.add_argument('--sport', default='basketball', help='Sport type')

    # Ingest local file
    local_parser = subparsers.add_parser('ingest-local', help='Ingest local video file')
    local_parser.add_argument('path', help='Path to local video file')
    local_parser.add_argument('--sport', default='basketball', help='Sport type')

    # List command
    subparsers.add_parser('list', help='List downloaded videos')

    # Status command
    status_parser = subparsers.add_parser('status', help='Check game processing status')
    status_parser.add_argument('game_id', help='Game ID to check')

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    if args.command == 'search':
        search_youtube(args.query, args.limit)

    elif args.command == 'download':
        download_video(args.url, args.output)

    elif args.command == 'ingest':
        video_path = download_video(args.url)
        if video_path:
            ingest_video(video_path, args.sport)

    elif args.command == 'ingest-local':
        ingest_video(Path(args.path), args.sport)

    elif args.command == 'list':
        list_downloaded()

    elif args.command == 'status':
        check_status(args.game_id)

if __name__ == "__main__":
    main()
