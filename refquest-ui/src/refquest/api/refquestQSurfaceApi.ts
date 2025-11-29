/**
 * Phase 12.2: QSurface & AI Assist API
 *
 * API layer for QSurface perspectives and AI reasoning endpoints
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// ===================
// TYPES
// ===================

export interface QSurfacePerspective {
  persona: 'referee' | 'coach' | 'player' | 'league';
  score: number;
  confidence: number;
  reasoning: string[];
  ruleReferences: string[];
  keyFactors: string[];
  recommendation: string;
  dissent?: string;
}

export interface QSurfaceData {
  eventId: string;
  timestamp: number;
  perspectives: {
    referee: QSurfacePerspective;
    coach: QSurfacePerspective;
    player: QSurfacePerspective;
    league: QSurfacePerspective;
  };
  consensusScore: number;
  divergenceLevel: 'low' | 'medium' | 'high';
}

export interface AiAssistFactor {
  factor: string;
  weight: number;
  evidence: string;
  impact: 'supports' | 'opposes' | 'neutral';
}

export interface AlternativeCall {
  callType: string;
  probability: number;
  reasoning: string;
}

export interface PersonaBreakdown {
  persona: string;
  stance: string;
  score: number;
  keyReason: string;
}

export interface AiAssistData {
  eventId: string;
  recommendedCall: string;
  confidence: number;
  callCategory: string;
  factors: AiAssistFactor[];
  alternativeCalls: AlternativeCall[];
  ruleReferences: {
    rule: string;
    section: string;
    relevance: string;
  }[];
  personaBreakdown: PersonaBreakdown[];
  advisorySummary: string;
  riskLevel: 'low' | 'medium' | 'high';
  committeeRecommended: boolean;
}

// ===================
// API FUNCTIONS
// ===================

/**
 * Fetch QSurface perspectives for an event
 */
