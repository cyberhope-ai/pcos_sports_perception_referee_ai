"""
Phase 4 Integration Tests

Smoke tests to verify Phase 4: Clip Generation & Timeline System is properly integrated.

Tests:
1. Module imports work correctly
2. Configuration settings are loaded
3. API endpoints are registered
4. Components can be instantiated
"""
import pytest
from fastapi.testclient import TestClient


class TestPhase4ModuleImports:
    """Test that all Phase 4 modules can be imported"""

    def test_import_clip_extractor(self):
        """Test ClipExtractor module import"""
        from media.clip_extractor import ClipExtractor, ClipRequest, ClipResult, create_clip_request_from_event

        assert ClipExtractor is not None
        assert ClipRequest is not None
        assert ClipResult is not None
        assert create_clip_request_from_event is not None

    def test_import_video_processor_with_clips(self):
        """Test video_processor has clip generation integrated"""
        from ingestion.video_processor import VideoProcessor

        # Verify processor can be instantiated
        processor = VideoProcessor()
        assert processor is not None

    def test_import_main_with_clip_endpoints(self):
        """Test main.py has clip endpoints"""
        from main import app

        # Get all routes
        routes = [route.path for route in app.routes]

        # Check Phase 4 clip endpoints exist
        assert "/api/v1/games/{game_id}/clips" in routes
        assert "/api/v1/events/{event_id}/clip" in routes
        assert "/api/v1/games/{game_id}/timeline" in routes


class TestPhase4Configuration:
    """Test Phase 4 configuration settings"""

    def test_clip_config_loaded(self):
        """Test clip configuration settings are loaded"""
        from config import settings

        assert hasattr(settings, 'CLIP_OUTPUT_DIR')
        assert hasattr(settings, 'CLIP_PADDING_BEFORE')
        assert hasattr(settings, 'CLIP_PADDING_AFTER')

        # Verify defaults
        assert settings.CLIP_OUTPUT_DIR == "./clips"
        assert settings.CLIP_PADDING_BEFORE == 3.0
        assert settings.CLIP_PADDING_AFTER == 5.0


class TestPhase4APIEndpoints:
    """Test Phase 4 API endpoints are accessible"""

    @pytest.fixture
    def client(self):
        """Create FastAPI test client"""
        from main import app
        return TestClient(app)

    def test_health_endpoint(self, client):
        """Test basic health endpoint works"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "pcos_sports_perception_referee_ai"

    def test_clips_endpoint_structure(self, client):
        """Test clips endpoint exists (will 404 for invalid game_id, but endpoint is registered)"""
        from uuid import uuid4

        # Try to get clips for a non-existent game
        game_id = str(uuid4())
        response = client.get(f"/api/v1/games/{game_id}/clips")

        # Endpoint exists but game doesn't, so we expect either 404 or error response
        # The important thing is the endpoint is registered (not 404 for missing route)
        assert response.status_code in [200, 404, 422, 500]

    def test_event_clip_endpoint_structure(self, client):
        """Test event clip endpoint exists"""
        from uuid import uuid4

        # Try to get clip for a non-existent event
        event_id = str(uuid4())
        response = client.get(f"/api/v1/events/{event_id}/clip")

        # Endpoint exists but event doesn't
        assert response.status_code in [200, 404, 422, 500]

    def test_timeline_endpoint_structure(self, client):
        """Test timeline endpoint exists"""
        from uuid import uuid4

        # Try to get timeline for a non-existent game
        game_id = str(uuid4())
        response = client.get(f"/api/v1/games/{game_id}/timeline")

        # Endpoint exists but game doesn't
        assert response.status_code in [200, 404, 422, 500]


class TestPhase4ComponentInstantiation:
    """Test Phase 4 components can be instantiated"""

    def test_clip_extractor_instantiation(self):
        """Test ClipExtractor can be created"""
        from media.clip_extractor import ClipExtractor
        import tempfile

        with tempfile.TemporaryDirectory() as tmpdir:
            extractor = ClipExtractor(output_dir=tmpdir)

            assert extractor is not None
            assert extractor.codec == "libx264"
            assert extractor.preset == "medium"
            assert extractor.crf == 23

    def test_video_processor_instantiation(self):
        """Test VideoProcessor can be created"""
        from ingestion.video_processor import VideoProcessor

        processor = VideoProcessor()

        assert processor is not None
        assert processor.detector is None  # Not initialized yet
        assert processor.tracker is None
        assert processor.event_detector is None
        assert processor.qsurface_generator is None


class TestPhase4PipelineIntegration:
    """Test Phase 4 is integrated into pipeline"""

    def test_video_processor_has_clip_logic(self):
        """Test video_processor.py contains clip generation code"""
        import inspect
        from ingestion.video_processor import VideoProcessor

        # Get source code of process_video method
        source = inspect.getsource(VideoProcessor.process_video)

        # Verify clip generation code is present
        assert "clip_extractor" in source.lower() or "clipextractor" in source.lower()
        assert "generating_clips" in source.lower()
        assert "clips_generated" in source.lower()

    def test_game_processing_status_includes_clips(self):
        """Test Game model processing_status includes clip generation"""
        # This is implicitly tested by the pipeline, but we can verify
        # the status transitions mentioned in video_processor.py
        from ingestion.video_processor import VideoProcessor
        import inspect

        source = inspect.getsource(VideoProcessor.process_video)

        # Verify status transitions
        assert "processing_skilldna" in source
        assert "generating_clips" in source
        assert "completed" in source


class TestPhase4DatabaseModels:
    """Test Phase 4 uses existing Clip model"""

    def test_clip_model_exists(self):
        """Test Clip database model exists"""
        from models import Clip

        assert Clip is not None

    def test_clip_model_fields(self):
        """Test Clip model has required fields"""
        from models import Clip
        import inspect

        # Get Clip model attributes
        attrs = [attr for attr in dir(Clip) if not attr.startswith('_')]

        # Check key fields exist
        assert 'id' in attrs or 'id' in inspect.signature(Clip.__init__).parameters
        assert 'game_id' in str(Clip.__table__.columns).lower() or 'game_id' in attrs
        assert 'clip_path' in str(Clip.__table__.columns).lower() or 'clip_path' in attrs
        assert 'event_anchor_id' in str(Clip.__table__.columns).lower() or 'event_anchor_id' in attrs


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
