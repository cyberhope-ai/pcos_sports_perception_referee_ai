"""
Object Detection using YOLOv8s (Vale-Certified for PCOS)

Detects players, referees, and ball in video frames using YOLOv8s model.
Follows PCOS Vision Standards and SPEC_KIT requirements.

Phase 2 Implementation - Production Ready
- GPU/CPU device selection
- Batched inference for efficiency
- TensorRT-ready architecture (future)
- COCO class mapping for sports actors
"""
from typing import List, Dict, Any, Optional, Union
import numpy as np
import torch
import logging
from pydantic import BaseModel, Field
from ultralytics import YOLO

logger = logging.getLogger(__name__)


class DetectorConfig(BaseModel):
    """
    Configuration for YOLOv8s detector.

    Follows PCOS Model Selection Truthbook and Jetson Standards.
    """
    model_path: str = Field(
        default="yolov8s.pt",
        description="Path to YOLOv8 model file (.pt or .engine for TensorRT)"
    )
    device: str = Field(
        default="cuda" if torch.cuda.is_available() else "cpu",
        description="Device for inference: 'cuda', 'cpu', or 'cuda:0'"
    )
    confidence_threshold: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Minimum confidence for detections"
    )
    iou_threshold: float = Field(
        default=0.45,
        ge=0.0,
        le=1.0,
        description="IoU threshold for NMS"
    )
    max_detections: int = Field(
        default=300,
        ge=1,
        description="Maximum detections per frame"
    )
    imgsz: int = Field(
        default=640,
        description="Input image size for YOLO"
    )
    half: bool = Field(
        default=False,
        description="Use FP16 half-precision (Jetson/TensorRT optimization)"
    )

    class Config:
        frozen = False  # Allow updates for device migration


class Detection(BaseModel):
    """
    Single detection result.

    Maps COCO classes to PCOS actor types following SPEC_KIT schema.
    """
    actor_type: str  # "player", "referee", "ball"
    confidence: float
    bbox: List[float]  # [x1, y1, x2, y2] in pixels
    frame_number: int
    class_id: int  # Original COCO class ID
    normalized_bbox: Optional[List[float]] = None  # [x1, y1, x2, y2] normalized 0-1

    class Config:
        frozen = True


