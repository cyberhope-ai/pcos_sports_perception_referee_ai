"""
Phase ST-0 / Phase 13.3: System Dependency Validator

Comprehensive validation of all RefQuest system dependencies.
Runs at startup and before ingestion to ensure system stability.
"""

import asyncio
import logging
import os
import re
import subprocess
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)


class ValidationStatus(str, Enum):
    """Status of a validation check."""
    OK = "ok"
    WARNING = "warning"
    ERROR = "error"
    SKIPPED = "skipped"


@dataclass
class ValidationResult:
    """Result of a single validation check."""
    name: str
    status: ValidationStatus
    message: str
    details: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "status": self.status.value,
            "message": self.message,
            "details": self.details,
            "timestamp": self.timestamp.isoformat(),
        }


@dataclass
class SystemValidationReport:
    """Complete system validation report."""
    gpu: ValidationResult
    cuda: ValidationResult
    ffmpeg: ValidationResult
    nvenc: ValidationResult
    yolo: ValidationResult
    yt_dlp: ValidationResult
    directories: ValidationResult
    refiq: ValidationResult
    mcp: ValidationResult
    overall_status: ValidationStatus = ValidationStatus.OK
    timestamp: datetime = field(default_factory=datetime.utcnow)
    can_ingest: bool = True
    blocking_issues: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "gpu": self.gpu.to_dict(),
            "cuda": self.cuda.to_dict(),
            "ffmpeg": self.ffmpeg.to_dict(),
            "nvenc": self.nvenc.to_dict(),
            "yolo": self.yolo.to_dict(),
            "yt_dlp": self.yt_dlp.to_dict(),
            "directories": self.directories.to_dict(),
            "refiq": self.refiq.to_dict(),
            "mcp": self.mcp.to_dict(),
            "overall_status": self.overall_status.value,
            "timestamp": self.timestamp.isoformat(),
            "can_ingest": self.can_ingest,
            "blocking_issues": self.blocking_issues,
        }


# Cache for validation results
_cached_validation: Optional[SystemValidationReport] = None
_cache_timestamp: Optional[datetime] = None
CACHE_TTL_SECONDS = 300  # 5 minutes


