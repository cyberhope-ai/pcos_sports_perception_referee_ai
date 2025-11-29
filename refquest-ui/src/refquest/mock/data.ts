/**
 * Phase 12.0: Mock Data for RefQuest Shell
 *
 * Placeholder data for UI development before full backend integration
 */

import type {
  Committee,
  TeachingPackage,
  IngestionJob,
  HumanOverride,
  DebateRound,
  PersonaConfig
} from '../types';

// ====================
// MOCK GAMES
// ====================

export const mockGames = [
  {
    id: '1',
    video_url: '/videos/lakers_celtics_q4.mp4',
    upload_timestamp: '2025-11-28T10:00:00Z',
    processing_status: 'completed' as const,
    metadata: {
      league: 'NBA',
      teams: ['Lakers', 'Celtics'],
      date: '2025-11-27',
      venue: 'Staples Center',
      game_type: 'Regular Season',
    },
    duration: 2880,
    fps: 30,
  },
  {
    id: '2',
    video_url: '/videos/warriors_suns_q3.mp4',
    upload_timestamp: '2025-11-27T15:30:00Z',
    processing_status: 'completed' as const,
    metadata: {
      league: 'NBA',
      teams: ['Warriors', 'Suns'],
      date: '2025-11-26',
      venue: 'Chase Center',
      game_type: 'Regular Season',
    },
    duration: 2640,
    fps: 30,
  },
  {
    id: '3',
    video_url: '/videos/bulls_heat_q2.mp4',
    upload_timestamp: '2025-11-26T20:00:00Z',
    processing_status: 'processing_skilldna' as const,
    metadata: {
      league: 'NBA',
      teams: ['Bulls', 'Heat'],
      date: '2025-11-25',
      venue: 'United Center',
      game_type: 'Regular Season',
    },
    duration: 2400,
    fps: 30,
  },
];

// ====================
// MOCK COMMITTEES
// ====================

export const mockCommittees: Committee[] = [
  {
    id: 'committee-001',
    name: 'Ethics Review Board',
    type: 'ethics_review',
    status: 'deliberating',
    participants: [
      { id: 'p1', persona: 'flynn', name: 'Flynn', weight: 1.0, current_score: 0.82 },
      { id: 'p2', persona: 'yori', name: 'Yori', weight: 1.2, current_score: 0.78 },
      { id: 'p3', persona: 'tron', name: 'Tron', weight: 1.5, current_score: 0.91 },
    ],
    current_round: 3,
    consensus_score: 0.84,
    created_at: '2025-11-28T09:00:00Z',
    updated_at: '2025-11-28T10:30:00Z',
  },
  {
    id: 'committee-002',
    name: 'Rules Interpretation Panel',
    type: 'rules_interpretation',
    status: 'active',
    participants: [
      { id: 'p4', persona: 'referee', name: 'Senior Official', weight: 1.3, current_score: 0.88 },
      { id: 'p5', persona: 'league', name: 'League Rep', weight: 1.0, current_score: 0.85 },
    ],
    current_round: 1,
    consensus_score: 0.72,
    created_at: '2025-11-28T08:00:00Z',
    updated_at: '2025-11-28T08:15:00Z',
  },
  {
    id: 'committee-003',
    name: 'Player Safety Committee',
    type: 'player_safety',
    status: 'concluded',
    participants: [
      { id: 'p6', persona: 'tron', name: 'Safety Agent', weight: 2.0, current_score: 0.95 },
      { id: 'p7', persona: 'coach', name: 'Coach Rep', weight: 1.0, current_score: 0.88 },
    ],
    current_round: 5,
    consensus_score: 0.92,
    created_at: '2025-11-27T14:00:00Z',
    updated_at: '2025-11-27T16:30:00Z',
  },
];

// ====================
// MOCK DEBATE ROUNDS
// ====================

