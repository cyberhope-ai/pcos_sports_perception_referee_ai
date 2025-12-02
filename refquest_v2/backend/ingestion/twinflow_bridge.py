"""
RefQuest 2.0 — TwinFlow Bridge
PrecognitionOS Studio

Bridges RefQuest evidence collection with TwinFlow processing.
Handles video capture, frame extraction, and TwinFlow packet generation.
"""

import asyncio
import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime
from enum import Enum
import numpy as np

# PCOS TwinFlow imports (graceful fallback)
try:
    from pcos.twinflow import (
        get_twinflow_engine,
        TwinFlowEngine,
        TwinFlowPacket,
        PerceptualFrame,
        SemanticFrame,
    )
    TWINFLOW_AVAILABLE = True
except ImportError:
    TWINFLOW_AVAILABLE = False
    TwinFlowEngine = None
    TwinFlowPacket = None
    PerceptualFrame = None
    SemanticFrame = None

# Camera imports
try:
    from pcos.twinflow.camera_sync import CameraSync, get_camera_manager
    CAMERA_AVAILABLE = True
except ImportError:
    CAMERA_AVAILABLE = False
    CameraSync = None


class CaptureState(Enum):
    """State of evidence capture session."""
    IDLE = "idle"
    PREPARING = "preparing"
    RECORDING = "recording"
    PROCESSING = "processing"
    COMPLETED = "completed"
    ERROR = "error"


@dataclass
class CaptureSession:
    """Represents an active evidence capture session."""
    session_id: str = field(default_factory=lambda: f"cap-{uuid.uuid4().hex[:12]}")
    challenge_id: str = ""
    step_id: str = ""
    user_id: str = ""

    state: CaptureState = CaptureState.IDLE
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None

    # Frame buffers
    video_frames: List[np.ndarray] = field(default_factory=list)
    audio_samples: List[np.ndarray] = field(default_factory=list)

    # TwinFlow results
    twinflow_packets: List[Any] = field(default_factory=list)
    perceptual_frames: List[Any] = field(default_factory=list)
    semantic_frames: List[Any] = field(default_factory=list)

    # Metadata
    camera_ids: List[str] = field(default_factory=list)
    fps: float = 30.0
    resolution: tuple = (1920, 1080)

    # Results
    detected_objects: List[Dict[str, Any]] = field(default_factory=list)
    detected_actions: List[Dict[str, Any]] = field(default_factory=list)
    transcription: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "session_id": self.session_id,
            "challenge_id": self.challenge_id,
            "step_id": self.step_id,
            "user_id": self.user_id,
            "state": self.state.value,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "frame_count": len(self.video_frames),
            "packet_count": len(self.twinflow_packets),
            "detected_objects": self.detected_objects,
            "detected_actions": self.detected_actions,
            "transcription": self.transcription,
        }


