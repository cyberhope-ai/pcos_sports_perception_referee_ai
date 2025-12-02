-- RefIQ v1.0 Database Migration
-- This script migrates the existing schema to RefIQ v1.0
-- Run: PGPASSWORD=postgres psql -h localhost -U postgres -d refquest_ai -f refiq_v1_migration.sql

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

-- Create new enum types (if they don't exist)
DO $$ BEGIN
    CREATE TYPE sourcetype AS ENUM ('youtube', 'vimeo', 'cloud', 'local', 'jetson', 'manual', 's3', 'gcs', 'azure');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE processingstatus AS ENUM ('pending', 'downloading', 'processing', 'processing_skilldna', 'generating_clips', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ingestionstatus AS ENUM ('pending', 'downloading', 'processing', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE eventsource AS ENUM ('detector', 'human', 'committee', 'external');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE reasoningtype AS ENUM ('qsurface', 'ai_assist', 'human_note', 'committee_summary');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE perspective AS ENUM ('referee', 'coach', 'player', 'league', 'neutral');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE committeestatus AS ENUM ('open', 'in_progress', 'decided', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE committeeroundstatus AS ENUM ('open', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE speakertype AS ENUM ('human', 'ai_persona');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subjecttype AS ENUM ('referee', 'player', 'crew');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE clipcreatedby AS ENUM ('system', 'human', 'committee');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update actortype enum to include coach and other
ALTER TYPE actortype ADD VALUE IF NOT EXISTS 'coach';
ALTER TYPE actortype ADD VALUE IF NOT EXISTS 'other';

-- =============================================================================
-- ALTER EXISTING TABLES
-- =============================================================================

-- Games table updates
ALTER TABLE games ADD COLUMN IF NOT EXISTS title VARCHAR;
ALTER TABLE games ADD COLUMN IF NOT EXISTS source_type sourcetype DEFAULT 'local';
ALTER TABLE games ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE games ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE games ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create index for source_type if not exists
CREATE INDEX IF NOT EXISTS idx_game_source_type ON games(source_type);

-- Actors table updates
ALTER TABLE actors ADD COLUMN IF NOT EXISTS label VARCHAR;
ALTER TABLE actors ADD COLUMN IF NOT EXISTS team VARCHAR;
ALTER TABLE actors ADD COLUMN IF NOT EXISTS metadata JSONB;

-- =============================================================================
-- NEW TABLES
-- =============================================================================

-- Ingestion Jobs table
CREATE TABLE IF NOT EXISTS ingestion_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id),
    source_url TEXT NOT NULL,
    source_type sourcetype NOT NULL,
    status ingestionstatus DEFAULT 'pending',
    error_message TEXT,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingestion_job_game ON ingestion_jobs(game_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_job_status ON ingestion_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ingestion_job_created ON ingestion_jobs(created_at);

-- Event Reasoning table
CREATE TABLE IF NOT EXISTS event_reasoning (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id),
    event_id UUID NOT NULL REFERENCES events(id),
    reasoning_type reasoningtype NOT NULL,
    perspective perspective NOT NULL,
    payload JSONB NOT NULL,
    created_by VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_reasoning_game ON event_reasoning(game_id);
CREATE INDEX IF NOT EXISTS idx_event_reasoning_event ON event_reasoning(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reasoning_type ON event_reasoning(reasoning_type);
CREATE INDEX IF NOT EXISTS idx_event_reasoning_perspective ON event_reasoning(perspective);

-- Committee Cases table
CREATE TABLE IF NOT EXISTS committee_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id),
    event_id UUID NOT NULL REFERENCES events(id),
    status committeestatus DEFAULT 'open',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_committee_case_game ON committee_cases(game_id);
CREATE INDEX IF NOT EXISTS idx_committee_case_event ON committee_cases(event_id);
CREATE INDEX IF NOT EXISTS idx_committee_case_status ON committee_cases(status);

-- Committee Rounds table
CREATE TABLE IF NOT EXISTS committee_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES committee_cases(id),
    round_index INTEGER NOT NULL,
    status committeeroundstatus DEFAULT 'open',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_committee_round_case ON committee_rounds(case_id);
CREATE INDEX IF NOT EXISTS idx_committee_round_index ON committee_rounds(round_index);

-- Committee Messages table
CREATE TABLE IF NOT EXISTS committee_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID NOT NULL REFERENCES committee_rounds(id),
    speaker_type speakertype NOT NULL,
    speaker_name VARCHAR NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_committee_message_round ON committee_messages(round_id);
CREATE INDEX IF NOT EXISTS idx_committee_message_speaker ON committee_messages(speaker_name);

-- Committee Results table
CREATE TABLE IF NOT EXISTS committee_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES committee_cases(id),
    final_ruling TEXT NOT NULL,
    confidence FLOAT,
    persona_votes JSONB,
    applied_to_game BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_committee_result_case ON committee_results(case_id);

-- SkillDNA Profiles table (unified)
CREATE TABLE IF NOT EXISTS skilldna_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_type subjecttype NOT NULL,
    subject_id UUID NOT NULL,
    sport sporttype NOT NULL,
    profile_vector JSONB NOT NULL DEFAULT '{}',
    twin_alignment FLOAT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skilldna_profile_subject ON skilldna_profiles(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_skilldna_profile_sport ON skilldna_profiles(sport);
CREATE INDEX IF NOT EXISTS idx_skilldna_profile_updated ON skilldna_profiles(updated_at);

-- SkillDNA Profile Updates table
CREATE TABLE IF NOT EXISTS skilldna_profile_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES skilldna_profiles(id),
    game_id UUID NOT NULL REFERENCES games(id),
    event_id UUID REFERENCES events(id),
    delta_vector JSONB NOT NULL,
    twin_delta JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skilldna_update_profile ON skilldna_profile_updates(profile_id);
CREATE INDEX IF NOT EXISTS idx_skilldna_update_game ON skilldna_profile_updates(game_id);
CREATE INDEX IF NOT EXISTS idx_skilldna_update_created ON skilldna_profile_updates(created_at);

-- PCOS Event Store table
CREATE TABLE IF NOT EXISTS pcos_event_store (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR NOT NULL,
    source VARCHAR NOT NULL,
    payload JSONB NOT NULL,
    correlation_id VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pcos_event_type ON pcos_event_store(event_type);
CREATE INDEX IF NOT EXISTS idx_pcos_event_source ON pcos_event_store(source);
CREATE INDEX IF NOT EXISTS idx_pcos_event_correlation ON pcos_event_store(correlation_id);
CREATE INDEX IF NOT EXISTS idx_pcos_event_created ON pcos_event_store(created_at);

-- =============================================================================
-- DONE
-- =============================================================================

SELECT 'RefIQ v1.0 migration complete!' as status;