class Detector:
    """
    YOLOv8s-based detector for sports officiating (Vale-Certified).

    Implements PCOS Vision Standards:
    - YOLOv8s model (Vale-certified best choice)
    - CUDA/CPU device support
    - Batched inference
    - TensorRT-ready architecture
    - COCO class mapping to PCOS actor types

    COCO Class Mapping:
    - person (class 0) → "player" or "referee" (distinguished in Phase 3+)
    - sports ball (class 32) → "ball"

    Phase 2 Scope:
    - All persons marked as "player" initially
    - Phase 3+ will add referee detection via clothing/zone heuristics

    Future TensorRT Support:
    - Design allows drop-in replacement of .pt with .engine
    - Config already supports half-precision (FP16)
    """

    # COCO class IDs for sports detection
    COCO_PERSON_CLASS = 0
    COCO_SPORTS_BALL_CLASS = 32

    def __init__(self, config: DetectorConfig):
        """
        Initialize detector.

        Args:
            config: DetectorConfig with model path, device, thresholds
        """
        self.config = config
        self.model: Optional[YOLO] = None
        self.device = config.device
        self.is_loaded = False

        logger.info(f"Detector initialized with config: {config.model_dump()}")

    def load_model(self) -> None:
        """
        Load YOLOv8 model.

        Supports:
        - .pt files (PyTorch)
        - .engine files (TensorRT - future)

        Raises:
            RuntimeError: If model loading fails
        """
        try:
            logger.info(f"Loading YOLOv8 model from {self.config.model_path}")
            logger.info(f"Using device: {self.device}")

            # Load model
            self.model = YOLO(self.config.model_path)

            # Move to device
            if self.device != "cpu":
                self.model.to(self.device)

            # Enable half precision if requested (Jetson optimization)
            if self.config.half and self.device != "cpu":
                logger.info("Enabling FP16 half-precision mode")
                # Half precision enabled via inference parameters

            self.is_loaded = True
            logger.info(f"Model loaded successfully on {self.device}")

        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise RuntimeError(f"Model loading failed: {e}")

    def _map_coco_to_actor_type(self, class_id: int) -> Optional[str]:
        """
        Map COCO class ID to PCOS actor type.

        Args:
            class_id: COCO class ID

        Returns:
            Actor type string or None if not relevant
        """
        if class_id == self.COCO_PERSON_CLASS:
            # Phase 2: All persons are "player"
            # Phase 3+: Add referee detection logic
            return "player"
        elif class_id == self.COCO_SPORTS_BALL_CLASS:
            return "ball"
        else:
            return None

    def detect(
        self,
        frame: np.ndarray,
        frame_number: int,
        return_normalized: bool = True
    ) -> List[Detection]:
        """
        Run detection on a single frame.

        Args:
            frame: numpy array (H, W, C) in BGR format
            frame_number: frame index
            return_normalized: if True, also return normalized bboxes

        Returns:
            List of Detection objects

        Raises:
            RuntimeError: If model not loaded
        """
        if not self.is_loaded or self.model is None:
            raise RuntimeError("Model not loaded. Call load_model() first.")

        # Run inference
        results = self.model.predict(
            frame,
            conf=self.config.confidence_threshold,
            iou=self.config.iou_threshold,
            max_det=self.config.max_detections,
            imgsz=self.config.imgsz,
            half=self.config.half,
            device=self.device,
            verbose=False  # Suppress YOLO output
        )

        # Parse results
        detections = []
        frame_height, frame_width = frame.shape[:2]

        if len(results) > 0:
            result = results[0]  # Single frame result
            boxes = result.boxes

            for i in range(len(boxes)):
                class_id = int(boxes.cls[i].item())
                confidence = float(boxes.conf[i].item())
                bbox_xyxy = boxes.xyxy[i].cpu().numpy().tolist()  # [x1, y1, x2, y2]

                # Map to PCOS actor type
                actor_type = self._map_coco_to_actor_type(class_id)

                if actor_type is None:
                    continue  # Skip non-sports classes

                # Calculate normalized bbox if requested
                normalized_bbox = None
                if return_normalized:
                    normalized_bbox = [
                        bbox_xyxy[0] / frame_width,
                        bbox_xyxy[1] / frame_height,
                        bbox_xyxy[2] / frame_width,
                        bbox_xyxy[3] / frame_height
                    ]

                detection = Detection(
                    actor_type=actor_type,
                    confidence=confidence,
                    bbox=bbox_xyxy,
                    frame_number=frame_number,
                    class_id=class_id,
                    normalized_bbox=normalized_bbox
                )
                detections.append(detection)

        logger.debug(f"Frame {frame_number}: {len(detections)} detections")
        return detections

    def detect_batch(
        self,
        frames: List[np.ndarray],
        start_frame: int,
        return_normalized: bool = True
    ) -> List[List[Detection]]:
        """
        Run detection on multiple frames (batched for efficiency).

        Batched inference is significantly faster on GPU.

        Args:
            frames: list of numpy arrays (H, W, C)
            start_frame: starting frame number
            return_normalized: if True, also return normalized bboxes

        Returns:
            List of detection lists, one per frame

        Raises:
            RuntimeError: If model not loaded
        """
        if not self.is_loaded or self.model is None:
            raise RuntimeError("Model not loaded. Call load_model() first.")

        if not frames:
            return []

        # Run batched inference
        results = self.model.predict(
            frames,
            conf=self.config.confidence_threshold,
            iou=self.config.iou_threshold,
            max_det=self.config.max_detections,
            imgsz=self.config.imgsz,
            half=self.config.half,
            device=self.device,
            verbose=False,
            stream=False  # Return all results at once for batch
        )

        # Parse results for each frame
        all_detections = []

        for idx, result in enumerate(results):
            frame_number = start_frame + idx
            frame = frames[idx]
            frame_height, frame_width = frame.shape[:2]

            frame_detections = []
            boxes = result.boxes

            for i in range(len(boxes)):
                class_id = int(boxes.cls[i].item())
                confidence = float(boxes.conf[i].item())
                bbox_xyxy = boxes.xyxy[i].cpu().numpy().tolist()

                # Map to PCOS actor type
                actor_type = self._map_coco_to_actor_type(class_id)

                if actor_type is None:
                    continue

                # Calculate normalized bbox if requested
                normalized_bbox = None
                if return_normalized:
                    normalized_bbox = [
                        bbox_xyxy[0] / frame_width,
                        bbox_xyxy[1] / frame_height,
                        bbox_xyxy[2] / frame_width,
                        bbox_xyxy[3] / frame_height
                    ]

                detection = Detection(
                    actor_type=actor_type,
                    confidence=confidence,
                    bbox=bbox_xyxy,
                    frame_number=frame_number,
                    class_id=class_id,
                    normalized_bbox=normalized_bbox
                )
                frame_detections.append(detection)

            all_detections.append(frame_detections)
            logger.debug(f"Frame {frame_number}: {len(frame_detections)} detections")

        logger.info(f"Batch processed {len(frames)} frames: total {sum(len(d) for d in all_detections)} detections")
        return all_detections

    def get_model_info(self) -> Dict[str, Any]:
        """
        Get model metadata and configuration.

        Returns:
            Dictionary with model info
        """
        return {
            "model_path": self.config.model_path,
            "device": self.device,
            "is_loaded": self.is_loaded,
            "confidence_threshold": self.config.confidence_threshold,
            "iou_threshold": self.config.iou_threshold,
            "half_precision": self.config.half,
            "cuda_available": torch.cuda.is_available(),
            "cuda_device_count": torch.cuda.device_count() if torch.cuda.is_available() else 0
        }


# TODO Phase 3+: Implement referee detection logic
# Options:
# 1. Clothing color detection (striped shirts)
# 2. Court zone analysis (refs typically in specific zones)
# 3. Fine-tuned YOLO model with referee class
# 4. Pose-based heuristics (whistle, signals)

# TODO Phase 4+: TensorRT optimization
# - Export model: yolo export model=yolov8s.pt format=engine half=True
# - Update config to use .engine file
# - Verify FP16 performance on Jetson AGX Orin

# TODO Phase 5+: Multi-camera support
# - Integrate with DeepStream
# - Cross-camera actor matching
# - Panoramic field view reconstruction
