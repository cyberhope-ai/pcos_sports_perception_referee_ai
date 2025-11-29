/**
 * Phase 12.3: SkillDNA & TwinFlow API
 *
 * API layer for referee skill profiles, history, and per-event skill impact
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// ===================
// TYPES
// ===================

export interface SkillScore {
  key: string;
  label: string;
  score: number; // 0-1
  trend: 'up' | 'down' | 'flat';
  gamesCount?: number;
}

export interface RefSkillProfile {
  refId: string;
  name: string;
  leagueLevel: string;
  gamesOfficiated: number;
  yearsExperience: number;
  overallScore: number;
  skills: SkillScore[];
  twinAlignment: number; // 0-1, how often ref agrees with AI twin
  lastUpdated: string;
}

export interface RefSkillHistoryEntry {
  date: string;
  gameId: string;
  opponent?: string;
  overallDelta: number;
  skillDeltas: { key: string; delta: number }[];
  twinAgreed: boolean;
  eventCount: number;
}

export interface GameOfficiatingSummary {
  gameId: string;
  refId: string;
  overallScore: number;
  skillScores: SkillScore[];
  eventsReviewed: number;
  twinAgreementRate: number;
  highlights: {
    eventId: string;
    description: string;
    impact: 'positive' | 'negative' | 'neutral';
  }[];
}

export interface SkillImpactEntry {
  key: string;
  label: string;
  delta: number;
  importance: 'low' | 'medium' | 'high';
}

export interface TwinFlowDelta {
  twinDecision: string;
  refDecision: string;
  severity: 'minor' | 'moderate' | 'major';
  note?: string;
  confidence: number;
}

export interface SkillImpact {
  eventId: string;
  summary: string;
  impacts: SkillImpactEntry[];
  twinDelta?: TwinFlowDelta;
  coachingNote?: string;
}

// ===================
// API FUNCTIONS
// ===================

/**
 * Fetch referee skill profile
 */