export const mockDebateRounds: DebateRound[] = [
  {
    round_number: 1,
    timestamp: '2025-11-28T09:00:00Z',
    participants: [
      {
        persona_id: 'flynn',
        bss8_scores: { mirror: 0.85, match: 0.80, misalign: 0.15, opportunity: 0.90, fairness: 0.70, risk: 0.40, intent: 0.85, decision_quality: 0.80 },
        position: 'Recommends leniency - first offense context',
      },
      {
        persona_id: 'yori',
        bss8_scores: { mirror: 0.75, match: 0.85, misalign: 0.10, opportunity: 0.70, fairness: 0.85, risk: 0.60, intent: 0.90, decision_quality: 0.85 },
        position: 'Standard enforcement - consistency matters',
      },
      {
        persona_id: 'tron',
        bss8_scores: { mirror: 0.90, match: 0.88, misalign: 0.05, opportunity: 0.60, fairness: 0.98, risk: 0.85, intent: 0.95, decision_quality: 0.92 },
        position: 'Strict enforcement - safety paramount',
      },
    ],
    consensus_score: 0.76,
    status: 'completed',
  },
  {
    round_number: 2,
    timestamp: '2025-11-28T09:15:00Z',
    participants: [
      {
        persona_id: 'flynn',
        bss8_scores: { mirror: 0.87, match: 0.82, misalign: 0.12, opportunity: 0.85, fairness: 0.78, risk: 0.50, intent: 0.87, decision_quality: 0.83 },
        position: 'Adjusted - acknowledges safety concerns',
      },
      {
        persona_id: 'yori',
        bss8_scores: { mirror: 0.78, match: 0.86, misalign: 0.08, opportunity: 0.72, fairness: 0.88, risk: 0.65, intent: 0.91, decision_quality: 0.87 },
        position: 'Maintains position with minor flexibility',
      },
      {
        persona_id: 'tron',
        bss8_scores: { mirror: 0.88, match: 0.87, misalign: 0.06, opportunity: 0.65, fairness: 0.95, risk: 0.80, intent: 0.93, decision_quality: 0.90 },
        position: 'Slight adjustment - context considered',
      },
    ],
    consensus_score: 0.82,
    status: 'completed',
  },
  {
    round_number: 3,
    timestamp: '2025-11-28T09:30:00Z',
    participants: [
      {
        persona_id: 'flynn',
        bss8_scores: { mirror: 0.88, match: 0.84, misalign: 0.10, opportunity: 0.82, fairness: 0.82, risk: 0.55, intent: 0.88, decision_quality: 0.85 },
        position: 'Converging toward consensus',
      },
      {
        persona_id: 'yori',
        bss8_scores: { mirror: 0.80, match: 0.87, misalign: 0.07, opportunity: 0.74, fairness: 0.90, risk: 0.68, intent: 0.92, decision_quality: 0.88 },
        position: 'Agreement with balanced approach',
      },
      {
        persona_id: 'tron',
        bss8_scores: { mirror: 0.87, match: 0.86, misalign: 0.07, opportunity: 0.68, fairness: 0.93, risk: 0.75, intent: 0.92, decision_quality: 0.89 },
        position: 'Consensus reached - balanced enforcement',
      },
    ],
    consensus_score: 0.87,
    status: 'completed',
  },
];

// ====================
// MOCK TEACHING PACKAGES
// ====================

export const mockTeachingPackages: TeachingPackage[] = [
  {
    id: 'pkg-001',
    game_id: 'game-001',
    title: 'Block vs Charge Decision Training',
    description: 'Learn to identify the subtle differences between blocking and charging fouls using real game footage.',
    event_ids: ['evt-001', 'evt-002', 'evt-003'],
    clips: [
      { id: 'tc-001', clip_id: 'clip-001', annotation: 'Clear blocking foul - defender still moving', key_points: ['Feet not set', 'Contact initiated by defender'], correct_call: 'Blocking Foul', rule_reference: 'Rule 12B Section 1' },
      { id: 'tc-002', clip_id: 'clip-002', annotation: 'Charge - offensive player lowers shoulder', key_points: ['Defender established', 'Contact with shoulder'], correct_call: 'Charging Foul', rule_reference: 'Rule 12B Section 2' },
    ],
    quiz_questions: [
      { id: 'q-001', question: 'What determines if a defender is "established"?', options: ['Feet set in position', 'Facing the offensive player', 'Both of the above', 'Neither'], correct_answer: 2, explanation: 'A defender must have both feet set and be facing the offensive player to be considered established.' },
    ],
    status: 'published',
    created_at: '2025-11-20T10:00:00Z',
    updated_at: '2025-11-25T14:30:00Z',
  },
  {
    id: 'pkg-002',
    game_id: 'game-002',
    title: 'Referee Positioning Fundamentals',
    description: 'Master optimal positioning for different play situations.',
    event_ids: ['evt-010', 'evt-011'],
    clips: [],
    quiz_questions: [],
    status: 'draft',
    created_at: '2025-11-27T09:00:00Z',
    updated_at: '2025-11-27T09:00:00Z',
  },
];

