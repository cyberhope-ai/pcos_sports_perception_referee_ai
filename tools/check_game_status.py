#!/usr/bin/env python3
"""
Game Status Checker CLI Tool
PCOS Sports Perception Referee AI - Phase 8

Checks the processing status of a game in the PCOS backend.

Usage:
    python tools/check_game_status.py --game-id <game_id>
    python tools/check_game_status.py --game-id <game_id> --backend-url http://localhost:8000
    python tools/check_game_status.py --game-id <game_id> --detailed
"""
import argparse
import requests
import sys
import json
import os
from typing import Optional


def check_game_status(game_id: str, backend_url: str = None, detailed: bool = False):
    """
    Check game processing status.

    Args:
        game_id: Game UUID
        backend_url: Backend base URL (default: http://localhost:8088)
        detailed: Show detailed event/clip counts

    Returns:
        dict: Game status information
    """
    # Default backend URL
    if backend_url is None:
        backend_url = os.getenv("PCOS_BACKEND_URL", "http://localhost:8088")

    print(f"🔍 Checking game status...")
    print(f"   Game ID: {game_id}")
    print(f"   Backend: {backend_url}")
    print()

    try:
        # 1. Get game list and find this game
        games_url = f"{backend_url}/api/v1/games"
        response = requests.get(games_url, timeout=10)
        response.raise_for_status()
        games_data = response.json()

        # Find our game
        game_info = None
        for game in games_data.get("games", []):
            if game["id"] == game_id:
                game_info = game
                break

        if not game_info:
            print(f"❌ Game not found: {game_id}", file=sys.stderr)
            print(f"   Available games:", file=sys.stderr)
            for game in games_data.get("games", [])[:5]:
                print(f"   - {game['id']} ({game['sport']}, status: {game['status']})", file=sys.stderr)
            sys.exit(1)

        # Display basic status
        print(f"📋 Game Status")
        print(f"   ID: {game_info['id']}")
        print(f"   Sport: {game_info['sport']}")
        print(f"   Processing Status: {game_info['status']}")
        print()

        # 2. Get events count if detailed mode
        if detailed:
            try:
                events_url = f"{backend_url}/api/v1/games/{game_id}/events"
                events_response = requests.get(events_url, timeout=10)
                events_response.raise_for_status()
                events_data = events_response.json()

                events_count = events_data.get("total_events", 0)
                print(f"📊 Events Analysis")
                print(f"   Total Events: {events_count}")

                # Count by event type
                event_types = {}
                for event in events_data.get("events", []):
                    event_type = event.get("event_type", "unknown")
                    event_types[event_type] = event_types.get(event_type, 0) + 1

                if event_types:
                    print(f"   Event Types:")
                    for event_type, count in event_types.items():
                        print(f"     - {event_type}: {count}")
                print()

            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 404:
                    print(f"📊 Events Analysis: No events yet (game still processing)")
                    print()
                else:
                    raise

            # 3. Get clips count
            try:
                clips_url = f"{backend_url}/api/v1/games/{game_id}/clips"
                clips_response = requests.get(clips_url, timeout=10)
                clips_response.raise_for_status()
                clips_data = clips_response.json()

                clips_count = clips_data.get("total_clips", 0)
                print(f"🎬 Clips Generated")
                print(f"   Total Clips: {clips_count}")
                print()

            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 404:
                    print(f"🎬 Clips Generated: No clips yet")
                    print()
                else:
                    raise

            # 4. Get officiating summary if available
            try:
                summary_url = f"{backend_url}/api/v1/games/{game_id}/officiating_summary"
                summary_response = requests.get(summary_url, timeout=10)
                summary_response.raise_for_status()
                summary_data = summary_response.json()

                print(f"📈 SkillDNA Summary")
                print(f"   Events Count: {summary_data.get('events_count', 0)}")
                print(f"   Candidate Fouls: {summary_data.get('candidate_foul_count', 0)}")
                print(f"   Ref Mechanics: {summary_data.get('ref_mechanics_count', 0)}")
                print(f"   Crew Rotations: {summary_data.get('crew_rotation_count', 0)}")
                print(f"   Fairness Index: {summary_data.get('fairness_index_avg', 0.0):.3f}")
                print(f"   Consistency Signal: {summary_data.get('consistency_signal_avg', 0.0):.3f}")
                print()

            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 404:
                    print(f"📈 SkillDNA Summary: Not available yet")
                    print()
                else:
                    raise

        # Determine readiness for Agent Bus
        status = game_info['status']
        if status == "completed" or status == "processing":
            print("✅ Game is ready for Agent Bus analysis")
            print(f"   Run: cd ../omniscient/agent_bus && python demo_cli.py --game-id {game_id}")
        elif status == "pending":
            print("⏳ Game is queued for processing - check again in a few minutes")
        elif status == "failed":
            print("❌ Game processing failed - check backend logs")
        else:
            print(f"⚠️  Unknown status: {status}")

        print()
        return game_info

    except requests.exceptions.ConnectionError:
        print(f"❌ Error: Cannot connect to PCOS backend at {backend_url}", file=sys.stderr)
        print(f"   Make sure the backend is running.", file=sys.stderr)
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
        import traceback
        traceback.print_exc()
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Check game processing status in PCOS backend",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic status check
  python tools/check_game_status.py --game-id abc123-def456-...

  # Detailed status with events/clips
  python tools/check_game_status.py --game-id abc123-def456-... --detailed

  # Use different backend URL
  python tools/check_game_status.py --game-id abc123-def456-... --backend-url http://localhost:8000
        """
    )

    parser.add_argument(
        "--game-id",
        type=str,
        required=True,
        help="Game UUID to check"
    )

    parser.add_argument(
        "--backend-url",
        type=str,
        default=None,
        help="PCOS backend base URL (default: http://localhost:8088 or $PCOS_BACKEND_URL)"
    )

    parser.add_argument(
        "--detailed",
        action="store_true",
        help="Show detailed event and clip counts"
    )

    args = parser.parse_args()

    # Check status
    check_game_status(
        game_id=args.game_id,
        backend_url=args.backend_url,
        detailed=args.detailed
    )


if __name__ == "__main__":
    main()
