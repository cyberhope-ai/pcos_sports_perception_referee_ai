# PCOS Sports Perception Referee AI

**Version**: 1.0 (Phase 8)
**Status**: ✅ Functional Backend + Agent Bus Integration
**Last Updated**: November 21, 2025

---

## 🎯 Overview

PCOS Sports Perception Referee AI is a FastAPI-based microservice for automated sports officiating using computer vision and deep learning. It analyzes basketball games to detect events, track referee mechanics, calculate SkillDNA metrics, and generate officiating insights.

### Key Features

✅ **Video ingestion** from local files or YouTube URLs
✅ **Event detection** (candidate fouls, referee mechanics, crew rotations)
✅ **SkillDNA calculation** (fairness index, consistency signal, mechanics scores)
✅ **Timeline generation** with event markers and clips
✅ **Officiating summaries** for referee performance analysis
✅ **Agent Bus integration** with Omniscient multi-agent system (Phase 8)
✅ **CLI tools** for video ingestion and game status monitoring

---

## 📁 Project Structure

```
pcos_sports_perception_referee_ai/
├── main.py                      # FastAPI application entry point
├── config.py                    # Configuration settings
├── models.py                    # Pydantic data models
├── database.py                  # PostgreSQL database connection
├── perception/                  # Computer vision modules (placeholder)
├── skilldna/                    # SkillDNA metrics calculation (placeholder)
├── tools/                       # CLI tools for ingestion and monitoring
│   ├── ingest_video.py         # Video ingestion CLI tool (Phase 8)
│   └── check_game_status.py    # Game status checker CLI tool (Phase 8)
├── alembic/                     # Database migrations
├── requirements.txt             # Python dependencies
└── README.md                    # This file
```

---

## 🚀 Quick Start

### Prerequisites

1. **Python 3.8+** installed
2. **PostgreSQL** database running
3. **FFmpeg** installed (for video processing)
4. **Virtual environment** recommended

### Installation

```bash
# Clone the repository
git clone https://github.com/cyberhope-ai/pcos_sports_perception_referee_ai.git
cd pcos_sports_perception_referee_ai

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables (optional)
export DATABASE_URL="postgresql://user:password@localhost/pcos_sports"
export API_PORT=8088
```

### Database Setup

```bash
# Initialize Alembic (if not already done)
alembic init alembic

# Create migration
alembic revision --autogenerate -m "Initial schema"

# Apply migration
alembic upgrade head
```

### Start the Backend

```bash
# Start the FastAPI server
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8088 --reload

# Backend will be available at:
# - API: http://localhost:8088
# - API Docs: http://localhost:8088/docs
# - Health: http://localhost:8088/api/health
```

### Verify Backend is Running

```bash
# Check health endpoint
curl http://localhost:8088/api/health

# Expected output:
# {"status": "healthy", "version": "1.0"}
```

---

## 📊 API Endpoints

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/v1/ingest/video` | POST | Ingest video for processing |
| `/api/v1/games` | GET | List all games |
| `/api/v1/games/{game_id}` | GET | Get game details |
| `/api/v1/games/{game_id}/timeline` | GET | Get game timeline with events |
| `/api/v1/games/{game_id}/events` | GET | Get game events |
| `/api/v1/games/{game_id}/clips` | GET | Get game clips |
| `/api/v1/games/{game_id}/officiating_summary` | GET | Get SkillDNA officiating summary |

### Data Models

**Game**: Represents a basketball game with metadata and processing status
**Event**: Represents a detected event (foul, mechanic, rotation) with timestamp
**Clip**: Represents a video clip segment for an event
**OfficiatingSummary**: SkillDNA metrics for a game (fairness, consistency, mechanics)

---

## 🛠️ Phase 8: CLI Tools

Phase 8 added command-line tools for easy video ingestion and game monitoring.

### Tool 1: Video Ingestion

Ingest basketball videos into the PCOS backend for analysis.

```bash
# Basic usage
python tools/ingest_video.py --video-path /path/to/game.mp4

# With custom backend URL
python tools/ingest_video.py --video-path /path/to/game.mp4 --backend-url http://localhost:8000

