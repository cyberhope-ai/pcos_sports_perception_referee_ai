"""
PCOS MCP Client - Phase 13.2

Backend client for bidirectional communication with PCOS MCP Kernel.
Handles outbound event publishing (HTTP + WebSocket) and local event store.
"""
import asyncio
import json
import logging
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID, uuid4

import httpx
import websockets
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..models import PcosEvent

logger = logging.getLogger(__name__)

# PCOS MCP Kernel endpoints
PCOS_MCP_HTTP_URL = "http://127.0.0.1:8765"  # RPC server
PCOS_MCP_WS_URL = "ws://127.0.0.1:7890/telemetry"  # Telemetry WebSocket


class MCPClient:
    """
    MCP Client for PCOS Kernel integration.

    Provides:
    - HTTP event publishing to MCP Kernel
    - WebSocket event streaming
    - Local pcos_event_store persistence
    """

    def __init__(self):
        self.enabled = settings.PCOS_EVENT_BUS_ENABLED
        self.http_url = settings.PCOS_EVENT_BUS_URL or PCOS_MCP_HTTP_URL
        self.ws_url = PCOS_MCP_WS_URL
        self._ws_connection = None
        self._ws_lock = asyncio.Lock()
        logger.info(f"MCP Client initialized: enabled={self.enabled}, http={self.http_url}")

    async def send_event(
        self,
        event: Dict[str, Any],
        db: Optional[AsyncSession] = None,
        correlation_id: Optional[str] = None
    ) -> bool:
        """
        Send event to PCOS MCP Kernel via HTTP.

        Also stores event in local pcos_event_store for audit.

        Args:
            event: Event dictionary with 'type' and 'payload' keys
            db: Optional database session for persistence
            correlation_id: Optional correlation ID for tracing

        Returns:
            Success boolean
        """
        event_type = event.get("type", "UNKNOWN")
        source = event.get("source", "refiq")
        payload = event.get("payload", event)

        # Generate correlation ID if not provided
        if not correlation_id:
            correlation_id = str(uuid4())

        # Store locally first (always)
        if db:
            try:
                pcos_event = PcosEvent(
                    id=uuid4(),
                    event_type=event_type,
                    source=source,
                    payload=payload,
                    correlation_id=correlation_id,
                    created_at=datetime.utcnow()
                )
                db.add(pcos_event)
                await db.flush()
                logger.debug(f"Stored PCOS event locally: {event_type} ({correlation_id})")
            except Exception as e:
                logger.error(f"Failed to store PCOS event locally: {e}")

        # Send to MCP Kernel if enabled
        if not self.enabled:
            logger.debug(f"[EMULATOR] Would send to MCP: {event_type}")
            return True

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(
                    f"{self.http_url}/events",
                    json={
                        "type": event_type,
                        "source": source,
                        "payload": payload,
                        "correlation_id": correlation_id,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                )
                if response.status_code in (200, 201, 202):
                    logger.info(f"Sent event to MCP Kernel: {event_type}")
                    return True
                else:
                    logger.warning(f"MCP Kernel returned {response.status_code}: {response.text}")
                    return False
        except httpx.ConnectError:
            logger.warning(f"MCP Kernel not reachable at {self.http_url}")
            return False
        except Exception as e:
            logger.error(f"Failed to send event to MCP Kernel: {e}")
            return False

    async def send_event_ws(self, event: Dict[str, Any]) -> bool:
        """
        Send event to PCOS MCP Kernel via WebSocket.

        Maintains persistent connection for low-latency streaming.

        Args:
            event: Event dictionary

        Returns:
            Success boolean
        """
        if not self.enabled:
            logger.debug(f"[EMULATOR] Would stream to MCP WS: {event.get('type', 'UNKNOWN')}")
            return True

        try:
            async with self._ws_lock:
                # Establish connection if not connected
                if self._ws_connection is None or self._ws_connection.closed:
                    try:
                        self._ws_connection = await websockets.connect(
                            self.ws_url,
                            ping_interval=30,
                            ping_timeout=10
                        )
                        logger.info(f"Connected to MCP Kernel WebSocket: {self.ws_url}")
                    except Exception as e:
                        logger.warning(f"Could not connect to MCP WebSocket: {e}")
                        self._ws_connection = None
                        return False

                # Send event
                try:
                    await self._ws_connection.send(json.dumps(event))
                    logger.debug(f"Sent event via WebSocket: {event.get('type', 'UNKNOWN')}")
                    return True
                except websockets.ConnectionClosed:
                    logger.warning("WebSocket connection closed, will reconnect on next send")
                    self._ws_connection = None
                    return False

        except Exception as e:
            logger.error(f"WebSocket send error: {e}")
            return False

    async def close(self):
        """Close WebSocket connection."""
        if self._ws_connection and not self._ws_connection.closed:
            await self._ws_connection.close()
            self._ws_connection = None
            logger.info("Closed MCP WebSocket connection")


# Singleton instance
_mcp_client: Optional[MCPClient] = None


def get_mcp_client() -> MCPClient:
    """Get or create singleton MCP client instance."""
    global _mcp_client
    if _mcp_client is None:
        _mcp_client = MCPClient()
    return _mcp_client


# Convenience functions matching Phase 13.2 spec

async def send_event(
    event: Dict[str, Any],
    db: Optional[AsyncSession] = None,
    correlation_id: Optional[str] = None
) -> bool:
    """
    Send event to PCOS MCP Kernel (HTTP).

    Convenience wrapper for MCPClient.send_event().
    """
    client = get_mcp_client()
    return await client.send_event(event, db, correlation_id)


async def send_event_ws(event: Dict[str, Any]) -> bool:
    """
    Send event to PCOS MCP Kernel (WebSocket).

    Convenience wrapper for MCPClient.send_event_ws().
    """
    client = get_mcp_client()
    return await client.send_event_ws(event)


# RefIQ-specific event helpers

async def emit_ingestion_started(
    game_id: UUID,
    job_id: UUID,
    source_url: str,
    source_type: str,
    db: Optional[AsyncSession] = None
) -> bool:
    """Emit OFFICIATING.INGESTION.STARTED event."""
    return await send_event({
        "type": "OFFICIATING.INGESTION.STARTED",
        "source": "refiq_ingestion",
        "payload": {
            "game_id": str(game_id),
            "job_id": str(job_id),
            "source_url": source_url,
            "source_type": source_type
        }
    }, db, str(job_id))


async def emit_ingestion_completed(
    game_id: UUID,
    job_id: UUID,
    video_path: str,
    db: Optional[AsyncSession] = None
) -> bool:
    """Emit OFFICIATING.INGESTION.COMPLETED event."""
    return await send_event({
        "type": "OFFICIATING.INGESTION.COMPLETED",
        "source": "refiq_ingestion",
        "payload": {
            "game_id": str(game_id),
            "job_id": str(job_id),
            "video_path": video_path
        }
    }, db, str(job_id))


async def emit_processing_started(
    game_id: UUID,
    job_id: UUID,
    db: Optional[AsyncSession] = None
) -> bool:
    """Emit OFFICIATING.PROCESSING.STARTED event."""
    return await send_event({
        "type": "OFFICIATING.PROCESSING.STARTED",
        "source": "refiq_processor",
        "payload": {
            "game_id": str(game_id),
            "job_id": str(job_id)
        }
    }, db, str(job_id))


async def emit_processing_completed(
    game_id: UUID,
    job_id: UUID,
    stats: Dict[str, Any],
    db: Optional[AsyncSession] = None
) -> bool:
    """Emit OFFICIATING.PROCESSING.COMPLETED event."""
    return await send_event({
        "type": "OFFICIATING.PROCESSING.COMPLETED",
        "source": "refiq_processor",
        "payload": {
            "game_id": str(game_id),
            "job_id": str(job_id),
            "stats": stats
        }
    }, db, str(job_id))


async def emit_event_detected(
    game_id: UUID,
    event_id: UUID,
    event_type: str,
    confidence: float,
    frame_number: int,
    db: Optional[AsyncSession] = None
) -> bool:
    """Emit OFFICIATING.EVENT.DETECTED event."""
    return await send_event({
        "type": "OFFICIATING.EVENT.DETECTED",
        "source": "refiq_detector",
        "payload": {
            "game_id": str(game_id),
            "event_id": str(event_id),
            "event_type": event_type,
            "confidence": confidence,
            "frame_number": frame_number
        }
    }, db)


async def emit_skilldna_updated(
    profile_id: UUID,
    subject_type: str,
    subject_id: UUID,
    delta: Dict[str, Any],
    db: Optional[AsyncSession] = None
) -> bool:
    """Emit OFFICIATING.SKILLDNA.UPDATED event."""
    return await send_event({
        "type": "OFFICIATING.SKILLDNA.UPDATED",
        "source": "refiq_skilldna",
        "payload": {
            "profile_id": str(profile_id),
            "subject_type": subject_type,
            "subject_id": str(subject_id),
            "delta": delta
        }
    }, db)


async def emit_clip_generated(
    game_id: UUID,
    clip_id: UUID,
    event_id: UUID,
    clip_path: str,
    db: Optional[AsyncSession] = None
) -> bool:
    """Emit OFFICIATING.CLIP.GENERATED event."""
    return await send_event({
        "type": "OFFICIATING.CLIP.GENERATED",
        "source": "refiq_clips",
        "payload": {
            "game_id": str(game_id),
            "clip_id": str(clip_id),
            "event_id": str(event_id),
            "clip_path": clip_path
        }
    }, db)
