#!/usr/bin/env python3
"""
Video Ingestion CLI Tool
PCOS Sports Perception Referee AI - Phase 8

Ingests a basketball video into the PCOS backend pipeline.

Usage:
    python tools/ingest_video.py --video-path /path/to/game.mp4
    python tools/ingest_video.py --video-path /path/to/game.mp4 --sport basketball
    python tools/ingest_video.py --video-path /path/to/game.mp4 --backend-url http://localhost:8000
"""
import argparse
import requests
import sys
import json
import os
from pathlib import Path


def ingest_video(video_path: str, sport: str = "basketball", backend_url: str = None):
    """
    Ingest a video file into the PCOS backend.

    Args:
        video_path: Path to video file (local or URL)
        sport: Sport type (default: basketball)
        backend_url: Backend base URL (default: http://localhost:8088)

    Returns:
        dict: Response with game_id and status
    """
    # Default backend URL - check environment variable or use localhost:8088
    if backend_url is None:
        backend_url = os.getenv("PCOS_BACKEND_URL", "http://localhost:8088")

    # Validate video path exists if local file
    if not video_path.startswith("http"):
        if not os.path.exists(video_path):
            print(f"❌ Error: Video file not found: {video_path}", file=sys.stderr)
            sys.exit(1)

        # Convert to absolute path
        video_path = str(Path(video_path).resolve())

    # API endpoint
    ingest_url = f"{backend_url}/api/v1/ingest/video"

    print(f"🎬 Ingesting video into PCOS backend...")
    print(f"   Video: {video_path}")
    print(f"   Sport: {sport}")
    print(f"   Backend: {backend_url}")
    print()

    try:
        # Make POST request to ingestion endpoint
        response = requests.post(
            ingest_url,
            params={
                "video_path": video_path,
                "sport": sport
            },
            timeout=30
        )

        response.raise_for_status()
        result = response.json()

        # Success
        print("✅ Video ingestion successful!")
        print()
        print(f"📋 Game ID: {result['game_id']}")
        print(f"📊 Status: {result['status']}")
        print(f"💬 Message: {result.get('message', 'Processing started')}")
        print()
        print("🔍 Next steps:")
        print(f"   1. Check status: python tools/check_game_status.py --game-id {result['game_id']}")
        print(f"   2. Run Agent Bus analysis: cd ../omniscient/agent_bus && python demo_cli.py --game-id {result['game_id']}")
        print()

        return result

    except requests.exceptions.ConnectionError:
        print(f"❌ Error: Cannot connect to PCOS backend at {backend_url}", file=sys.stderr)
        print(f"   Make sure the backend is running:", file=sys.stderr)
        print(f"   cd pcos_sports_perception_referee_ai", file=sys.stderr)
        print(f"   uvicorn main:app --reload --host 0.0.0.0 --port 8088", file=sys.stderr)
        sys.exit(1)

    except requests.exceptions.HTTPError as e:
        print(f"❌ HTTP Error: {e}", file=sys.stderr)
        try:
            error_detail = e.response.json()
            print(f"   Detail: {json.dumps(error_detail, indent=2)}", file=sys.stderr)
        except:
            print(f"   Response: {e.response.text}", file=sys.stderr)
        sys.exit(1)

    except Exception as e:
        print(f"❌ Unexpected error: {e}", file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Ingest basketball video into PCOS backend pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Ingest local video file
  python tools/ingest_video.py --video-path /home/videos/game.mp4

  # Ingest with specific backend URL
  python tools/ingest_video.py --video-path /home/videos/game.mp4 --backend-url http://localhost:8000

  # Ingest video URL
  python tools/ingest_video.py --video-path https://example.com/game.mp4
        """
    )

    parser.add_argument(
        "--video-path",
        type=str,
        required=True,
        help="Path to video file (local path or URL)"
    )

    parser.add_argument(
        "--sport",
        type=str,
        default="basketball",
        choices=["basketball", "football"],
        help="Sport type (default: basketball)"
    )

    parser.add_argument(
        "--backend-url",
        type=str,
        default=None,
        help="PCOS backend base URL (default: http://localhost:8088 or $PCOS_BACKEND_URL)"
    )

    args = parser.parse_args()

    # Run ingestion
    ingest_video(
        video_path=args.video_path,
        sport=args.sport,
        backend_url=args.backend_url
    )


if __name__ == "__main__":
    main()