# Ingest from URL
python tools/ingest_video.py --video-path https://example.com/game.mp4
```

**Output:**
```
✅ Video ingestion successful!

📋 Game ID: abc123-def456-789012
📊 Status: pending
💬 Message: Processing started

🔍 Next steps:
   1. Check status: python tools/check_game_status.py --game-id abc123-def456-789012
   2. Run Agent Bus analysis: cd ../omniscient/agent_bus && python demo_cli.py --game-id abc123-def456-789012
```

### Tool 2: Game Status Checker

Monitor game processing status and view SkillDNA metrics.

```bash
# Basic status check
python tools/check_game_status.py --game-id abc123-def456-789012

# Detailed status with events/clips
python tools/check_game_status.py --game-id abc123-def456-789012 --detailed

# Use different backend URL
python tools/check_game_status.py --game-id abc123-def456-789012 --backend-url http://localhost:8000
```

**Output:**
```
📋 Game Status
   ID: abc123-def456-789012
   Sport: basketball
   Processing Status: completed

📊 Events Analysis
   Total Events: 156
   Event Types:
     - candidate_foul: 42
     - referee_mechanic: 89
     - crew_rotation: 25

🎬 Clips Generated
   Total Clips: 156

📈 SkillDNA Summary
   Events Count: 156
   Candidate Fouls: 42
   Ref Mechanics: 89
   Crew Rotations: 25
   Fairness Index: 0.873
   Consistency Signal: 0.915

✅ Game is ready for Agent Bus analysis
   Run: cd ../omniscient/agent_bus && python demo_cli.py --game-id abc123-def456-789012
```

---

## 🤖 Agent Bus Integration (Phase 8)

The PCOS backend integrates with the **Omniscient Agent Bus** for multi-agent game analysis.

### End-to-End Workflow

```bash
# Step 1: Start PCOS Backend
cd pcos_sports_perception_referee_ai
source venv/bin/activate
uvicorn main:app --host 0.0.0.1 --port 8088

# Step 2: Ingest Video
python tools/ingest_video.py --video-path /path/to/game.mp4
# Note the game_id from output

# Step 3: Wait for Processing (check status)
python tools/check_game_status.py --game-id <game_id> --detailed

# Step 4: Run Agent Bus Analysis
cd ../omniscient/agent_bus
python demo_cli.py --game-id <game_id>

# Agent Bus will:
# - ClaudeAgent: Fetch timeline, events, SkillDNA metrics
# - PlannerAgent: Detect borderline events, create execution plan
# - GeminiAgent: Analyze borderline events against NCAA rules (Phase 9A)
# - PlannerAgent: Create teaching packages for referee training
```

### Agent Bus Repository

For complete Agent Bus documentation, see:
- **Repository**: https://github.com/cyberhope-ai/omniscient
- **Agent Bus README**: `omniscient/agent_bus/README.md`
- **Phase 8 Documentation**: Section "Phase 8 — Real Basketball Pipeline Integration"
- **Phase 9A Documentation**: Section "Phase 9A — GeminiAgent (Rules + Research Intelligence)"

---

## 🗄️ Database Schema

### Tables

**games**:
- `id` (UUID, primary key)
- `video_path` (string)
- `sport` (string, default: "basketball")
- `status` (enum: pending, processing, completed, failed)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**events**:
- `id` (UUID, primary key)
- `game_id` (UUID, foreign key)
- `event_type` (string: candidate_foul, referee_mechanic, crew_rotation)
- `timestamp` (float, seconds from start)
- `confidence` (float, 0.0-1.0)
- `mechanics_score` (float, 0.0-1.0, Phase 9A)
- `metadata` (JSON)
- `created_at` (timestamp)

**clips**:
- `id` (UUID, primary key)
- `event_id` (UUID, foreign key)
- `game_id` (UUID, foreign key)
- `clip_path` (string)
- `start_time` (float)
- `end_time` (float)
- `created_at` (timestamp)

**officiating_summaries**:
- `id` (UUID, primary key)
- `game_id` (UUID, foreign key, unique)
- `events_count` (integer)
- `candidate_foul_count` (integer)
- `ref_mechanics_count` (integer)
- `crew_rotation_count` (integer)
- `fairness_index_avg` (float)
- `consistency_signal_avg` (float)
- `avg_mechanics_score` (float, Phase 9A)
- `avg_visibility_score` (float, Phase 9A)
- `created_at` (timestamp)
- `updated_at` (timestamp)

---

## 🧪 Development

### Run Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html
```