export async function fetchRefSkillProfile(refId: string): Promise<RefSkillProfile> {
  try {
    const response = await fetch(`${API_BASE}/refs/${refId}/skilldna`);
    if (!response.ok) {
      throw new Error(`Failed to fetch skill profile: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('[SkillAPI] Using mock skill profile:', error);
    return generateMockRefProfile(refId);
  }
}

/**
 * Fetch referee skill history
 */
export async function fetchRefSkillHistory(refId: string): Promise<RefSkillHistoryEntry[]> {
  try {
    const response = await fetch(`${API_BASE}/refs/${refId}/skill_history`);
    if (!response.ok) {
      throw new Error(`Failed to fetch skill history: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('[SkillAPI] Using mock skill history:', error);
    return generateMockRefHistory(refId);
  }
}

/**
 * Fetch game officiating summary
 */
export async function fetchGameOfficiatingSummary(gameId: string): Promise<GameOfficiatingSummary> {
  try {
    const response = await fetch(`${API_BASE}/games/${gameId}/officiating_summary`);
    if (!response.ok) {
      throw new Error(`Failed to fetch officiating summary: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('[SkillAPI] Using mock officiating summary:', error);
    return generateMockOfficiatingSummary(gameId);
  }
}

/**
 * Fetch skill impact for a specific event
 */
export async function fetchEventSkillImpact(eventId: string): Promise<SkillImpact> {
  try {
    const response = await fetch(`${API_BASE}/events/${eventId}/skill_impact`);
    if (!response.ok) {
      throw new Error(`Failed to fetch skill impact: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('[SkillAPI] Using mock skill impact:', error);
    return generateMockSkillImpact(eventId);
  }
}

// ===================
// MOCK DATA GENERATORS
// ===================

const SKILL_CATEGORIES = [
  { key: 'positioning', label: 'Positioning' },
  { key: 'mechanics', label: 'Mechanics' },
  { key: 'rotation', label: 'Rotation' },
  { key: 'foul_judgment', label: 'Foul Judgment' },
  { key: 'advantage', label: 'Advantage Play' },
  { key: 'communication', label: 'Communication' },
  { key: 'consistency', label: 'Consistency' },
  { key: 'game_management', label: 'Game Management' },
];

function generateMockRefProfile(refId: string): RefSkillProfile {
  const baseScore = 0.72 + Math.random() * 0.2;

  const skills: SkillScore[] = SKILL_CATEGORIES.map(cat => ({
    key: cat.key,
    label: cat.label,
    score: Math.min(0.98, Math.max(0.55, baseScore + (Math.random() - 0.5) * 0.3)),
    trend: Math.random() > 0.6 ? 'up' : Math.random() > 0.3 ? 'flat' : 'down',
    gamesCount: 20 + Math.floor(Math.random() * 100),
  }));

  return {
    refId,
    name: `Referee ${refId === '1' ? 'John Smith' : refId === '2' ? 'Maria Garcia' : `#${refId}`}`,
    leagueLevel: Math.random() > 0.5 ? 'NBA' : 'G-League',
    gamesOfficiated: 147 + Math.floor(Math.random() * 200),
    yearsExperience: 5 + Math.floor(Math.random() * 15),
    overallScore: baseScore,
    skills,
    twinAlignment: 0.78 + Math.random() * 0.15,
    lastUpdated: new Date().toISOString(),
  };
}

function generateMockRefHistory(refId: string): RefSkillHistoryEntry[] {
  const history: RefSkillHistoryEntry[] = [];
  const teams = ['Lakers', 'Celtics', 'Warriors', 'Bulls', 'Heat', 'Nets', 'Suns', 'Bucks'];

  for (let i = 0; i < 10; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i * 3);

    history.push({
      date: date.toISOString().split('T')[0],
      gameId: `game-${refId}-${i}`,
      opponent: `${teams[i % teams.length]} vs ${teams[(i + 1) % teams.length]}`,
      overallDelta: (Math.random() - 0.4) * 0.1,
      skillDeltas: SKILL_CATEGORIES.slice(0, 4).map(cat => ({
        key: cat.key,
        delta: (Math.random() - 0.45) * 0.08,
      })),
      twinAgreed: Math.random() > 0.25,
      eventCount: 15 + Math.floor(Math.random() * 20),
    });
  }

  return history;
}

function generateMockOfficiatingSummary(gameId: string): GameOfficiatingSummary {
  return {
    gameId,
    refId: '1',
    overallScore: 0.82 + Math.random() * 0.1,
    skillScores: SKILL_CATEGORIES.map(cat => ({
      key: cat.key,
      label: cat.label,
      score: 0.7 + Math.random() * 0.25,
      trend: 'flat' as const,
    })),
    eventsReviewed: 24 + Math.floor(Math.random() * 15),
    twinAgreementRate: 0.85 + Math.random() * 0.1,
    highlights: [
      {
        eventId: `evt-${gameId}-1`,
        description: 'Excellent positioning on fast break',
        impact: 'positive',
      },
      {
        eventId: `evt-${gameId}-2`,
        description: 'Missed rotation to weak side',
        impact: 'negative',
      },
      {
        eventId: `evt-${gameId}-3`,
        description: 'Good foul recognition under basket',
        impact: 'positive',
      },
    ],
  };
}

function generateMockSkillImpact(eventId: string): SkillImpact {
  const hasTwinDisagreement = Math.random() > 0.65;
  const impactCount = 2 + Math.floor(Math.random() * 3);

  const shuffledSkills = [...SKILL_CATEGORIES].sort(() => Math.random() - 0.5);
  const impacts: SkillImpactEntry[] = shuffledSkills.slice(0, impactCount).map(cat => ({
    key: cat.key,
    label: cat.label,
    delta: (Math.random() - 0.4) * 0.1,
    importance: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
  }));

  const twinDelta: TwinFlowDelta | undefined = hasTwinDisagreement ? {
    twinDecision: 'Blocking Foul',
    refDecision: 'Charge',
    severity: Math.random() > 0.7 ? 'major' : Math.random() > 0.4 ? 'moderate' : 'minor',
    note: 'AI Twin detected defender was still in motion at contact point',
    confidence: 0.78 + Math.random() * 0.15,
  } : undefined;

  const summaryParts = impacts.map(i => i.label);
  const summary = `This play affected ${summaryParts.join(', ')}`;

  const coachingNotes = [
    'Focus on establishing set position earlier in transition',
    'Good anticipation of driving lane - maintain this awareness',
    'Consider the angle of approach when reading contact',
    'Work on peripheral vision during post-up situations',
    'Strong game management in heated moment',
  ];

  return {
    eventId,
    summary,
    impacts,
    twinDelta,
    coachingNote: coachingNotes[Math.floor(Math.random() * coachingNotes.length)],
  };
}

// ===================
// UTILITY FUNCTIONS
// ===================

/**
 * Get top N skills (strengths)
 */
export function getTopSkills(skills: SkillScore[], n: number = 3): SkillScore[] {
  return [...skills].sort((a, b) => b.score - a.score).slice(0, n);
}

/**
 * Get bottom N skills (growth areas)
 */
export function getGrowthAreas(skills: SkillScore[], n: number = 3): SkillScore[] {
  return [...skills].sort((a, b) => a.score - b.score).slice(0, n);
}

/**
 * Calculate weighted overall score
 */
export function calculateOverallScore(skills: SkillScore[]): number {
  if (skills.length === 0) return 0;
  const sum = skills.reduce((acc, s) => acc + s.score, 0);
  return sum / skills.length;
}