// ====================
// MOCK INGESTION JOBS
// ====================

export const mockIngestionJobs: IngestionJob[] = [
  {
    id: 'job-001',
    game_id: 'game-003',
    video_filename: 'bulls_heat_q2.mp4',
    status: 'analyzing',
    progress: 65,
    stage: 'Generating QSurfaces',
    started_at: '2025-11-28T10:00:00Z',
  },
  {
    id: 'job-002',
    video_filename: 'rockets_mavs_q1.mp4',
    status: 'processing',
    progress: 30,
    stage: 'ByteTrack Tracking',
    started_at: '2025-11-28T10:15:00Z',
  },
  {
    id: 'job-003',
    video_filename: 'knicks_nets_q4.mp4',
    status: 'queued',
    progress: 0,
    stage: 'Waiting in queue',
    started_at: '2025-11-28T10:20:00Z',
  },
];

// ====================
// MOCK HUMAN OVERRIDES
// ====================

export const mockOverrides: HumanOverride[] = [
  {
    id: 'override-001',
    event_id: 'evt-050',
    game_id: 'game-001',
    original_call: 'Blocking Foul',
    override_call: 'No Call',
    reason: 'Incidental contact - players competing for position',
    reviewer_id: 'ref-senior-001',
    status: 'approved',
    created_at: '2025-11-27T18:00:00Z',
    resolved_at: '2025-11-27T18:30:00Z',
  },
  {
    id: 'override-002',
    event_id: 'evt-051',
    game_id: 'game-001',
    original_call: 'No Call',
    override_call: 'Personal Foul',
    reason: 'Contact affected shot attempt - should be called',
    reviewer_id: 'ref-senior-002',
    status: 'pending',
    created_at: '2025-11-28T09:00:00Z',
  },
];

// ====================
// MOCK PERSONA CONFIGS
// ====================

export const mockPersonaConfigs: PersonaConfig[] = [
  { persona_id: 'flynn', name: 'Flynn - The Creator', weight: 1.0, enabled: true, bias_adjustments: { opportunity: 0.1 } },
  { persona_id: 'yori', name: 'Yori - The Reviewer', weight: 1.2, enabled: true, bias_adjustments: {} },
  { persona_id: 'tron', name: 'Tron - The Defender', weight: 1.5, enabled: true, bias_adjustments: { fairness: 0.15, risk: 0.1 } },
  { persona_id: 'referee', name: 'Referee Perspective', weight: 1.3, enabled: true, bias_adjustments: {} },
  { persona_id: 'coach', name: 'Coach Perspective', weight: 1.0, enabled: true, bias_adjustments: {} },
  { persona_id: 'league', name: 'League Perspective', weight: 1.0, enabled: true, bias_adjustments: {} },
];

// ====================
// MOCK REFEREE SKILLDNA
// ====================

export const mockRefereeSkillDNA = {
  referee_id: 'ref-001',
  name: 'John Smith',
  games_count: 147,
  total_events: 2450,
  avg_mechanics_score: 0.87,
  avg_visibility_score: 0.92,
  avg_rotation_quality: 0.84,
  avg_position_score: 0.89,
  occlusion_avg: 0.12,
  regional_coverage_score: 0.91,
  foul_counts_by_type: {
    'personal': 892,
    'shooting': 456,
    'offensive': 234,
    'technical': 45,
    'flagrant': 12,
  },
  call_density: 16.7,
  trend_data: [
    { date: '2025-11-01', mechanics: 0.84, visibility: 0.90 },
    { date: '2025-11-08', mechanics: 0.86, visibility: 0.91 },
    { date: '2025-11-15', mechanics: 0.87, visibility: 0.92 },
    { date: '2025-11-22', mechanics: 0.88, visibility: 0.93 },
    { date: '2025-11-28', mechanics: 0.87, visibility: 0.92 },
  ],
};
