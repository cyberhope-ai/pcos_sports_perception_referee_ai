/**
 * Phase 12.4: Committee Store
 *
 * Zustand store for managing multi-agent committee deliberations,
 * persona arguments, rounds, and consensus building
 */

import { create } from 'zustand';
import {
  fetchCommitteeConversation,
  fetchPersonaArguments,
  postCommitteeAction,
  calculateConsensusFromArguments,
  type CommitteeConversation,
  type PersonaArgument,
  type ConsensusResult,
  type CommitteeAction,
  type CommitteeActionResult,
  type PersonaRole,
} from '../api/refquestCommitteeApi';

interface CommitteeState {
  // Conversation data
  conversation: CommitteeConversation | null;
  loadingConversation: boolean;
  errorConversation: string | null;

  // Current round state
  currentRound: 1 | 2 | 3;
  roundArguments: PersonaArgument[];
  loadingArguments: boolean;

  // Human notes (local state)
  humanNotes: Record<string, string>; // personaId -> note

  // Consensus
  consensus: ConsensusResult | null;
  loadingConsensus: boolean;

  // Action results
  lastAction: CommitteeActionResult | null;
  actionInProgress: boolean;

  // View state
  expandedPersonas: Set<PersonaRole>;
  selectedView: 'timeline' | 'grid';

  // Actions
  loadCommitteeData: (committeeId: string) => Promise<void>;
  loadRoundArguments: (round: 1 | 2 | 3) => Promise<void>;
  nextRound: () => void;
  prevRound: () => void;
  goToRound: (round: 1 | 2 | 3) => void;
  setHumanNote: (personaId: string, note: string) => void;
  computeConsensus: () => void;
  finalizeRuling: (action: CommitteeAction) => Promise<CommitteeActionResult>;
  togglePersonaExpanded: (personaId: PersonaRole) => void;
  setSelectedView: (view: 'timeline' | 'grid') => void;
  clearCommittee: () => void;
}

