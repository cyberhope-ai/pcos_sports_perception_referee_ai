/**
 * Phase 12.2: Event Reasoning Store
 *
 * Zustand store for managing QSurface and AI Assist state
 */

import { create } from 'zustand';
import {
  fetchQSurfaces,
  fetchAiAssist,
  type QSurfaceData,
  type AiAssistData,
} from '../api/refquestQSurfaceApi';

interface EventReasoningState {
  // Current event
  currentEventId: string | null;

  // QSurface data
  qsurfaces: QSurfaceData | null;
  qsurfacesLoading: boolean;
  qsurfacesError: string | null;

  // AI Assist data
  aiAssist: AiAssistData | null;
  aiAssistLoading: boolean;
  aiAssistError: string | null;

  // UI State
  expandedPerspectives: Set<string>;
  selectedAction: 'accept' | 'override' | 'committee' | null;

  // Actions
  loadEventReasoning: (eventId: string) => Promise<void>;
  clearEventReasoning: () => void;
  togglePerspectiveExpand: (persona: string) => void;
  setSelectedAction: (action: 'accept' | 'override' | 'committee' | null) => void;
  sendToCommittee: () => void;
  acceptRecommendation: () => void;
  overrideCall: (newCall: string) => void;
}

export const useEventReasoningStore = create<EventReasoningState>((set, get) => ({
  // Initial state
  currentEventId: null,
  qsurfaces: null,
  qsurfacesLoading: false,
  qsurfacesError: null,
  aiAssist: null,
  aiAssistLoading: false,
  aiAssistError: null,
  expandedPerspectives: new Set(),
  selectedAction: null,

  // Load both QSurfaces and AI Assist for an event
  loadEventReasoning: async (eventId: string) => {
    // Skip if same event already loaded
    if (get().currentEventId === eventId && get().qsurfaces && get().aiAssist) {
      return;
    }

    set({
      currentEventId: eventId,
      qsurfacesLoading: true,
      aiAssistLoading: true,
      qsurfacesError: null,
      aiAssistError: null,
      selectedAction: null,
    });

    // Load both in parallel
    try {
      const [qsurfaces, aiAssist] = await Promise.all([
        fetchQSurfaces(eventId),
        fetchAiAssist(eventId),
      ]);

      set({
        qsurfaces,
        qsurfacesLoading: false,
        aiAssist,
        aiAssistLoading: false,
      });
    } catch (error) {
      console.error('[EventReasoningStore] Failed to load reasoning:', error);
      set({
        qsurfacesLoading: false,
        aiAssistLoading: false,
        qsurfacesError: 'Failed to load QSurface data',
        aiAssistError: 'Failed to load AI Assist data',
      });
    }
  },

  // Clear all reasoning data
  clearEventReasoning: () => {
    set({
      currentEventId: null,
      qsurfaces: null,
      qsurfacesLoading: false,
      qsurfacesError: null,
      aiAssist: null,
      aiAssistLoading: false,
      aiAssistError: null,
      expandedPerspectives: new Set(),
      selectedAction: null,
    });
  },

  // Toggle perspective expansion
  togglePerspectiveExpand: (persona: string) => {
    const { expandedPerspectives } = get();
    const newSet = new Set(expandedPerspectives);
    if (newSet.has(persona)) {
      newSet.delete(persona);
    } else {
      newSet.add(persona);
    }
    set({ expandedPerspectives: newSet });
  },

  // Set selected action
  setSelectedAction: (action) => {
    set({ selectedAction: action });
  },

  // Send current event to committee for review
  sendToCommittee: () => {
    const { currentEventId, aiAssist } = get();
    if (!currentEventId) return;

    console.log('[EventReasoningStore] Sending to committee:', {
      eventId: currentEventId,
      recommendedCall: aiAssist?.recommendedCall,
      confidence: aiAssist?.confidence,
    });

    set({ selectedAction: 'committee' });
    // TODO: Integrate with actual committee API
    // This would trigger the PCOS committee deliberation flow
  },

  // Accept the AI recommendation
  acceptRecommendation: () => {
    const { currentEventId, aiAssist } = get();
    if (!currentEventId || !aiAssist) return;

    console.log('[EventReasoningStore] Accepting recommendation:', {
      eventId: currentEventId,
      call: aiAssist.recommendedCall,
      confidence: aiAssist.confidence,
    });

    set({ selectedAction: 'accept' });
    // TODO: Integrate with backend to record decision
  },

  // Override with different call
  overrideCall: (newCall: string) => {
    const { currentEventId, aiAssist } = get();
    if (!currentEventId) return;

    console.log('[EventReasoningStore] Override call:', {
      eventId: currentEventId,
      originalCall: aiAssist?.recommendedCall,
      newCall,
    });

    set({ selectedAction: 'override' });
    // TODO: Integrate with backend to record override
  },
}));

// Selector hooks for specific parts of state
export const useQSurfaces = () => useEventReasoningStore((state) => ({
  qsurfaces: state.qsurfaces,
  loading: state.qsurfacesLoading,
  error: state.qsurfacesError,
}));

export const useAiAssist = () => useEventReasoningStore((state) => ({
  aiAssist: state.aiAssist,
  loading: state.aiAssistLoading,
  error: state.aiAssistError,
}));
