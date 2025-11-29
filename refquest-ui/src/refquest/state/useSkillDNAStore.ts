/**
 * Phase 12.3: SkillDNA Store
 *
 * Zustand store for managing referee skill profiles and per-event skill impact
 */

import { create } from 'zustand';
import {
  fetchRefSkillProfile,
  fetchRefSkillHistory,
  fetchEventSkillImpact,
  type RefSkillProfile,
  type RefSkillHistoryEntry,
  type SkillImpact,
} from '../api/refquestSkillApi';

interface SkillDNAState {
  // Selected referee
  selectedRefId: string | null;

  // Profile data
  refProfile: RefSkillProfile | null;
  loadingProfile: boolean;
  errorProfile: string | null;

  // History data
  refHistory: RefSkillHistoryEntry[];
  loadingHistory: boolean;
  errorHistory: string | null;

  // Per-event impact
  currentEventId: string | null;
  eventImpact: SkillImpact | null;
  loadingEventImpact: boolean;
  errorEventImpact: string | null;

  // Actions
  setSelectedRefId: (refId: string | null) => void;
  loadRefProfile: (refId: string) => Promise<void>;
  loadRefHistory: (refId: string) => Promise<void>;
  loadEventImpact: (eventId: string) => Promise<void>;
  clearEventImpact: () => void;
  clearAll: () => void;
}

export const useSkillDNAStore = create<SkillDNAState>((set, get) => ({
  // Initial state
  selectedRefId: null,
  refProfile: null,
  loadingProfile: false,
  errorProfile: null,
  refHistory: [],
  loadingHistory: false,
  errorHistory: null,
  currentEventId: null,
  eventImpact: null,
  loadingEventImpact: false,
  errorEventImpact: null,

  // Set selected referee ID
  setSelectedRefId: (refId) => {
    set({ selectedRefId: refId });
  },

  // Load referee profile
  loadRefProfile: async (refId: string) => {
    // Skip if already loading same ref
    const state = get();
    if (state.loadingProfile && state.selectedRefId === refId) {
      return;
    }

    set({
      selectedRefId: refId,
      loadingProfile: true,
      errorProfile: null,
    });

    try {
      const profile = await fetchRefSkillProfile(refId);
      set({
        refProfile: profile,
        loadingProfile: false,
      });
    } catch (error) {
      console.error('[SkillDNAStore] Failed to load profile:', error);
      set({
        loadingProfile: false,
        errorProfile: 'Failed to load referee profile',
      });
    }
  },

  // Load referee history
  loadRefHistory: async (refId: string) => {
    set({
      loadingHistory: true,
      errorHistory: null,
    });

    try {
      const history = await fetchRefSkillHistory(refId);
      set({
        refHistory: history,
        loadingHistory: false,
      });
    } catch (error) {
      console.error('[SkillDNAStore] Failed to load history:', error);
      set({
        loadingHistory: false,
        errorHistory: 'Failed to load referee history',
      });
    }
  },

  // Load skill impact for an event
  loadEventImpact: async (eventId: string) => {
    // Skip if same event already loaded
    const state = get();
    if (state.currentEventId === eventId && state.eventImpact) {
      return;
    }

    set({
      currentEventId: eventId,
      loadingEventImpact: true,
      errorEventImpact: null,
    });

    try {
      const impact = await fetchEventSkillImpact(eventId);
      set({
        eventImpact: impact,
        loadingEventImpact: false,
      });
    } catch (error) {
      console.error('[SkillDNAStore] Failed to load event impact:', error);
      set({
        loadingEventImpact: false,
        errorEventImpact: 'Failed to load skill impact',
      });
    }
  },

  // Clear event impact
  clearEventImpact: () => {
    set({
      currentEventId: null,
      eventImpact: null,
      errorEventImpact: null,
    });
  },

  // Clear all state
  clearAll: () => {
    set({
      selectedRefId: null,
      refProfile: null,
      loadingProfile: false,
      errorProfile: null,
      refHistory: [],
      loadingHistory: false,
      errorHistory: null,
      currentEventId: null,
      eventImpact: null,
      loadingEventImpact: false,
      errorEventImpact: null,
    });
  },
}));

// Selector hooks for specific parts of state
export const useRefProfile = () => useSkillDNAStore((state) => ({
  profile: state.refProfile,
  loading: state.loadingProfile,
  error: state.errorProfile,
}));

export const useRefHistory = () => useSkillDNAStore((state) => ({
  history: state.refHistory,
  loading: state.loadingHistory,
  error: state.errorHistory,
}));

export const useEventImpact = () => useSkillDNAStore((state) => ({
  impact: state.eventImpact,
  loading: state.loadingEventImpact,
  error: state.errorEventImpact,
}));
