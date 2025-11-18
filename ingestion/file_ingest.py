"""
File-based Video Ingestion

Handles local video file ingestion.
Phase 2 integration: Connect to actual video processing.
"""
from typing import Optional
import os
from pathlib import Path


class FileIngestor:
    """
    Ingest videos from local filesystem.

    TODO Phase 2:
    - Validate video formats
    - Extract metadata
    - Generate thumbnails
    - Emit VideoIngestEvent
    """

    async def ingest(self, video_path: str, game_id: str) -> dict:
        """
        Ingest a local video file.

        Args:
            video_path: path to video file
            game_id: game identifier

        Returns:
            Ingestion result dict
        """
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video not found: {video_path}")

        # TODO: Validate format, extract metadata
        return {
            "game_id": game_id,
            "video_path": video_path,
            "status": "ingested"
        }
