"""
RefQuest 2.0 — Ingestion Engine
PrecognitionOS Studio

TwinFlow integration for video/audio/telemetry ingestion.
Connects camera input to perceptual analysis pipeline.
"""

from .twinflow_bridge import (
    TwinFlowBridge,
    CaptureSession,
    CaptureState,
    get_twinflow_bridge,
)
from .evidence_processor import (
    EvidenceProcessor,
    StepVerification,
    EvidenceVerification,
    VerificationStatus,
    get_evidence_processor,
)

__all__ = [
    "TwinFlowBridge",
    "CaptureSession",
    "CaptureState",
    "get_twinflow_bridge",
    "EvidenceProcessor",
    "StepVerification",
    "EvidenceVerification",
    "VerificationStatus",
    "get_evidence_processor",
]