export async function fetchQSurfaces(eventId: string): Promise<QSurfaceData> {
  try {
    const response = await fetch(`${API_BASE}/events/${eventId}/qsurfaces`);
    if (!response.ok) {
      throw new Error(`Failed to fetch QSurfaces: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('[QSurfaceAPI] Using mock QSurface data:', error);
    return generateMockQSurfaces(eventId);
  }
}

/**
 * Fetch AI Assist analysis for an event
 */
export async function fetchAiAssist(eventId: string): Promise<AiAssistData> {
  try {
    const response = await fetch(`${API_BASE}/events/${eventId}/ai_assist`);
    if (!response.ok) {
      throw new Error(`Failed to fetch AI Assist: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('[QSurfaceAPI] Using mock AI Assist data:', error);
    return generateMockAiAssist(eventId);
  }
}

// ===================
// MOCK DATA GENERATORS
// ===================

function generateMockQSurfaces(eventId: string): QSurfaceData {
  const baseScore = 0.7 + Math.random() * 0.25;

  return {
    eventId,
    timestamp: Date.now(),
    perspectives: {
      referee: {
        persona: 'referee',
        score: Math.min(0.95, baseScore + 0.1),
        confidence: 0.85 + Math.random() * 0.1,
        reasoning: [
          'Defender was still in motion when contact occurred',
          'Offensive player had established position in the lane',
          'Contact initiated by defensive player moving laterally',
        ],
        ruleReferences: ['Rule 12B-1: Block/Charge', 'Rule 4-7: Legal Guarding Position'],
        keyFactors: ['Timing of contact', 'Defensive position', 'Player momentum'],
        recommendation: 'Blocking foul on defender',
      },
      coach: {
        persona: 'coach',
        score: baseScore - 0.15,
        confidence: 0.72,
        reasoning: [
          'Defender made effort to establish position',
          'Contact was initiated by offensive player driving',
          'Close call that could go either way',
        ],
        ruleReferences: ['Rule 12B-1: Block/Charge'],
        keyFactors: ['Defensive effort', 'Offensive aggression'],
        recommendation: 'Charge on offensive player',
        dissent: 'Defender showed clear defensive intent before contact',
      },
      player: {
        persona: 'player',
        score: baseScore - 0.1,
        confidence: 0.68,
        reasoning: [
          'Physical play is expected in the paint',
          'Both players were competing hard',
          'Normal basketball contact in drive situation',
        ],
        ruleReferences: ['Rule 12B-1: Block/Charge', 'Rule 4-23: Incidental Contact'],
        keyFactors: ['Game intensity', 'Physical play tolerance'],
        recommendation: 'No-call or play-on',
      },
      league: {
        persona: 'league',
        score: baseScore + 0.05,
        confidence: 0.91,
        reasoning: [
          'Consistent with league officiating standards',
          'Similar calls made in comparable situations',
          'Maintains game flow and fairness principles',
        ],
        ruleReferences: ['Rule 12B-1: Block/Charge', 'League Officiating Guidelines 2024'],
        keyFactors: ['Consistency', 'Precedent', 'Game management'],
        recommendation: 'Blocking foul - consistent with standards',
      },
    },
    consensusScore: baseScore,
    divergenceLevel: Math.random() > 0.6 ? 'high' : Math.random() > 0.3 ? 'medium' : 'low',
  };
}

function generateMockAiAssist(eventId: string): AiAssistData {
  const confidence = 0.75 + Math.random() * 0.2;
  const isHighConfidence = confidence > 0.85;

  return {
    eventId,
    recommendedCall: 'Blocking Foul',
    confidence,
    callCategory: 'Personal Foul',
    factors: [
      {
        factor: 'Defender Movement',
        weight: 0.35,
        evidence: 'Defender was sliding laterally at moment of contact',
        impact: 'supports',
      },
      {
        factor: 'Position Establishment',
        weight: 0.25,
        evidence: 'Defensive position not fully established before contact',
        impact: 'supports',
      },
      {
        factor: 'Contact Initiation',
        weight: 0.2,
        evidence: 'Contact initiated by defender moving into offensive path',
        impact: 'supports',
      },
      {
        factor: 'Offensive Player Rights',
        weight: 0.15,
        evidence: 'Offensive player had clear path to basket',
        impact: 'supports',
      },
      {
        factor: 'Defensive Effort',
        weight: 0.05,
        evidence: 'Defender showed attempt to take charge',
        impact: 'opposes',
      },
    ],
    alternativeCalls: [
      {
        callType: 'Charge',
        probability: 0.22,
        reasoning: 'Defender showed intent to establish position, close timing on contact',
      },
      {
        callType: 'No Call',
        probability: 0.08,
        reasoning: 'Could be considered incidental contact in physical play',
      },
    ],
    ruleReferences: [
      {
        rule: 'Rule 12B',
        section: 'Section 1 - Block/Charge',
        relevance: 'Primary rule governing this type of contact',
      },
      {
        rule: 'Rule 4',
        section: 'Section 7 - Legal Guarding Position',
        relevance: 'Defines requirements for establishing defensive position',
      },
      {
        rule: 'Rule 4',
        section: 'Section 23 - Incidental Contact',
        relevance: 'Distinguishes between fouls and incidental contact',
      },
    ],
    personaBreakdown: [
      {
        persona: 'Strict Judge',
        stance: 'Call the Foul',
        score: 0.92,
        keyReason: 'Clear violation of blocking rules - defender not set',
      },
      {
        persona: 'Flow Advocate',
        stance: 'Consider Context',
        score: 0.78,
        keyReason: 'Physical play expected, but this exceeds threshold',
      },
      {
        persona: 'Safety First',
        stance: 'Protect the Driver',
        score: 0.88,
        keyReason: 'Defender movement created dangerous collision',
      },
      {
        persona: 'League Standard',
        stance: 'Blocking Foul',
        score: 0.91,
        keyReason: 'Consistent with 2024 points of emphasis',
      },
    ],
    advisorySummary: isHighConfidence
      ? 'High confidence blocking foul call. Defender failed to establish legal guarding position before contact. All key indicators support the recommended call.'
      : 'Moderate confidence call. While indicators favor blocking foul, defensive effort is notable. Consider game context and flow before finalizing.',
    riskLevel: isHighConfidence ? 'low' : 'medium',
    committeeRecommended: !isHighConfidence || Math.random() > 0.7,
  };
}
