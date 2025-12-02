# RefIQ Schema v1.0

**Phase 13.0 - Stable Foundation**

This document describes the RefIQ v1.0 database schema for the PCOS Sports Perception Referee AI system.

---

## Overview

RefIQ v1.0 provides a stable database foundation for:
- Multi-source video ingestion (YouTube, Vimeo, Cloud, Local, Jetson)
- Event detection, reasoning, and governance
- Committee-based decision making
- SkillDNA profile tracking
- PCOS event bus integration

---

## Enum Types

| Enum | Values | Description |
|------|--------|-------------|
| `sourcetype` | youtube, vimeo, cloud, local, jetson, manual, s3, gcs, azure | Video source type |
| `processingstatus` | pending, downloading, processing, processing_skilldna, generating_clips, completed, failed | Game processing state |
| `ingestionstatus` | pending, downloading, processing, completed, failed | Ingestion job state |
| `eventsource` | detector, human, committee, external | Who/what created the event |
| `reasoningtype` | qsurface, ai_assist, human_note, committee_summary | Type of reasoning attached |
| `perspective` | referee, coach, player, league, neutral | Viewpoint perspective |
| `committeestatus` | open, in_progress, decided, archived | Committee case state |
| `committeeroundstatus` | open, closed | Round state |
| `speakertype` | human, ai_persona | Who is speaking |
| `subjecttype` | referee, player, crew | SkillDNA subject type |
| `clipcreatedby` | system, human, committee | Clip creator |

---

## Updated Tables

### games
The core table for game/video processing.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| sport | sporttype | Required |
| **title** | VARCHAR | *New in v1.0* |
| **source_type** | sourcetype | Default: 'local' |
| video_path | VARCHAR | Nullable |
| video_sources | JSONB | Multi-angle support |
| **game_metadata** | JSONB | *Renamed from metadata* |
| processing_status | processingstatus | Default: 'pending' |
| **created_at** | TIMESTAMP | Default: NOW() |
| **updated_at** | TIMESTAMP | Default: NOW() |

### actors
Tracked entities (players, refs, etc.)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| game_id | UUID | FK → games |
| actor_type | actortype | referee, player, ball, coach, other |
| **label** | VARCHAR | *New in v1.0* - Display name |
| **team** | VARCHAR | *New in v1.0* - Team affiliation |
| **actor_metadata** | JSONB | *Renamed from metadata* |

---

## New Tables

### ingestion_jobs
Tracks video download/ingestion operations.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| game_id | UUID | FK → games |
| source_url | TEXT | Required |
| source_type | sourcetype | Required |
| status | ingestionstatus | Default: 'pending' |
| error_message | TEXT | Failure details |
| started_at | TIMESTAMP | When job started |
| finished_at | TIMESTAMP | When job completed |
| created_at | TIMESTAMP | Default: NOW() |

### event_reasoning
Stores reasoning/explanation for events.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| game_id | UUID | FK → games |
| event_id | UUID | FK → events |
| reasoning_type | reasoningtype | qsurface, ai_assist, human_note, committee_summary |
| perspective | perspective | referee, coach, player, league, neutral |
| payload | JSONB | Reasoning content |
| created_by | VARCHAR | Who created it |
| created_at | TIMESTAMP | Default: NOW() |

### committee_cases
Committee review cases for disputed events.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| game_id | UUID | FK → games |
| event_id | UUID | FK → events |
| status | committeestatus | Default: 'open' |
| created_at | TIMESTAMP | Default: NOW() |
| updated_at | TIMESTAMP | Default: NOW() |

### committee_rounds
Discussion rounds within a case.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| case_id | UUID | FK → committee_cases |
| round_index | INTEGER | Round number |
| status | committeeroundstatus | Default: 'open' |
| created_at | TIMESTAMP | Default: NOW() |

