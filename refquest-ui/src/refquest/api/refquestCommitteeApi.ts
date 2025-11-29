/**
 * Phase 12.4: Committee & Multi-Agent Governance API
 *
 * API layer for committee conversations, persona arguments, consensus,
 * and governance actions - the PCOS Supreme Court for officiating decisions
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// ===================
// TYPES
// ===================

export type PersonaRole = 'strict_judge' | 'flow_advocate' | 'safety_guardian' | 'league_rep';

export interface PersonaConfig {
  id: PersonaRole;
  name: string;
  archetype: string;
  icon: string;
  color: string;
  philosophy: string;
}

export const PERSONA_CONFIGS: Record<PersonaRole, PersonaConfig> = {
  strict_judge: {
    id: 'strict_judge',
    name: 'Strict Judge',
    archetype: 'Rule Enforcer',
    icon: '⚖️',
    color: 'red',
    philosophy: 'The rulebook is the foundation. Every call must be technically correct.',
  },
  flow_advocate: {
    id: 'flow_advocate',
    name: 'Flow Advocate',
    archetype: 'Game Flow Guardian',
    icon: '🌊',
    color: 'blue',
    philosophy: 'The game should flow naturally. Minor infractions should not disrupt rhythm.',
  },
  safety_guardian: {
    id: 'safety_guardian',
    name: 'Safety Guardian',
    archetype: 'Player Protection',
    icon: '🛡️',
    color: 'green',
    philosophy: 'Player safety comes first. Dangerous plays must always be called.',
  },
  league_rep: {
    id: 'league_rep',
    name: 'League Representative',
    archetype: 'Standards Keeper',
    icon: '🏛️',
    color: 'purple',
    philosophy: 'Consistency with league standards ensures fair competition across all games.',
  },
};

export interface PersonaArgument {
  personaId: PersonaRole;
  round: 1 | 2 | 3;
  stance: 'uphold' | 'overturn' | 'abstain';
  confidence: number; // 0-1
  reasoning: string;
  keyPoints: string[];
  ruleReferences: string[];
  rebuttalTo?: PersonaRole; // In round 2, who they're responding to
  emotionalTone: 'firm' | 'diplomatic' | 'concerned' | 'neutral';
}

export interface CommitteeRound {
  roundNumber: 1 | 2 | 3;
  roundType: 'initial' | 'rebuttal' | 'final';
  arguments: PersonaArgument[];
  humanNotes: { participantId: string; note: string; timestamp: string }[];
  completedAt?: string;
}

export interface ConsensusResult {
  recommendation: 'uphold' | 'overturn';
  confidence: number; // 0-1
  unanimity: number; // 0-1, how aligned are the personas
  personaVotes: Record<PersonaRole, 'uphold' | 'overturn' | 'abstain'>;
  dissentNotes: { personaId: PersonaRole; reason: string }[];
  finalReasoning: string;
  suggestedActions: string[];
}

export interface CommitteeConversation {
  id: string;
  eventId: string;
  gameId: string;
  eventDescription: string;
  originalCall: string;
  createdAt: string;
  status: 'in_progress' | 'pending_ruling' | 'completed';
  currentRound: 1 | 2 | 3;
  rounds: CommitteeRound[];
  consensus?: ConsensusResult;
  participants: {
    personas: PersonaRole[];
    humans: { id: string; name: string; role: string }[];
  };
}

export interface CommitteeAction {
  type: 'send_to_referee' | 'escalate_to_league' | 'create_teaching_package';
  committeeId: string;
  eventId: string;
  recommendation: 'uphold' | 'overturn';
  notes?: string;
}

export interface CommitteeActionResult {
  success: boolean;
  message: string;
  actionId: string;
  nextSteps?: string[];
}

// ===================
// API FUNCTIONS
// ===================

/**
 * Fetch committee conversation for a game
 */