class SystemValidator:
    """
    Validates all system dependencies for RefQuest.

    Checks:
    - GPU detection & NVIDIA driver
    - CUDA availability via PyTorch
    - FFmpeg installation
    - NVENC encoder availability
    - YOLO model presence & inference
    - yt-dlp for YouTube ingestion
    - Required directories
    - RefIQ database schema
    - MCP Kernel connectivity
    """

    def __init__(
        self,
        base_dir: Optional[Path] = None,
        db_url: Optional[str] = None,
        mcp_http_url: Optional[str] = None,
        mcp_ws_url: Optional[str] = None,
        yolo_model_path: Optional[str] = None,
    ):
        self.base_dir = base_dir or Path(__file__).parent.parent
        self.db_url = db_url or os.getenv(
            "DATABASE_URL",
            "postgresql+asyncpg://postgres:postgres@localhost:5432/refquest_ai"
        )
        self.mcp_http_url = mcp_http_url or os.getenv("MCP_HTTP_URL", "http://localhost:7890")
        self.mcp_ws_url = mcp_ws_url or os.getenv("MCP_WS_URL", "ws://localhost:7890")
        self.yolo_model_path = yolo_model_path or os.getenv("YOLO_MODEL_PATH", "yolov8s.pt")

        # Required directories
        self.required_dirs = [
            self.base_dir / "videos",
            self.base_dir / "videos" / "youtube",
            self.base_dir / "clips",
            self.base_dir / "media" / "thumbnails",
            self.base_dir / "logs" / "ingestion",
            self.base_dir / "logs" / "system",
        ]

        # Required RefIQ tables
        self.required_tables = [
            "games",
            "ingestion_jobs",
            "events",
            "clips",
            "event_reasoning",
            "skilldna_profiles",
            "committee_cases",
            "committee_rounds",
            "committee_messages",
            "pcos_event_store",
        ]

    # ─────────────────────────────────────────────────────────────────
    # GPU & NVIDIA DRIVER
    # ─────────────────────────────────────────────────────────────────

    def check_gpu(self) -> ValidationResult:
        """Check for NVIDIA GPU and driver."""
        try:
            result = subprocess.run(
                ["nvidia-smi", "--query-gpu=name,driver_version,memory.total,temperature.gpu", "--format=csv,noheader"],
                capture_output=True,
                text=True,
                timeout=10,
            )

            if result.returncode != 0:
                return ValidationResult(
                    name="gpu",
                    status=ValidationStatus.ERROR,
                    message="NVIDIA driver not installed or GPU not detected",
                    details={"error": result.stderr.strip()},
                )

            # Parse nvidia-smi output
            lines = result.stdout.strip().split("\n")
            gpus = []
            for line in lines:
                parts = [p.strip() for p in line.split(",")]
                if len(parts) >= 4:
                    gpus.append({
                        "name": parts[0],
                        "driver_version": parts[1],
                        "memory_total": parts[2],
                        "temperature": parts[3],
                    })

            if not gpus:
                return ValidationResult(
                    name="gpu",
                    status=ValidationStatus.ERROR,
                    message="No NVIDIA GPUs detected",
                    details={"raw_output": result.stdout},
                )

            return ValidationResult(
                name="gpu",
                status=ValidationStatus.OK,
                message=f"GPU detected: {gpus[0]['name']}",
                details={
                    "gpus": gpus,
                    "gpu_count": len(gpus),
                    "primary_gpu": gpus[0]["name"],
                    "driver_version": gpus[0]["driver_version"],
                },
            )

        except FileNotFoundError:
            return ValidationResult(
                name="gpu",
                status=ValidationStatus.ERROR,
                message="nvidia-smi not found - NVIDIA driver not installed",
                details={"suggestion": "Install NVIDIA driver 535+ from nvidia.com or your package manager"},
            )
        except subprocess.TimeoutExpired:
            return ValidationResult(
                name="gpu",
                status=ValidationStatus.ERROR,
                message="nvidia-smi timed out - GPU may be unresponsive",
                details={},
            )
        except Exception as e:
            return ValidationResult(
                name="gpu",
                status=ValidationStatus.ERROR,
                message=f"GPU check failed: {str(e)}",
                details={"exception": str(e)},
            )

    # ─────────────────────────────────────────────────────────────────
    # CUDA (via PyTorch)
    # ─────────────────────────────────────────────────────────────────

    def check_cuda(self) -> ValidationResult:
        """Check CUDA availability via PyTorch."""
        try:
            import torch

            cuda_available = torch.cuda.is_available()

            if not cuda_available:
                return ValidationResult(
                    name="cuda",
                    status=ValidationStatus.WARNING,
                    message="CUDA not available - will use CPU mode (slower)",
                    details={
                        "torch_version": torch.__version__,
                        "cuda_available": False,
                        "suggestion": "Install PyTorch with CUDA support: pip install torch --index-url https://download.pytorch.org/whl/cu121",
                    },
                )

            device_count = torch.cuda.device_count()
            device_name = torch.cuda.get_device_name(0) if device_count > 0 else "N/A"
            cuda_version = torch.version.cuda or "Unknown"

            # Test a small CUDA operation
            try:
                test_tensor = torch.zeros(1).cuda()
                del test_tensor
                cuda_functional = True
            except Exception as e:
                cuda_functional = False
                return ValidationResult(
                    name="cuda",
                    status=ValidationStatus.ERROR,
                    message=f"CUDA detected but not functional: {str(e)}",
                    details={
                        "torch_version": torch.__version__,
                        "cuda_version": cuda_version,
                        "error": str(e),
                    },
                )

            return ValidationResult(
                name="cuda",
                status=ValidationStatus.OK,
                message=f"CUDA {cuda_version} available on {device_name}",
                details={
                    "torch_version": torch.__version__,
                    "cuda_version": cuda_version,
                    "device_count": device_count,
                    "device_name": device_name,
                    "cuda_functional": cuda_functional,
                },
            )

        except ImportError:
            return ValidationResult(
                name="cuda",
                status=ValidationStatus.WARNING,
                message="PyTorch not installed - CUDA check skipped",
                details={"suggestion": "pip install torch"},
            )
        except Exception as e:
            return ValidationResult(
                name="cuda",
                status=ValidationStatus.ERROR,
                message=f"CUDA check failed: {str(e)}",
                details={"exception": str(e)},
            )

    # ─────────────────────────────────────────────────────────────────
    # FFmpeg
    # ─────────────────────────────────────────────────────────────────

    def check_ffmpeg(self) -> ValidationResult:
        """Check FFmpeg installation."""
        try:
            result = subprocess.run(
                ["ffmpeg", "-version"],
                capture_output=True,
                text=True,
                timeout=10,
            )

            if result.returncode != 0:
                return ValidationResult(
                    name="ffmpeg",
                    status=ValidationStatus.ERROR,
                    message="FFmpeg not working properly",
                    details={"error": result.stderr.strip()},
                )

            # Parse version
            version_match = re.search(r"ffmpeg version (\S+)", result.stdout)
            version = version_match.group(1) if version_match else "unknown"

            # Check for libx264/libx265
            has_x264 = "libx264" in result.stdout
            has_x265 = "libx265" in result.stdout

            return ValidationResult(
                name="ffmpeg",
                status=ValidationStatus.OK,
                message=f"FFmpeg {version} installed",
                details={
                    "version": version,
                    "has_libx264": has_x264,
                    "has_libx265": has_x265,
                },
            )

        except FileNotFoundError:
            return ValidationResult(
                name="ffmpeg",
                status=ValidationStatus.ERROR,
                message="FFmpeg not installed",
                details={"suggestion": "sudo apt install ffmpeg"},
            )
        except Exception as e:
            return ValidationResult(
                name="ffmpeg",
                status=ValidationStatus.ERROR,
                message=f"FFmpeg check failed: {str(e)}",
                details={"exception": str(e)},
            )

    # ─────────────────────────────────────────────────────────────────
    # NVENC (Hardware Encoding)
    # ─────────────────────────────────────────────────────────────────

    def check_nvenc(self) -> ValidationResult:
        """Check for NVENC hardware encoder support."""
        try:
            result = subprocess.run(
                ["ffmpeg", "-encoders"],
                capture_output=True,
                text=True,
                timeout=10,
            )

            if result.returncode != 0:
                return ValidationResult(
                    name="nvenc",
                    status=ValidationStatus.ERROR,
                    message="Cannot query FFmpeg encoders",
                    details={"error": result.stderr.strip()},
                )

            has_h264_nvenc = "h264_nvenc" in result.stdout
            has_hevc_nvenc = "hevc_nvenc" in result.stdout

            if not has_h264_nvenc and not has_hevc_nvenc:
                return ValidationResult(
                    name="nvenc",
                    status=ValidationStatus.WARNING,
                    message="NVENC not available - GPU encoding disabled (will use CPU)",
                    details={
                        "has_h264_nvenc": False,
                        "has_hevc_nvenc": False,
                        "suggestion": "Install FFmpeg with NVENC: sudo apt install ffmpeg-nvenc or build from source with --enable-nvenc",
                    },
                )

            return ValidationResult(
                name="nvenc",
                status=ValidationStatus.OK,
                message="NVENC hardware encoding available",
                details={
                    "has_h264_nvenc": has_h264_nvenc,
                    "has_hevc_nvenc": has_hevc_nvenc,
                },
            )

        except Exception as e:
            return ValidationResult(
                name="nvenc",
                status=ValidationStatus.WARNING,
                message=f"NVENC check failed: {str(e)}",
                details={"exception": str(e)},
            )

    # ─────────────────────────────────────────────────────────────────
    # YOLO Model
    # ─────────────────────────────────────────────────────────────────

    def check_yolo(self) -> ValidationResult:
        """Check YOLO model availability and functionality."""
        try:
            from ultralytics import YOLO
            import numpy as np

            # Check if model file exists
            model_path = Path(self.yolo_model_path)
            if not model_path.exists():
                # Check in common locations
                alt_paths = [
                    Path.home() / ".cache" / "torch" / "hub" / "ultralytics_yolov8" / self.yolo_model_path,
                    self.base_dir / self.yolo_model_path,
                    Path("/usr/share/yolo") / self.yolo_model_path,
                ]
                model_found = False
                for alt in alt_paths:
                    if alt.exists():
                        model_path = alt
                        model_found = True
                        break

                if not model_found:
                    # YOLO can auto-download, so just warn
                    logger.info(f"YOLO model {self.yolo_model_path} not found locally, will auto-download on first use")

            # Try to load and run inference
            model = YOLO(str(self.yolo_model_path))

            # Run dummy inference
            dummy_image = np.zeros((640, 640, 3), dtype=np.uint8)
            results = model(dummy_image, verbose=False)

            return ValidationResult(
                name="yolo",
                status=ValidationStatus.OK,
                message=f"YOLO model loaded and functional",
                details={
                    "model_path": str(model_path),
                    "model_type": model.task,
                    "inference_test": "passed",
                },
            )

        except ImportError:
            return ValidationResult(
                name="yolo",
                status=ValidationStatus.ERROR,
                message="Ultralytics YOLO not installed",
                details={"suggestion": "pip install ultralytics"},
            )
        except Exception as e:
            return ValidationResult(
                name="yolo",
                status=ValidationStatus.ERROR,
                message=f"YOLO check failed: {str(e)}",
                details={
                    "exception": str(e),
                    "suggestion": "Download model: pip install ultralytics && yolo export model=yolov8s.pt",
                },
            )

    # ─────────────────────────────────────────────────────────────────
    # yt-dlp (YouTube Download)
    # ─────────────────────────────────────────────────────────────────

    def check_yt_dlp(self) -> ValidationResult:
        """Check yt-dlp installation and functionality."""
        try:
            result = subprocess.run(
                ["yt-dlp", "--version"],
                capture_output=True,
                text=True,
                timeout=10,
            )

            if result.returncode != 0:
                return ValidationResult(
                    name="yt_dlp",
                    status=ValidationStatus.ERROR,
                    message="yt-dlp not working properly",
                    details={"error": result.stderr.strip()},
                )

            version = result.stdout.strip()

            # Check for JavaScript runtime (required for YouTube)
            node_result = subprocess.run(
                ["node", "--version"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            has_node = node_result.returncode == 0
            node_version = node_result.stdout.strip() if has_node else None

            if not has_node:
                return ValidationResult(
                    name="yt_dlp",
                    status=ValidationStatus.WARNING,
                    message=f"yt-dlp {version} installed but Node.js missing (YouTube may not work)",
                    details={
                        "version": version,
                        "has_node": False,
                        "suggestion": "Install Node.js for YouTube support: sudo apt install nodejs",
                    },
                )

            return ValidationResult(
                name="yt_dlp",
                status=ValidationStatus.OK,
                message=f"yt-dlp {version} installed with Node.js {node_version}",
                details={
                    "version": version,
                    "has_node": True,
                    "node_version": node_version,
                },
            )

        except FileNotFoundError:
            return ValidationResult(
                name="yt_dlp",
                status=ValidationStatus.ERROR,
                message="yt-dlp not installed",
                details={"suggestion": "pip install yt-dlp"},
            )
        except Exception as e:
            return ValidationResult(
                name="yt_dlp",
                status=ValidationStatus.ERROR,
                message=f"yt-dlp check failed: {str(e)}",
                details={"exception": str(e)},
            )

    # ─────────────────────────────────────────────────────────────────
    # Directories
    # ─────────────────────────────────────────────────────────────────

    def check_directories(self) -> ValidationResult:
        """Check and create required directories."""
        issues = []
        created = []
        existing = []

        for dir_path in self.required_dirs:
            try:
                if dir_path.exists():
                    # Check if writable
                    if not os.access(dir_path, os.W_OK):
                        issues.append(f"{dir_path}: not writable")
                    else:
                        existing.append(str(dir_path))
                else:
                    # Create directory
                    dir_path.mkdir(parents=True, exist_ok=True)
                    created.append(str(dir_path))
            except Exception as e:
                issues.append(f"{dir_path}: {str(e)}")

        if issues:
            return ValidationResult(
                name="directories",
                status=ValidationStatus.ERROR,
                message=f"Directory issues: {len(issues)} problems found",
                details={
                    "issues": issues,
                    "created": created,
                    "existing": existing,
                },
            )

        return ValidationResult(
            name="directories",
            status=ValidationStatus.OK,
            message=f"All directories ready ({len(existing)} existing, {len(created)} created)",
            details={
                "created": created,
                "existing": existing,
            },
        )

    # ─────────────────────────────────────────────────────────────────
    # RefIQ Database Schema
    # ─────────────────────────────────────────────────────────────────

    async def check_refiq(self) -> ValidationResult:
        """Check RefIQ database connectivity and schema."""
        try:
            from sqlalchemy.ext.asyncio import create_async_engine
            from sqlalchemy import text

            # Convert sync URL to async if needed
            db_url = self.db_url
            if "postgresql://" in db_url and "asyncpg" not in db_url:
                db_url = db_url.replace("postgresql://", "postgresql+asyncpg://")

            engine = create_async_engine(db_url, echo=False)

            async with engine.begin() as conn:
                # Test connection
                result = await conn.execute(text("SELECT 1"))
                result.fetchone()

                # Check tables
                result = await conn.execute(text(
                    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
                ))
                existing_tables = {row[0] for row in result.fetchall()}

            await engine.dispose()

            # Check required tables
            missing_tables = [t for t in self.required_tables if t not in existing_tables]

            if missing_tables:
                return ValidationResult(
                    name="refiq",
                    status=ValidationStatus.WARNING,
                    message=f"Database connected but {len(missing_tables)} tables missing",
                    details={
                        "database": db_url.split("@")[-1] if "@" in db_url else db_url,
                        "missing_tables": missing_tables,
                        "existing_tables": list(existing_tables),
                        "suggestion": "Run database migrations: alembic upgrade head",
                    },
                )

            return ValidationResult(
                name="refiq",
                status=ValidationStatus.OK,
                message="RefIQ database connected and schema valid",
                details={
                    "database": db_url.split("@")[-1] if "@" in db_url else db_url,
                    "table_count": len(existing_tables),
                    "required_tables_found": len(self.required_tables),
                },
            )

        except ImportError:
            return ValidationResult(
                name="refiq",
                status=ValidationStatus.ERROR,
                message="SQLAlchemy not installed",
                details={"suggestion": "pip install sqlalchemy[asyncio] asyncpg"},
            )
        except Exception as e:
            return ValidationResult(
                name="refiq",
                status=ValidationStatus.ERROR,
                message=f"Database connection failed: {str(e)}",
                details={
                    "exception": str(e),
                    "database_url": self.db_url.split("@")[-1] if "@" in self.db_url else "hidden",
                },
            )

    # ─────────────────────────────────────────────────────────────────
    # MCP Kernel Connectivity
    # ─────────────────────────────────────────────────────────────────

    async def check_mcp(self) -> ValidationResult:
        """Check MCP Kernel connectivity."""
        http_ok = False
        ws_ok = False
        details = {}

        # Test HTTP endpoint
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.mcp_http_url}/health")
                http_ok = response.status_code == 200
                details["http_status"] = response.status_code
                details["http_url"] = self.mcp_http_url
        except httpx.ConnectError:
            details["http_error"] = "Connection refused"
        except httpx.TimeoutException:
            details["http_error"] = "Connection timeout"
        except Exception as e:
            details["http_error"] = str(e)

        # Test WebSocket endpoint
        try:
            import websockets

            async with websockets.connect(self.mcp_ws_url, close_timeout=2) as ws:
                ws_ok = True
                details["ws_url"] = self.mcp_ws_url
        except ImportError:
            details["ws_error"] = "websockets not installed"
        except Exception as e:
            details["ws_error"] = str(e)

        if http_ok or ws_ok:
            # WebSocket is the primary protocol - if WS works, MCP is functional
            return ValidationResult(
                name="mcp",
                status=ValidationStatus.OK if ws_ok else ValidationStatus.WARNING,
                message=f"MCP Kernel: WS {'OK' if ws_ok else 'FAIL'}" + (f", HTTP {'OK' if http_ok else 'N/A'}" if http_ok else ""),
                details=details,
            )

        return ValidationResult(
            name="mcp",
            status=ValidationStatus.WARNING,
            message="MCP Kernel not reachable (optional for standalone mode)",
            details={
                **details,
                "suggestion": "Start MCP Kernel or ignore if running standalone",
            },
        )

    # ─────────────────────────────────────────────────────────────────
    # Full Validation
    # ─────────────────────────────────────────────────────────────────

    async def run_full_validation(self) -> SystemValidationReport:
        """Run all validation checks and return a complete report."""
        logger.info("Starting full system validation...")

        # Run sync checks in parallel using threads
        loop = asyncio.get_event_loop()

        gpu_future = loop.run_in_executor(None, self.check_gpu)
        cuda_future = loop.run_in_executor(None, self.check_cuda)
        ffmpeg_future = loop.run_in_executor(None, self.check_ffmpeg)
        nvenc_future = loop.run_in_executor(None, self.check_nvenc)
        yolo_future = loop.run_in_executor(None, self.check_yolo)
        yt_dlp_future = loop.run_in_executor(None, self.check_yt_dlp)
        dirs_future = loop.run_in_executor(None, self.check_directories)

        # Gather sync results
        gpu_result = await gpu_future
        cuda_result = await cuda_future
        ffmpeg_result = await ffmpeg_future
        nvenc_result = await nvenc_future
        yolo_result = await yolo_future
        yt_dlp_result = await yt_dlp_future
        dirs_result = await dirs_future

        # Run async checks
        refiq_result = await self.check_refiq()
        mcp_result = await self.check_mcp()

        # Determine overall status and blocking issues
        all_results = [
            gpu_result, cuda_result, ffmpeg_result, nvenc_result,
            yolo_result, yt_dlp_result, dirs_result, refiq_result, mcp_result
        ]

        blocking_issues = []
        overall_status = ValidationStatus.OK

        for result in all_results:
            if result.status == ValidationStatus.ERROR:
                overall_status = ValidationStatus.ERROR
                # Only block on critical errors
                if result.name in ["ffmpeg", "directories", "refiq"]:
                    blocking_issues.append(f"{result.name}: {result.message}")
            elif result.status == ValidationStatus.WARNING and overall_status != ValidationStatus.ERROR:
                overall_status = ValidationStatus.WARNING

        can_ingest = len(blocking_issues) == 0

        report = SystemValidationReport(
            gpu=gpu_result,
            cuda=cuda_result,
            ffmpeg=ffmpeg_result,
            nvenc=nvenc_result,
            yolo=yolo_result,
            yt_dlp=yt_dlp_result,
            directories=dirs_result,
            refiq=refiq_result,
            mcp=mcp_result,
            overall_status=overall_status,
            can_ingest=can_ingest,
            blocking_issues=blocking_issues,
        )

        # Cache results
        global _cached_validation, _cache_timestamp
        _cached_validation = report
        _cache_timestamp = datetime.utcnow()

        logger.info(f"System validation complete: {overall_status.value}, can_ingest={can_ingest}")
        if blocking_issues:
            logger.warning(f"Blocking issues: {blocking_issues}")

        return report

    async def run_ingestion_preflight(self) -> ValidationResult:
        """
        Quick validation before starting ingestion.
        Only checks critical dependencies.
        """
        logger.info("Running ingestion preflight check...")

        loop = asyncio.get_event_loop()

        # Check critical dependencies
        ffmpeg_result = await loop.run_in_executor(None, self.check_ffmpeg)
        dirs_result = await loop.run_in_executor(None, self.check_directories)
        yt_dlp_result = await loop.run_in_executor(None, self.check_yt_dlp)

        issues = []

        if ffmpeg_result.status == ValidationStatus.ERROR:
            issues.append(f"FFmpeg: {ffmpeg_result.message}")

        if dirs_result.status == ValidationStatus.ERROR:
            issues.append(f"Directories: {dirs_result.message}")

        if yt_dlp_result.status == ValidationStatus.ERROR:
            issues.append(f"yt-dlp: {yt_dlp_result.message}")

        if issues:
            return ValidationResult(
                name="ingestion_preflight",
                status=ValidationStatus.ERROR,
                message="Ingestion blocked due to system issues",
                details={
                    "issues": issues,
                    "ffmpeg": ffmpeg_result.to_dict(),
                    "directories": dirs_result.to_dict(),
                    "yt_dlp": yt_dlp_result.to_dict(),
                },
            )

        return ValidationResult(
            name="ingestion_preflight",
            status=ValidationStatus.OK,
            message="System ready for ingestion",
            details={
                "ffmpeg": ffmpeg_result.status.value,
                "directories": dirs_result.status.value,
                "yt_dlp": yt_dlp_result.status.value,
            },
        )


# ─────────────────────────────────────────────────────────────────
# Module-level convenience functions
# ─────────────────────────────────────────────────────────────────

async def run_full_validation(
    base_dir: Optional[Path] = None,
    db_url: Optional[str] = None,
) -> SystemValidationReport:
    """Run full system validation."""
    validator = SystemValidator(base_dir=base_dir, db_url=db_url)
    return await validator.run_full_validation()


async def run_ingestion_preflight(
    base_dir: Optional[Path] = None,
) -> ValidationResult:
    """Run ingestion preflight check."""
    validator = SystemValidator(base_dir=base_dir)
    return await validator.run_ingestion_preflight()


def get_cached_validation_results() -> Optional[SystemValidationReport]:
    """Get cached validation results if still valid."""
    global _cached_validation, _cache_timestamp

    if _cached_validation is None or _cache_timestamp is None:
        return None

    age = (datetime.utcnow() - _cache_timestamp).total_seconds()
    if age > CACHE_TTL_SECONDS:
        return None

    return _cached_validation