class TwinFlowBridge:
    """
    Bridge between RefQuest and TwinFlow.

    Manages evidence capture sessions and TwinFlow processing.
    """

    def __init__(self):
        self.sessions: Dict[str, CaptureSession] = {}
        self.active_session: Optional[str] = None

        # Initialize TwinFlow if available
        self.twinflow: Optional[Any] = None
        if TWINFLOW_AVAILABLE:
            try:
                from pcos.twinflow import get_twinflow_engine
                self.twinflow = get_twinflow_engine()
            except Exception:
                pass

        # Initialize camera manager if available
        self.camera_manager: Optional[Any] = None
        if CAMERA_AVAILABLE:
            try:
                self.camera_manager = get_camera_manager()
            except Exception:
                pass

        # Callbacks
        self.on_frame_captured: Optional[Callable] = None
        self.on_packet_generated: Optional[Callable] = None
        self.on_object_detected: Optional[Callable] = None
        self.on_action_detected: Optional[Callable] = None

    async def create_session(
        self,
        challenge_id: str,
        step_id: str,
        user_id: str,
        camera_ids: Optional[List[str]] = None,
    ) -> CaptureSession:
        """Create a new capture session for evidence collection."""
        session = CaptureSession(
            challenge_id=challenge_id,
            step_id=step_id,
            user_id=user_id,
            camera_ids=camera_ids or [],
        )

        self.sessions[session.session_id] = session
        return session

    async def start_capture(self, session_id: str) -> bool:
        """Start capturing evidence for a session."""
        session = self.sessions.get(session_id)
        if not session:
            return False

        if session.state != CaptureState.IDLE:
            return False

        session.state = CaptureState.PREPARING
        session.started_at = datetime.now()

        # Initialize cameras if available
        if self.camera_manager and session.camera_ids:
            for cam_id in session.camera_ids:
                await self._init_camera(cam_id)

        session.state = CaptureState.RECORDING
        self.active_session = session_id

        # Start TwinFlow processing loop
        asyncio.create_task(self._capture_loop(session_id))

        return True

    async def stop_capture(self, session_id: str) -> CaptureSession:
        """Stop capturing and finalize session."""
        session = self.sessions.get(session_id)
        if not session:
            raise ValueError(f"Session not found: {session_id}")

        session.state = CaptureState.PROCESSING
        session.ended_at = datetime.now()

        if self.active_session == session_id:
            self.active_session = None

        # Process captured frames through TwinFlow
        await self._process_captured_frames(session)

        session.state = CaptureState.COMPLETED
        return session

    async def cancel_capture(self, session_id: str) -> bool:
        """Cancel an active capture session."""
        session = self.sessions.get(session_id)
        if not session:
            return False

        session.state = CaptureState.IDLE
        session.video_frames.clear()
        session.audio_samples.clear()

        if self.active_session == session_id:
            self.active_session = None

        return True

    async def add_frame(
        self,
        session_id: str,
        frame: np.ndarray,
        timestamp: Optional[float] = None,
    ) -> bool:
        """Add a video frame to the capture session."""
        session = self.sessions.get(session_id)
        if not session or session.state != CaptureState.RECORDING:
            return False

        session.video_frames.append(frame)

        # Real-time TwinFlow processing if available
        if self.twinflow:
            await self._process_frame_realtime(session, frame, timestamp)

        if self.on_frame_captured:
            self.on_frame_captured(session_id, len(session.video_frames))

        return True

    async def add_audio(
        self,
        session_id: str,
        samples: np.ndarray,
        sample_rate: int = 16000,
    ) -> bool:
        """Add audio samples to the capture session."""
        session = self.sessions.get(session_id)
        if not session or session.state != CaptureState.RECORDING:
            return False

        session.audio_samples.append(samples)
        return True

    async def _capture_loop(self, session_id: str):
        """Main capture loop for camera input."""
        session = self.sessions.get(session_id)
        if not session:
            return

        while session.state == CaptureState.RECORDING:
            # If camera manager available, grab frames
            if self.camera_manager and session.camera_ids:
                for cam_id in session.camera_ids:
                    frame = await self._grab_camera_frame(cam_id)
                    if frame is not None:
                        await self.add_frame(session_id, frame)

            await asyncio.sleep(1 / session.fps)

    async def _init_camera(self, camera_id: str) -> bool:
        """Initialize a camera for capture."""
        if not self.camera_manager:
            return False

        try:
            # Camera initialization through PCOS camera manager
            return True
        except Exception:
            return False

    async def _grab_camera_frame(self, camera_id: str) -> Optional[np.ndarray]:
        """Grab a frame from a camera."""
        if not self.camera_manager:
            return None

        try:
            # Frame grabbing through PCOS camera manager
            return None
        except Exception:
            return None

    async def _process_frame_realtime(
        self,
        session: CaptureSession,
        frame: np.ndarray,
        timestamp: Optional[float],
    ):
        """Process a single frame through TwinFlow in real-time."""
        if not self.twinflow:
            return

        try:
            # Create perceptual frame
            perceptual = await self._create_perceptual_frame(frame, timestamp)
            session.perceptual_frames.append(perceptual)

            # Run object detection
            objects = await self._detect_objects(frame)
            if objects:
                session.detected_objects.extend(objects)
                if self.on_object_detected:
                    self.on_object_detected(session.session_id, objects)

            # Run action detection (if enough frames)
            if len(session.video_frames) >= 16:
                recent_frames = session.video_frames[-16:]
                actions = await self._detect_actions(recent_frames)
                if actions:
                    session.detected_actions.extend(actions)
                    if self.on_action_detected:
                        self.on_action_detected(session.session_id, actions)

        except Exception as e:
            print(f"TwinFlow processing error: {e}")

    async def _process_captured_frames(self, session: CaptureSession):
        """Process all captured frames through TwinFlow pipeline."""
        if not self.twinflow or not session.video_frames:
            return

        try:
            # Batch process for semantic analysis
            semantic = await self._create_semantic_analysis(session.video_frames)
            session.semantic_frames.append(semantic)

            # Generate TwinFlow packets
            for i, frame in enumerate(session.video_frames):
                timestamp = i / session.fps
                packet = await self._create_twinflow_packet(
                    session, frame, timestamp
                )
                if packet:
                    session.twinflow_packets.append(packet)
                    if self.on_packet_generated:
                        self.on_packet_generated(session.session_id, packet)

            # Process audio for transcription
            if session.audio_samples:
                session.transcription = await self._transcribe_audio(
                    session.audio_samples
                )

        except Exception as e:
            print(f"Post-processing error: {e}")

    async def _create_perceptual_frame(
        self,
        frame: np.ndarray,
        timestamp: Optional[float],
    ) -> Dict[str, Any]:
        """Create a perceptual frame representation."""
        return {
            "type": "perceptual",
            "timestamp": timestamp or 0.0,
            "frame_shape": frame.shape if isinstance(frame, np.ndarray) else None,
            "features": {},
        }

    async def _create_semantic_analysis(
        self,
        frames: List[np.ndarray],
    ) -> Dict[str, Any]:
        """Create semantic analysis from frame sequence."""
        return {
            "type": "semantic",
            "frame_count": len(frames),
            "duration_seconds": len(frames) / 30.0,
            "activity_segments": [],
            "key_moments": [],
        }

    async def _create_twinflow_packet(
        self,
        session: CaptureSession,
        frame: np.ndarray,
        timestamp: float,
    ) -> Optional[Dict[str, Any]]:
        """Create a TwinFlow packet from captured data."""
        return {
            "packet_id": f"tfp-{uuid.uuid4().hex[:8]}",
            "session_id": session.session_id,
            "timestamp": timestamp,
            "perceptual": {
                "objects": session.detected_objects[-5:] if session.detected_objects else [],
                "features": {},
            },
            "semantic": {
                "actions": session.detected_actions[-3:] if session.detected_actions else [],
                "intent": "",
            },
            "qsurface_ready": True,
        }

    async def _detect_objects(
        self,
        frame: np.ndarray,
    ) -> List[Dict[str, Any]]:
        """Detect objects in a frame."""
        # Placeholder - would use TwinFlow object detection
        return []

    async def _detect_actions(
        self,
        frames: List[np.ndarray],
    ) -> List[Dict[str, Any]]:
        """Detect actions in a frame sequence."""
        # Placeholder - would use TwinFlow action recognition
        return []

    async def _transcribe_audio(
        self,
        audio_samples: List[np.ndarray],
    ) -> str:
        """Transcribe audio samples."""
        # Placeholder - would use TwinFlow audio processing
        return ""

    def get_session(self, session_id: str) -> Optional[CaptureSession]:
        """Get a capture session by ID."""
        return self.sessions.get(session_id)

    def get_active_session(self) -> Optional[CaptureSession]:
        """Get the currently active session."""
        if self.active_session:
            return self.sessions.get(self.active_session)
        return None

    def get_session_packets(self, session_id: str) -> List[Any]:
        """Get TwinFlow packets from a session."""
        session = self.sessions.get(session_id)
        if session:
            return session.twinflow_packets
        return []

    def get_stats(self) -> Dict[str, Any]:
        """Get bridge statistics."""
        return {
            "total_sessions": len(self.sessions),
            "active_session": self.active_session,
            "twinflow_available": TWINFLOW_AVAILABLE,
            "camera_available": CAMERA_AVAILABLE,
            "total_packets": sum(
                len(s.twinflow_packets) for s in self.sessions.values()
            ),
        }


# Global bridge instance
_twinflow_bridge: Optional[TwinFlowBridge] = None


def get_twinflow_bridge() -> TwinFlowBridge:
    """Get or create the global TwinFlow bridge."""
    global _twinflow_bridge
    if _twinflow_bridge is None:
        _twinflow_bridge = TwinFlowBridge()
    return _twinflow_bridge
