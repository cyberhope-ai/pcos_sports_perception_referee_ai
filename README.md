# PCOS Sports Perception Referee AI + RefQuest 2.0

**Version**: 2.0 (Phase 12+)
**Status**: ✅ Full Platform + RefQuest 2.0 PCOS-Native Skill Verification
**Last Updated**: December 2, 2025

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
├── pcos_bridge/                 # PCOS MCP integration
│   ├── __init__.py
│   └── mcp_client.py           # MCP client for PCOS kernel
├── ingestion/                   # Video ingestion pipelines
│   ├── video_processor.py      # Video processing logic
│   └── youtube_ingest.py       # YouTube video ingestion
├── tools/                       # CLI tools for ingestion and monitoring
│   ├── ingest_video.py         # Video ingestion CLI tool (Phase 8)
│   ├── check_game_status.py    # Game status checker CLI tool (Phase 8)
│   └── youtube_ingest.py       # YouTube ingestion CLI
├── system_validator/            # System validation utilities
├── refquest-ui/                 # React frontend for RefQuest
│   └── src/refquest/           # RefQuest UI components
│       ├── components/         # UI components (Ingestion, Review, Control)
│       ├── pcos/               # PCOS event bus integration
│       ├── api/                # API clients
│       └── state/              # State management (Zustand)
├── refquest_v2/                 # RefQuest 2.0 PCOS-Native Platform
│   ├── run_demo.py             # Interactive demo
│   ├── backend/                # Full backend implementation
│   └── tests/                  # E2E test suite
├── docs/                        # Documentation
├── migrations/                  # Database migrations
├── alembic/                     # Alembic migrations
├── docker-compose.yml           # Docker deployment
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

### Phase 12+ (✅ Complete)
- ✅ RefQuest 2.0 PCOS-Native Skill Verification Platform
- ✅ SkillDNA Engine with mastery tracking and decay models
- ✅ Quest Definition Engine with schema-based tasks
- ✅ Badge System with 20 achievement definitions
- ✅ TwinFlow integration for multimodal evidence capture
- ✅ QSurface packet generation for semantic tracing
- ✅ FastAPI backend with 19 REST endpoints + WebSocket
- ✅ React UI components (QuestCard, ChallengeView, SkillProfile)

---

## 🎮 RefQuest 2.0 — PCOS-Native Skill Verification Platform

RefQuest 2.0 is a complete skill verification system that integrates with PCOS (PrecognitionOS) to provide:

- **Quest Definitions**: Schema-based task templates with steps, evidence requirements, and skill targets
- **Challenge Execution**: Full lifecycle management from briefing to completion
- **SkillDNA Engine**: Mastery vectors with learning curves, decay models, and skill profiles
- **TwinFlow Integration**: Multi-camera video capture and evidence processing
- **Badge System**: Achievement tracking with rarity tiers and XP awards
- **QSurface Packets**: Semantic tracing for the learning journey

### RefQuest 2.0 Architecture

```
User → Camera → TwinFlow → TwinFlowPacket → QSurface → SkillDNA Engine
                    ↓
              EvidenceProcessor → StepVerification → MasteryUpdate → BadgeAward
```

### RefQuest 2.0 Project Structure

```
refquest_v2/
├── __init__.py
├── run_demo.py                  # Interactive demo launcher
├── backend/
│   ├── __init__.py              # Main exports
│   ├── refquest_engine.py       # Core orchestrator
│   ├── quest_schema.py          # Quest/Step definitions (~520 lines)
│   ├── quest_library.py         # Quest management & search
│   ├── sample_quests.py         # Demo quests (omelette, cable, safety)
│   ├── pcos_integration.py      # QSurface packet generation
│   ├── api/
│   │   ├── main.py              # FastAPI with 19 endpoints + WebSocket
│   │   ├── quest_api.py         # Quest CRUD operations
│   │   └── evaluate_api.py      # Step evaluation endpoints
│   ├── controllers/
│   │   └── challenge_controller.py  # Full execution flow
│   ├── ingestion/
│   │   ├── twinflow_bridge.py   # TwinFlow capture sessions
│   │   └── evidence_processor.py # Step verification logic
│   ├── scoring/
│   │   ├── skilldna_engine.py   # Profile management
│   │   ├── mastery_tracker.py   # Learning curves & decay
│   │   └── badge_system.py      # 20 badge definitions
│   └── models/
│       ├── quest.py             # Quest data models
│       ├── evidence.py          # Evidence data models
│       └── skill.py             # Skill data models
└── tests/
    └── test_refquest_e2e.py     # Comprehensive E2E tests
```