export const useCommitteeStore = create<CommitteeState>((set, get) => ({
  // Initial state
  conversation: null,
  loadingConversation: false,
  errorConversation: null,
  currentRound: 1,
  roundArguments: [],
  loadingArguments: false,
  humanNotes: {},
  consensus: null,
  loadingConsensus: false,
  lastAction: null,
  actionInProgress: false,
  expandedPersonas: new Set(['strict_judge'] as PersonaRole[]),
  selectedView: 'timeline',

  // Load full committee conversation
  loadCommitteeData: async (committeeId: string) => {
    set({
      loadingConversation: true,
      errorConversation: null,
    });

    try {
      const conversation = await fetchCommitteeConversation(committeeId);
      const currentRound = conversation.currentRound;

      // Get arguments for current round from the conversation
      const roundData = conversation.rounds.find((r) => r.roundNumber === currentRound);
      const roundArguments = roundData?.arguments || [];

      set({
        conversation,
        currentRound,
        roundArguments,
        consensus: conversation.consensus || null,
        loadingConversation: false,
      });
    } catch (error) {
      console.error('[CommitteeStore] Failed to load committee:', error);
      set({
        loadingConversation: false,
        errorConversation: 'Failed to load committee conversation',
      });
    }
  },

  // Load arguments for a specific round
  loadRoundArguments: async (round: 1 | 2 | 3) => {
    const { conversation } = get();
    if (!conversation) return;

    set({ loadingArguments: true });

    try {
      // First check if we have cached arguments in conversation
      const cachedRound = conversation.rounds.find((r) => r.roundNumber === round);
      if (cachedRound && cachedRound.arguments.length > 0) {
        set({
          roundArguments: cachedRound.arguments,
          loadingArguments: false,
        });
        return;
      }

      // Otherwise fetch from API
      const args = await fetchPersonaArguments(conversation.eventId, round);
      set({
        roundArguments: args,
        loadingArguments: false,
      });
    } catch (error) {
      console.error('[CommitteeStore] Failed to load round arguments:', error);
      set({ loadingArguments: false });
    }
  },

  // Navigate to next round
  nextRound: () => {
    const { currentRound } = get();
    if (currentRound < 3) {
      const nextRound = (currentRound + 1) as 1 | 2 | 3;
      set({ currentRound: nextRound });
      get().loadRoundArguments(nextRound);
    }
  },

  // Navigate to previous round
  prevRound: () => {
    const { currentRound } = get();
    if (currentRound > 1) {
      const prevRound = (currentRound - 1) as 1 | 2 | 3;
      set({ currentRound: prevRound });
      get().loadRoundArguments(prevRound);
    }
  },

  // Go to specific round
  goToRound: (round: 1 | 2 | 3) => {
    set({ currentRound: round });
    get().loadRoundArguments(round);
  },

  // Add human note for a persona
  setHumanNote: (personaId: string, note: string) => {
    set((state) => ({
      humanNotes: {
        ...state.humanNotes,
        [personaId]: note,
      },
    }));
  },

  // Compute consensus from current round 3 arguments
  computeConsensus: () => {
    const { conversation } = get();
    if (!conversation) return;

    set({ loadingConsensus: true });

    // Get round 3 arguments
    const round3 = conversation.rounds.find((r) => r.roundNumber === 3);
    const finalArgs = round3?.arguments || [];

    if (finalArgs.length === 0) {
      set({ loadingConsensus: false });
      return;
    }

    // Calculate consensus locally
    const { recommendation, confidence, unanimity } = calculateConsensusFromArguments(finalArgs);

    // Build persona votes
    const personaVotes: Record<PersonaRole, 'uphold' | 'overturn' | 'abstain'> = {
      strict_judge: 'abstain',
      flow_advocate: 'abstain',
      safety_guardian: 'abstain',
      league_rep: 'abstain',
    };

    finalArgs.forEach((arg) => {
      personaVotes[arg.personaId] = arg.stance;
    });

    // Build dissent notes
    const dissentNotes = finalArgs
      .filter((arg) => arg.stance !== recommendation && arg.stance !== 'abstain')
      .map((arg) => ({
        personaId: arg.personaId,
        reason: arg.keyPoints[0] || 'Dissenting position',
      }));

    const consensus: ConsensusResult = {
      recommendation,
      confidence,
      unanimity,
      personaVotes,
      dissentNotes,
      finalReasoning: `The committee ${recommendation === 'uphold' ? 'upholds' : 'overturns'} the original call with ${(confidence * 100).toFixed(0)}% confidence.`,
      suggestedActions: [
        'Notify referee of decision',
        recommendation === 'overturn' ? 'Log correction in game record' : 'Confirm original call',
      ],
    };

    set({
      consensus,
      loadingConsensus: false,
    });
  },

  // Finalize ruling and take action
  finalizeRuling: async (action: CommitteeAction) => {
    set({ actionInProgress: true });

    try {
      const result = await postCommitteeAction(action);
      set({
        lastAction: result,
        actionInProgress: false,
      });
      return result;
    } catch (error) {
      console.error('[CommitteeStore] Failed to finalize ruling:', error);
      const errorResult: CommitteeActionResult = {
        success: false,
        message: 'Failed to complete action',
        actionId: '',
      };
      set({
        lastAction: errorResult,
        actionInProgress: false,
      });
      return errorResult;
    }
  },

  // Toggle persona card expansion
  togglePersonaExpanded: (personaId: PersonaRole) => {
    set((state) => {
      const newSet = new Set(state.expandedPersonas);
      if (newSet.has(personaId)) {
        newSet.delete(personaId);
      } else {
        newSet.add(personaId);
      }
      return { expandedPersonas: newSet };
    });
  },

  // Set view mode
  setSelectedView: (view: 'timeline' | 'grid') => {
    set({ selectedView: view });
  },

  // Clear committee state
  clearCommittee: () => {
    set({
      conversation: null,
      loadingConversation: false,
      errorConversation: null,
      currentRound: 1,
      roundArguments: [],
      humanNotes: {},
      consensus: null,
      lastAction: null,
      expandedPersonas: new Set(['strict_judge'] as PersonaRole[]),
    });
  },
}));

// Selector hooks
export const useCommitteeConversation = () =>
  useCommitteeStore((state) => ({
    conversation: state.conversation,
    loading: state.loadingConversation,
    error: state.errorConversation,
  }));

export const useCommitteeRound = () =>
  useCommitteeStore((state) => ({
    currentRound: state.currentRound,
    arguments: state.roundArguments,
    loading: state.loadingArguments,
  }));

export const useCommitteeConsensus = () =>
  useCommitteeStore((state) => ({
    consensus: state.consensus,
    loading: state.loadingConsensus,
  }));

export const useCommitteeActions = () =>
  useCommitteeStore((state) => ({
    lastAction: state.lastAction,
    inProgress: state.actionInProgress,
  }));
