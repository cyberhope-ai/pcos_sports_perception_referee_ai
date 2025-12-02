"""
RefQuest 2.0 — PCOS-Native Skill Verification Platform
PrecognitionOS Studio

The first TwinFlow-powered application demonstrating:
- Evidence-based skill assessment
- Multimodal video/audio analysis
- SkillDNA competency tracking
- QSurface semantic tracing

Built entirely through multi-agent intelligence in PrecognitionOS Studio.
"""

__version__ = "2.0.0"
__author__ = "CyberHopeAI, LLC"

from .backend import (
    RefQuestEngine,
    Quest,
    Step,
    Challenge,
    ChallengeResult,
    SkillDNAEngine,
)

__all__ = [
    "RefQuestEngine",
    "Quest",
    "Step",
    "Challenge",
    "ChallengeResult",
    "SkillDNAEngine",
]