### committee_messages
Individual messages in committee discussions.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| round_id | UUID | FK → committee_rounds |
| speaker_type | speakertype | human or ai_persona |
| speaker_name | VARCHAR | Who said it |
| content | TEXT | Message content |
| created_at | TIMESTAMP | Default: NOW() |

### committee_results
Final ruling from committee.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| case_id | UUID | FK → committee_cases |
| final_ruling | TEXT | Decision text |
| confidence | FLOAT | Confidence score |
| persona_votes | JSONB | Individual persona votes |
| applied_to_game | BOOLEAN | Default: FALSE |
| created_at | TIMESTAMP | Default: NOW() |

### skilldna_profiles
Unified skill profiles for refs, players, crews.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| subject_type | subjecttype | referee, player, crew |
| subject_id | UUID | Who this profile belongs to |
| sport | sporttype | Sport specialization |
| profile_vector | JSONB | Skill metrics |
| twin_alignment | FLOAT | Digital twin alignment score |
| profile_metadata | JSONB | Extra data |
| created_at | TIMESTAMP | Default: NOW() |
| updated_at | TIMESTAMP | Default: NOW() |

### skilldna_profile_updates
Delta updates to SkillDNA profiles.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| profile_id | UUID | FK → skilldna_profiles |
| game_id | UUID | FK → games |
| event_id | UUID | FK → events (optional) |
| delta_vector | JSONB | What changed |
| twin_delta | JSONB | Twin-specific changes |
| created_at | TIMESTAMP | Default: NOW() |

### pcos_event_store
Event sourcing for PCOS integration.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| event_type | VARCHAR | Event type name |
| source | VARCHAR | Originating service |
| payload | JSONB | Event data |
| correlation_id | VARCHAR | For tracing |
| created_at | TIMESTAMP | Default: NOW() |

---

## Relationships

```
games
├── ingestion_jobs (1:N)
├── events (1:N)
│   ├── event_reasoning (1:N)
│   └── committee_cases (1:N)
│       ├── committee_rounds (1:N)
│       │   └── committee_messages (1:N)
│       └── committee_results (1:1)
├── actors (1:N)
└── clips (1:N)

skilldna_profiles
└── skilldna_profile_updates (1:N)
    ├── game_id → games
    └── event_id → events (optional)

pcos_event_store
└── correlation_id (for event chains)
```

---

## Legacy Tables (Stable)

These tables remain unchanged from previous phases:

| Table | Status |
|-------|--------|
| events | Stable - core event detection |
| tracks | Stable - object tracking |
| frames | Stable - frame-level data |
| clips | Stable - video clip storage |
| clip_tracks | Stable - clip-track junction |
| pose_estimations | Stable - pose data |
| ball_possessions | Stable - possession tracking |
| action_classifications | Stable - action detection |
| llm_analyses | Stable - LLM reasoning |
| clip_feedback | Stable - user feedback |

---

## Migration Notes

- Migration script: `migrations/refiq_v1_migration.sql`
- Run: `PGPASSWORD=postgres psql -h localhost -U postgres -d refquest_ai -f migrations/refiq_v1_migration.sql`
- No data loss - all changes are additive
- Column renames: `metadata` → `game_metadata`, `actor_metadata`, `profile_metadata` (SQLAlchemy reserved keyword)

---

## What's Built vs Running

### Built & Running
- Games table with multi-source support
- Events/Tracks/Frames pipeline
- Clips generation
- Basic API endpoints

### Built, Needs Backend Work
- `ingestion_jobs` - Table exists, needs API routes
- `event_reasoning` - Table exists, needs QSurface integration
- `committee_*` tables - Schema ready, needs governance engine

### Built, Needs Frontend Work
- YouTube ingestion UI (partial)
- SkillDNA visualization
- Committee review interface

### Needs Full Implementation
- Vimeo/Cloud ingestion
- PCOS event bus publishing
- Digital twin integration

---

*RefIQ v1.0 - Phase 13.0 Complete*