### Database Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

### Code Style

```bash
# Format code with black
black .

# Lint with flake8
flake8 .

# Type checking with mypy
mypy main.py
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection string |
| `API_HOST` | `0.0.0.0` | API server host |
| `API_PORT` | `8088` | API server port |
| `API_PREFIX` | `/api` | API route prefix |
| `CORS_ORIGINS` | `["*"]` | CORS allowed origins |
| `LOG_LEVEL` | `INFO` | Logging level |

### Configuration File

Edit `config.py` to customize settings:

```python
class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://...")
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8088
    # ... more settings
```

---

## 📞 Troubleshooting

### Backend Won't Start

**Issue**: `ModuleNotFoundError` or import errors

**Solution**:
```bash
# Ensure virtual environment is activated
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

**Issue**: `Database connection failed`

**Solution**:
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Verify DATABASE_URL is correct
echo $DATABASE_URL

# Test connection manually
psql $DATABASE_URL
```

### Video Ingestion Fails

**Issue**: `Cannot connect to PCOS backend`

**Solution**:
```bash
# Verify backend is running
curl http://localhost:8088/api/health

# Check for port conflicts
lsof -i :8088

# Restart backend
pkill -f uvicorn
uvicorn main:app --host 0.0.0.0 --port 8088
```

**Issue**: `Video file not found`

**Solution**:
```bash
# Use absolute path
python tools/ingest_video.py --video-path /absolute/path/to/video.mp4

# Verify file exists
ls -lh /path/to/video.mp4
```

### Game Status Shows "pending" Forever

**Issue**: Game stuck in "pending" status

**Solution**:
```bash
# Check backend logs for errors
tail -f /tmp/backend.log

# Check database for game status
psql $DATABASE_URL -c "SELECT id, status FROM games WHERE id='<game_id>';"

# Manually update status if needed (dev only)
psql $DATABASE_URL -c "UPDATE games SET status='completed' WHERE id='<game_id>';"
```

---

## 🚧 Roadmap

### Phase 8 (✅ Complete)
- ✅ Video ingestion CLI tool
- ✅ Game status checker CLI tool
- ✅ Agent Bus integration with real game data
- ✅ Enhanced SkillDNA metrics (mechanics_score, visibility_score)

### Phase 9A (✅ Complete)
- ✅ GeminiAgent for NCAA rules intelligence
- ✅ Borderline event detection
- ✅ Teaching package generation
- ✅ NCAA block/charge ruleset documentation

### Phase 9B (Planned)
- 🔄 Real computer vision perception module
- 🔄 YOLO-based referee detection
- 🔄 Positioning analysis for mechanics_score calculation
- 🔄 Video clip extraction and encoding

### Phase 10 (Planned)
- 🔄 Real-time WebSocket updates for processing status
- 🔄 Frontend UI for viewing games and clips
- 🔄 Multi-game batch analysis
- 🔄 Automatic clip tagging and search

---

## 📚 Documentation

- **PIAP Master Document**: [View on GitHub](https://github.com/cyberhope-ai/omniscient/blob/master/docs/REFQUEST_PIAP_SYNC_MASTER.md)
- **Surface Documents**: [View Surfaces](https://github.com/cyberhope-ai/omniscient/tree/master/surfaces/refquest-sports-ai)
- **Agent Bus README**: `omniscient/agent_bus/README.md`
- **API Documentation**: http://localhost:8088/docs (when backend is running)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License - See LICENSE file for details.

---

## 🙏 Acknowledgments

**Generated via**: PCOS Omniscient Assimilation Engine (PIAP / BORG)
**Parent System**: [Precognition OS (PCOS)](https://github.com/cyberhope-ai/omniscient)
**Built with**: FastAPI, PostgreSQL, Python 3.8+

---

**Built with ❤️ by Rick Barretto, Vale and Claude**
**Part of the Omniscient + PCOS Ecosystem**