export async function fetchCommitteeConversation(committeeId: string): Promise<CommitteeConversation> {
  try {
    const response = await fetch(`${API_BASE}/committees/${committeeId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch committee: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('[CommitteeAPI] Using mock committee conversation:', error);
    return generateMockCommitteeConversation(committeeId);
  }
}

/**
 * Fetch persona arguments for a specific event
 */
export async function fetchPersonaArguments(eventId: string, round?: 1 | 2 | 3): Promise<PersonaArgument[]> {
  try {
    const url = round
      ? `${API_BASE}/events/${eventId}/persona_arguments?round=${round}`
      : `${API_BASE}/events/${eventId}/persona_arguments`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch persona arguments: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('[CommitteeAPI] Using mock persona arguments:', error);
    return generateMockPersonaArguments(round);
  }
}

/**
 * Fetch committee recommendation/consensus
 */
export async function fetchCommitteeRecommendation(eventId: string): Promise<ConsensusResult> {
  try {
    const response = await fetch(`${API_BASE}/events/${eventId}/committee_recommendation`);
    if (!response.ok) {
      throw new Error(`Failed to fetch recommendation: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('[CommitteeAPI] Using mock consensus:', error);
    return generateMockConsensus();
  }
}

/**
 * Post committee action (send to ref, escalate, create teaching package)
 */
export async function postCommitteeAction(action: CommitteeAction): Promise<CommitteeActionResult> {
  try {
    const response = await fetch(`${API_BASE}/committees/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action),
    });
    if (!response.ok) {
      throw new Error(`Failed to post action: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('[CommitteeAPI] Using mock action result:', error);
    return generateMockActionResult(action);
  }
}

/**
 * Add human note to committee round
 */
export async function addHumanNote(
  committeeId: string,
  round: number,
  participantId: string,
  note: string
): Promise<{ success: boolean }> {
  try {
    const response = await fetch(`${API_BASE}/committees/${committeeId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ round, participantId, note }),
    });
    if (!response.ok) {
      throw new Error(`Failed to add note: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('[CommitteeAPI] Mock note added:', error);
    return { success: true };
  }
}

// ===================
// MOCK DATA GENERATORS
// ===================

function generateMockCommitteeConversation(committeeId: string): CommitteeConversation {
  const rounds: CommitteeRound[] = [
    {
      roundNumber: 1,
      roundType: 'initial',
      arguments: generateMockPersonaArguments(1),
      humanNotes: [],
      completedAt: new Date(Date.now() - 300000).toISOString(),
    },
    {
      roundNumber: 2,
      roundType: 'rebuttal',
      arguments: generateMockPersonaArguments(2),
      humanNotes: [
        {
          participantId: 'supervisor-1',
          note: 'The defender appeared to still be moving at contact.',
          timestamp: new Date(Date.now() - 200000).toISOString(),
        },
      ],
      completedAt: new Date(Date.now() - 100000).toISOString(),
    },
    {
      roundNumber: 3,
      roundType: 'final',
      arguments: generateMockPersonaArguments(3),
      humanNotes: [],
    },
  ];

  return {
    id: committeeId,
    eventId: `event-${committeeId}`,
    gameId: 'game-1',
    eventDescription: 'Block/Charge call in paint - Q4 2:34 remaining, score tied',
    originalCall: 'Charging foul on offensive player #23',
    createdAt: new Date(Date.now() - 600000).toISOString(),
    status: 'pending_ruling',
    currentRound: 3,
    rounds,
    consensus: generateMockConsensus(),
    participants: {
      personas: ['strict_judge', 'flow_advocate', 'safety_guardian', 'league_rep'],
      humans: [
        { id: 'supervisor-1', name: 'Mike Chen', role: 'Crew Chief Supervisor' },
        { id: 'analyst-1', name: 'Sarah Johnson', role: 'Video Analyst' },
      ],
    },
  };
}

function generateMockPersonaArguments(round?: 1 | 2 | 3): PersonaArgument[] {
  const targetRound = round || 1;

  const round1Args: PersonaArgument[] = [
    {
      personaId: 'strict_judge',
      round: 1,
      stance: 'uphold',
      confidence: 0.85,
      reasoning: 'The defensive player established legal guarding position before the offensive player began their upward motion. The contact occurred in the torso area, consistent with a charging foul.',
      keyPoints: [
        'Defender had both feet set',
        'Contact initiated by offensive player',
        'Defender was in legal position',
      ],
      ruleReferences: ['Rule 12B-1: Charging', 'Rule 4-6: Legal Guarding Position'],
      emotionalTone: 'firm',
    },
    {
      personaId: 'flow_advocate',
      round: 1,
      stance: 'overturn',
      confidence: 0.72,
      reasoning: 'The game was at a critical juncture with 2:34 remaining in a tie game. The contact was incidental and calling this disrupts the natural competitive flow at a crucial moment.',
      keyPoints: [
        'Marginal contact at best',
        'Critical game situation',
        'Let players decide the game',
      ],
      ruleReferences: ['Rule 12B-1: Block/Charge considerations'],
      emotionalTone: 'diplomatic',
    },
    {
      personaId: 'safety_guardian',
      round: 1,
      stance: 'uphold',
      confidence: 0.68,
      reasoning: 'While not a dangerous play per se, the offensive player was driving with significant momentum. Calling this correctly discourages reckless drives that could lead to injury.',
      keyPoints: [
        'High momentum drive',
        'Precedent for player safety',
        'Consistent enforcement protects players',
      ],
      ruleReferences: ['Rule 12B-2: Player Safety Considerations'],
      emotionalTone: 'concerned',
    },
    {
      personaId: 'league_rep',
      round: 1,
      stance: 'uphold',
      confidence: 0.78,
      reasoning: 'League standards emphasize rewarding defensive positioning. This call aligns with the directive to call charges when defenders establish position, promoting quality defense.',
      keyPoints: [
        'Consistent with league directives',
        'Rewards proper defensive technique',
        'Standard application of rule',
      ],
      ruleReferences: ['League Memo 2024-12: Block/Charge Clarifications'],
      emotionalTone: 'neutral',
    },
  ];

  const round2Args: PersonaArgument[] = [
    {
      personaId: 'strict_judge',
      round: 2,
      stance: 'uphold',
      confidence: 0.88,
      reasoning: 'Responding to Flow Advocate: Game situation cannot influence the application of rules. The rules exist precisely for high-pressure moments. The defender earned this call through proper positioning.',
      keyPoints: [
        'Rules apply equally in all situations',
        'Defender position was textbook',
        'Game context is irrelevant to rule application',
      ],
      ruleReferences: ['Rule 12B-1: No game-situation exception'],
      rebuttalTo: 'flow_advocate',
      emotionalTone: 'firm',
    },
    {
      personaId: 'flow_advocate',
      round: 2,
      stance: 'overturn',
      confidence: 0.65,
      reasoning: 'I acknowledge the defender had position, but the frame-by-frame shows the defender\'s feet were still in motion at the moment of contact. This is a no-call or blocking foul at best.',
      keyPoints: [
        'Video shows defender moving',
        'Contact point ambiguous',
        'Benefit of doubt to offense in drive situations',
      ],
      ruleReferences: ['Rule 4-6: Feet must be set'],
      rebuttalTo: 'strict_judge',
      emotionalTone: 'diplomatic',
    },
    {
      personaId: 'safety_guardian',
      round: 2,
      stance: 'abstain',
      confidence: 0.55,
      reasoning: 'After reviewing additional angles, this appears to be a standard basketball play without safety implications. I defer to the technical experts on the positioning question.',
      keyPoints: [
        'No safety concerns identified',
        'Normal basketball contact',
        'Deferring on technical ruling',
      ],
      ruleReferences: [],
      rebuttalTo: undefined,
      emotionalTone: 'neutral',
    },
    {
      personaId: 'league_rep',
      round: 2,
      stance: 'uphold',
      confidence: 0.82,
      reasoning: 'Supporting Strict Judge: The league has been clear that we want to see charges called when position is established. The marginal movement noted by Flow Advocate is within acceptable tolerance.',
      keyPoints: [
        'League tolerance for minor movement',
        'Emphasis on rewarding defense',
        'Consistency with season-long standards',
      ],
      ruleReferences: ['League Training Video: Block/Charge 2024'],
      rebuttalTo: 'flow_advocate',
      emotionalTone: 'neutral',
    },
  ];

  const round3Args: PersonaArgument[] = [
    {
      personaId: 'strict_judge',
      round: 3,
      stance: 'uphold',
      confidence: 0.90,
      reasoning: 'Final position: The charging call was correct. The defender established legal position, and the offensive player initiated contact. This is a textbook application of Rule 12B-1.',
      keyPoints: [
        'Legal guarding position confirmed',
        'Offensive player responsibility for contact',
        'Correct call by on-court official',
      ],
      ruleReferences: ['Rule 12B-1: Charging - Final Analysis'],
      emotionalTone: 'firm',
    },
    {
      personaId: 'flow_advocate',
      round: 3,
      stance: 'overturn',
      confidence: 0.58,
      reasoning: 'Final position: While I respect the technical analysis, I maintain this call was too impactful for the marginal nature of the infraction. The game deserved to be decided by players, not whistles.',
      keyPoints: [
        'Marginal call with major impact',
        'Game integrity concerns',
        'Minority position but principled stance',
      ],
      ruleReferences: ['Rule 12B-1: Discretionary application'],
      emotionalTone: 'diplomatic',
    },
    {
      personaId: 'safety_guardian',
      round: 3,
      stance: 'abstain',
      confidence: 0.50,
      reasoning: 'Final position: I maintain my abstention. This is a technical block/charge question without safety implications. I trust the committee majority on the correct ruling.',
      keyPoints: [
        'No safety dimension to this call',
        'Respecting technical experts',
        'Abstention appropriate here',
      ],
      ruleReferences: [],
      emotionalTone: 'neutral',
    },
    {
      personaId: 'league_rep',
      round: 3,
      stance: 'uphold',
      confidence: 0.85,
      reasoning: 'Final position: The on-court official made the correct call consistent with league standards. I recommend upholding with a note that this is a model example of proper charge recognition.',
      keyPoints: [
        'Correct application of league standards',
        'Potential teaching material',
        'Strong recommendation to uphold',
      ],
      ruleReferences: ['League Standards Manual Section 4.2'],
      emotionalTone: 'neutral',
    },
  ];

  switch (targetRound) {
    case 1:
      return round1Args;
    case 2:
      return round2Args;
    case 3:
      return round3Args;
    default:
      return round1Args;
  }
}

function generateMockConsensus(): ConsensusResult {
  return {
    recommendation: 'uphold',
    confidence: 0.78,
    unanimity: 0.67,
    personaVotes: {
      strict_judge: 'uphold',
      flow_advocate: 'overturn',
      safety_guardian: 'abstain',
      league_rep: 'uphold',
    },
    dissentNotes: [
      {
        personaId: 'flow_advocate',
        reason: 'The call had disproportionate impact on game outcome for a marginal infraction.',
      },
    ],
    finalReasoning:
      'The committee recommends upholding the charging call. The majority (2 of 4, with 1 abstention) agrees that the defender established legal guarding position and the offensive player initiated contact. While the Flow Advocate raises valid concerns about game impact, rule application must remain consistent.',
    suggestedActions: [
      'Notify referee of committee decision',
      'Add to block/charge teaching compilation',
      'No disciplinary action required',
    ],
  };
}

function generateMockActionResult(action: CommitteeAction): CommitteeActionResult {
  const messages: Record<CommitteeAction['type'], string> = {
    send_to_referee: 'Committee ruling sent to referee. Notification will appear in their RefQuest dashboard.',
    escalate_to_league: 'Case escalated to league office for additional review. Expected response within 24 hours.',
    create_teaching_package: 'Teaching package draft created. Opening editor for customization.',
  };

  return {
    success: true,
    message: messages[action.type],
    actionId: `action-${Date.now()}`,
    nextSteps:
      action.type === 'create_teaching_package'
        ? ['Review teaching package content', 'Add annotations', 'Publish to training library']
        : undefined,
  };
}

// ===================
// UTILITY FUNCTIONS
// ===================

/**
 * Get persona config by ID
 */
export function getPersonaConfig(personaId: PersonaRole): PersonaConfig {
  return PERSONA_CONFIGS[personaId];
}

/**
 * Calculate consensus from persona arguments
 */
export function calculateConsensusFromArguments(args: PersonaArgument[]): {
  recommendation: 'uphold' | 'overturn';
  confidence: number;
  unanimity: number;
} {
  const upholdVotes = args.filter((a) => a.stance === 'uphold');
  const overturnVotes = args.filter((a) => a.stance === 'overturn');
  const totalVoting = upholdVotes.length + overturnVotes.length;

  const recommendation = upholdVotes.length >= overturnVotes.length ? 'uphold' : 'overturn';
  const winningVotes = recommendation === 'uphold' ? upholdVotes : overturnVotes;

  const avgConfidence =
    winningVotes.reduce((sum, a) => sum + a.confidence, 0) / (winningVotes.length || 1);

  const unanimity = totalVoting > 0 ? winningVotes.length / totalVoting : 0;

  return {
    recommendation,
    confidence: avgConfidence,
    unanimity,
  };
}

/**
 * Get round label
 */
export function getRoundLabel(round: 1 | 2 | 3): string {
  const labels = {
    1: 'Initial Arguments',
    2: 'Rebuttals',
    3: 'Final Positions',
  };
  return labels[round];
}
