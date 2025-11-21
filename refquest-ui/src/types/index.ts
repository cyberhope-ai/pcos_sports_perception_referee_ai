/**
 * Phase 5A: Core TypeScript Type Definitions
 *
 * Defines all data models for the RefQuest AI application:
 * - Events (candidate_foul, ref_mechanics, crew_rotation)
 * - Clips (video segments linked to events)
 * - QSurfaces (4 persona-specific truth layers)
 * - SkillDNA (longitudinal performance metrics)
 * - Games, Actors, Trajectories
 */

// ====================
// ENUMS (String Literal Types)
// ====================

export type EventType =
  | 'candidate_foul'
  | 'referee_mechanics'
  | 'crew_rotation'
  | 'clip_generated';

export const EventType = {
  CANDIDATE_FOUL: 'candidate_foul' as const,
  REF_MECHANICS: 'referee_mechanics' as const,
  CREW_ROTATION: 'crew_rotation' as const,
  CLIP_GENERATED: 'clip_generated' as const,
};

export type SurfaceType =
  | 'referee_view'
  | 'coach_view'
  | 'player_view'
  | 'league_view';

export const SurfaceType = {
  REFEREE_VIEW: 'referee_view' as const,
  COACH_VIEW: 'coach_view' as const,
  PLAYER_VIEW: 'player_view' as const,
  LEAGUE_VIEW: 'league_view' as const,
};

export type PersonaType =
  | 'referee'
  | 'coach'
  | 'player'
  | 'league';

export const PersonaType = {
  REFEREE: 'referee' as const,
  COACH: 'coach' as const,
  PLAYER: 'player' as const,
  LEAGUE: 'league' as const,
};

export type ActorType =
  | 'referee'
  | 'player'
  | 'ball'
  | 'coach';

export const ActorType = {
  REFEREE: 'referee' as const,
  PLAYER: 'player' as const,
  BALL: 'ball' as const,
  COACH: 'coach' as const,
};

export type ProcessingStatus =
  | 'uploaded'
  | 'processing_video'
  | 'processing_skilldna'
  | 'generating_clips'
  | 'completed'
  | 'failed';

export const ProcessingStatus = {
  UPLOADED: 'uploaded' as const,
  PROCESSING_VIDEO: 'processing_video' as const,
  PROCESSING_SKILLDNA: 'processing_skilldna' as const,
  GENERATING_CLIPS: 'generating_clips' as const,
  COMPLETED: 'completed' as const,
  FAILED: 'failed' as const,
};

// ====================
// BASE TYPES
// ====================

export interface Game {
  id: string;
  video_url: string;
  upload_timestamp: string;
  processing_status: ProcessingStatus;
  metadata?: GameMetadata;
  duration?: number;
  fps?: number;
}

export interface GameMetadata {
  league?: string;
  teams?: string[];
  date?: string;
  venue?: string;
  game_type?: string;
}

// ====================
// EVENT TYPES
// ====================

export interface Event {
  id: string;
  game_id: string;
  event_type: EventType;
  timestamp: number;
  frame_number: number;
  confidence?: number;
  metadata: Record<string, any>;
}

export interface CandidateFoulEvent extends Event {
  event_type: 'candidate_foul';
  metadata: {
    foul_type?: string;
    severity?: string;
    actors_involved?: string[];
    contact_detected?: boolean;
    advantage_applied?: boolean;
  };
}

export interface RefMechanicsEvent extends Event {
  event_type: 'referee_mechanics';
  metadata: {
    official_id?: string;
    position_score?: number;
    visibility_score?: number;
    angle_quality?: string;
    distance_to_play?: number;
  };
}

export interface CrewRotationEvent extends Event {
  event_type: 'crew_rotation';
  metadata: {
    rotation_type?: string;
    officials_involved?: string[];
    coverage_score?: number;
    transition_quality?: string;
  };
}

// ====================
// CLIP TYPES
// ====================

export interface Clip {
  id: string;
  game_id: string;
  start_time: number;
  end_time: number;
  start_frame: number;
  end_frame: number;
  clip_path: string;
  thumbnail_path?: string;
  event_anchor_id?: string;
  related_events?: string[];
  clip_category?: string;
  tags?: string[];
  created_at?: string;
}

// ====================
// QSURFACE TYPES
// ====================

export interface QSurface {
  id: string;
  event_id: string;
  surface_type: SurfaceType;
  persona_id: string;
  scores: Record<string, number>;
  interpretation: string;
  metadata: Record<string, any>;
}

export interface RefereeQSurface extends QSurface {
  surface_type: 'referee_view';
  metadata: {
    decision_quality?: number;
    positioning_score?: number;
    visibility_score?: number;
    mechanics_adherence?: number;
    communication_effectiveness?: number;
  };
}

export interface CoachQSurface extends QSurface {
  surface_type: 'coach_view';
  metadata: {
    player_performance?: Record<string, number>;
    team_discipline?: number;
    tactical_insights?: string[];
  };
}

