/**
 * Phase 12.0: RefQuest Shell Types
 *
 * Additional types for the new RefQuest App Shell
 */

// ====================
// COMMITTEE TYPES (PCOS MCP Integration)
// ====================

export interface Committee {
  id: string;
  name: string;
  type: 'ethics_review' | 'rules_interpretation' | 'player_safety' | 'game_analysis';
  status: 'active' | 'deliberating' | 'concluded' | 'suspended';
  participants: CommitteeParticipant[];
  current_round: number;
  consensus_score: number;
  created_at: string;
  updated_at: string;
}

export interface CommitteeParticipant {
  id: string;
  persona: 'flynn' | 'yori' | 'tron' | 'referee' | 'coach' | 'league';
  name: string;
  weight: number;
  current_score?: number;
  last_vote?: string;
}

export interface DebateRound {
  round_number: number;
  timestamp: string;
  participants: {
    persona_id: string;
    bss8_scores: BSS8Scores;
    position: string;
  }[];
  consensus_score: number;
  status: 'in_progress' | 'completed';
}

export interface BSS8Scores {
  mirror: number;
  match: number;
  misalign: number;
  opportunity: number;
  fairness: number;
  risk: number;
  intent: number;
  decision_quality: number;
}

// ====================
// TEACHING PACKAGE TYPES
// ====================

export interface TeachingPackage {
  id: string;
  game_id: string;
  title: string;
  description: string;
  event_ids: string[];
  clips: TeachingClip[];
  quiz_questions: QuizQuestion[];
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface TeachingClip {
  id: string;
  clip_id: string;
  annotation: string;
  key_points: string[];
  correct_call?: string;
  rule_reference?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  clip_id?: string;
}

// ====================
// INGESTION TYPES
// ====================

export interface IngestionJob {
  id: string;
  game_id?: string;
  video_filename: string;
  status: 'queued' | 'uploading' | 'processing' | 'analyzing' | 'completed' | 'failed';
  progress: number;
  stage: string;
  error?: string;
  started_at: string;
  completed_at?: string;
}

// ====================
// CONTROL ROOM TYPES
// ====================

export interface HumanOverride {
  id: string;
  event_id: string;
  game_id: string;
  original_call: string;
  override_call: string;
  reason: string;
  reviewer_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  resolved_at?: string;
}

export interface PersonaConfig {
  persona_id: string;
  name: string;
  weight: number;
  enabled: boolean;
  bias_adjustments: Record<string, number>;
}

// ====================
// TWINFLOW TYPES
// ====================

export interface TwinFlowSession {
  id: string;
  referee_id: string;
  session_type: 'review' | 'training' | 'assessment';
  events_reviewed: string[];
  skill_deltas: Record<string, number>;
  recommendations: string[];
  started_at: string;
  completed_at?: string;
}

// ====================
// NAVIGATION TYPES
// ====================

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  badge?: number;
  children?: NavItem[];
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
}