### Run RefQuest 2.0 Demo

```bash
cd pcos_sports_perception_referee_ai/refquest_v2
PYTHONPATH=.. python3 run_demo.py
```

**Demo Output:**
```
============================================================
  RefQuest 2.0 — PCOS-Native Skill Verification Demo
  PrecognitionOS Studio | CyberHopeAI
============================================================

────────────────────────────────────────
  1. Quest Definition Engine
────────────────────────────────────────
  Loaded 3 sample quests:
    • Make a Basic Omelette
      Category: training
      Difficulty: beginner
      Steps: 6
      Skills: cooking, heat_control, folding

────────────────────────────────────────
  2. Challenge Execution Flow
────────────────────────────────────────
  Starting challenge...
  ✓ Challenge ID: chall-abc123
  ✓ Phase: briefing

  User acknowledges briefing...
  ✓ Phase: active
  ✓ Started at: 2025-12-02T13:43:00

────────────────────────────────────────
  3. Skill Assessment (SkillDNA)
────────────────────────────────────────
  Recording skill assessments:
    • cooking: 85% → Mastery: 0.85 (master)
    • heat_control: 78% → Mastery: 0.78 (expert)
    • folding: 92% → Mastery: 0.92 (master)
    • plating: 88% → Mastery: 0.88 (master)

────────────────────────────────────────
  4. Badge System
────────────────────────────────────────
  Available badges: 20
  Badges earned this session: 2
    • Skill Master (rare)
      Achieved Master level in any skill

────────────────────────────────────────
  5. PCOS Integration (QSurface Packets)
────────────────────────────────────────
  Emitted: quest_start
    Packet ID: rqp-abc123def456
    Intent: user_starts_skill_verification

  PCOS Stats:
    Total packets: 3
    QSurface available: False
    TwinFlow available: False

────────────────────────────────────────
  6. Challenge Completion
────────────────────────────────────────
  Completing challenge...
  ✓ Phase: complete
  ✓ Overall Score: 85.8%
  ✓ Passed: True
  ✓ Time: 0.1s

============================================================
  RefQuest 2.0 Demo Complete!
============================================================
```

### Run RefQuest 2.0 Tests

```bash
cd pcos_sports_perception_referee_ai/refquest_v2
PYTHONPATH=.. python3 -m pytest tests/ -v
```

### Start RefQuest 2.0 API Server

```bash
cd pcos_sports_perception_referee_ai/refquest_v2
uvicorn backend.api.main:app --reload --port 8089

# API Docs: http://localhost:8089/docs
```

### RefQuest 2.0 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/quests` | GET | List all quests |
| `/quests/{id}` | GET | Get quest details |
| `/quests/search` | GET | Search quests by query |
| `/challenges` | POST | Start a new challenge |
| `/challenges/{id}` | GET | Get challenge progress |
| `/challenges/{id}/begin` | POST | Begin active phase |
| `/challenges/{id}/complete` | POST | Complete challenge |
| `/skills/{user_id}/profile` | GET | Get user's SkillDNA profile |
| `/skills/{user_id}/mastery` | GET | Get mastery levels |
| `/badges` | GET | List all badge definitions |
| `/badges/{user_id}` | GET | Get user's earned badges |
| `/ws/challenge/{id}` | WebSocket | Real-time challenge updates |

### SkillDNA Mastery Levels

| Level | Score Range | Description |
|-------|-------------|-------------|
| Novice | 0.0 - 0.2 | Just starting out |
| Apprentice | 0.2 - 0.4 | Learning the basics |
| Journeyman | 0.4 - 0.6 | Developing competence |
| Expert | 0.6 - 0.8 | Highly skilled |
| Master | 0.8 - 0.95 | Near perfection |
| Grandmaster | 0.95+ | Elite level |

### Badge Rarity Tiers

| Rarity | XP Award | Examples |
|--------|----------|----------|
| Common | 10 | First Quest, First Step |
| Uncommon | 25 | Consistent Performer, Quick Learner |
| Rare | 50 | Skill Master, Versatile Performer |
| Epic | 100 | Quest Legend, Skill Grandmaster |
| Legendary | 250 | PCOS Champion, Ultimate Master |

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