export interface PlayerQSurface extends QSurface {
  surface_type: 'player_view';
  metadata: {
    individual_performance?: number;
    foul_involvement?: string;
    game_impact?: number;
  };
}

export interface LeagueQSurface extends QSurface {
  surface_type: 'league_view';
  metadata: {
    consistency_score?: number;
    standards_compliance?: number;
    improvement_areas?: string[];
  };
}

// ====================
// SKILLDNA TYPES (Phase 5D)
// ====================

/**
 * Referee SkillDNA Profile
 * Aggregated performance metrics for a referee across games
 */
export interface RefereeSkillProfile {
  referee_id: string;
  games_count: number;
  total_events: number;
  avg_mechanics_score: number;
  avg_visibility_score: number;
  avg_rotation_quality: number;
  occlusion_avg: number;
  regional_coverage_score?: number;
  foul_counts_by_type: Record<string, number>;
  call_density?: number;
  last_updated?: string;
}

/**
 * Player SkillDNA Profile
 * Aggregated performance metrics for a player across games
 */
export interface PlayerSkillProfile {
  player_id: string;
  games_count: number;
  total_fouls: number;
  foul_counts_by_type: Record<string, number>;
  fouls_per_100_frames: number;
  avg_decision_quality_score: number;
  risk_index: number;
  defensive_discipline: number;
  contact_frequency?: number;
  last_updated?: string;
}

/**
 * Crew SkillDNA Profile
 * Aggregated performance metrics for an officiating crew
 */
export interface CrewSkillProfile {
  crew_id: string;
  games_count: number;
  avg_rotation_quality: number;
  avg_fairness_index: number;
  avg_consistency_signal: number;
  late_rotation_count: number;
  misaligned_rotation_count: number;
  last_updated?: string;
}

/**
 * Game Officiating Summary
 * League-level aggregates for a specific game
 */
export interface GameOfficiatingSummary {
  game_id: string;
  events_count: number;
  candidate_foul_count: number;
  ref_mechanics_count?: number;
  crew_rotation_count?: number;
  fairness_index_avg: number;
  consistency_signal_avg: number;
  regional_coverage_quality: number;
  occlusion_frequency: number;
}

// Legacy SkillDNA types (for backward compatibility)
export interface SkillDNAProfile {
  id: string;
  actor_id: string;
  actor_type: ActorType;
  profile_type: 'referee' | 'player' | 'crew';
  metrics: SkillDNAMetrics;
  trends: SkillDNATrends;
  last_updated: string;
}

export interface SkillDNAMetrics {
  positioning_avg?: number;
  decision_accuracy?: number;
  mechanics_score?: number;
  communication_score?: number;
  game_control?: number;
  // Player-specific
  discipline_score?: number;
  performance_rating?: number;
}

export interface SkillDNATrends {
  weekly?: TimeSeriesPoint[];
  monthly?: TimeSeriesPoint[];
  seasonal?: TimeSeriesPoint[];
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
  label?: string;
}

// ====================
// ACTOR TYPES
// ====================

export interface Actor {
  id: string;
  game_id: string;
  actor_type: ActorType;
  jersey_number?: string;
  team?: string;
  first_seen_frame: number;
  last_seen_frame: number;
  confidence_avg?: number;
  trajectory?: TrajectoryPoint[];
  bounding_boxes?: BoundingBox[];
}

export interface TrajectoryPoint {
  frame: number;
  x: number;
  y: number;
  timestamp: number;
}

export interface BoundingBox {
  frame: number;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

// ====================
// TIMELINE TYPES
// ====================

export interface TimelineEventMarker {
  id: string;
  type: 'event';
  event_type: string;
  timestamp: number;
  frame_number?: number;
  confidence?: number;
  has_clip: boolean;
  metadata: Record<string, any>;
}

export interface TimelineClipMarker {
  id: string;
  type: 'clip';
  clip_category?: string;
  start_time: number;
  end_time: number;
  duration: number;
  thumbnail_path?: string;
  event_anchor_id?: string;
}

export type TimelineMarker = TimelineEventMarker | TimelineClipMarker;

export interface TimelineResponse {
  game_id: string;
  sport: string;
  processing_status: string;
  total_events: number;
  total_clips: number;
  timeline_markers: TimelineMarker[];
}

// ====================
// API RESPONSE TYPES
// ====================

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    per_page?: number;
  };
}

export interface ErrorResponse {
  error: string;
  detail?: string;
  status_code?: number;
}

// ====================
// UI STATE TYPES
// ====================

export interface FilterState {
  event_types?: EventType[];
  time_range?: [number, number];
  persona?: PersonaType;
  min_confidence?: number;
}

export interface VideoPlayerState {
  currentTime: number;
  duration: number;
  playing: boolean;
  volume: number;
  muted: boolean;
  playbackRate: number;
}
