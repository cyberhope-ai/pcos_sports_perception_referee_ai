/**
 * Phase 5A/5B: Timeline State Store (Zustand)
 *
 * Manages timeline view state and filters
 */
import { create } from 'zustand';
import type { FilterState } from '../types';

export interface TimelineFilters extends FilterState {
  foul_types?: string[];
}

interface TimelineState {
  selectedEventId: string | null;
  selectedClipId: string | null;
  hoveredEventId: string | null;
  filters: TimelineFilters;
  zoomLevel: number;
  timeRange: [number, number] | null;

  // Actions
  setSelectedEvent: (eventId: string | null, clipId?: string | null) => void;
  setSelectedClip: (clipId: string | null) => void;
  setHoveredEvent: (eventId: string | null) => void;
  setFilters: (filters: Partial<TimelineFilters>) => void;
  clearFilters: () => void;
  setZoomLevel: (level: number) => void;
  setTimeRange: (range: [number, number] | null) => void;
  reset: () => void;
}

export const useTimelineStore = create<TimelineState>((set) => ({
  // Initial state
  selectedEventId: null,
  selectedClipId: null,
  hoveredEventId: null,
  filters: {},
  zoomLevel: 1,
  timeRange: null,

  // Actions
  setSelectedEvent: (eventId, clipId) => set({
    selectedEventId: eventId,
    selectedClipId: clipId || null
  }),

  setSelectedClip: (clipId) => set({ selectedClipId: clipId }),

  setHoveredEvent: (eventId) => set({ hoveredEventId: eventId }),

  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),

  clearFilters: () => set({ filters: {} }),

  setZoomLevel: (level) => set({ zoomLevel: Math.max(0.5, Math.min(5, level)) }),

  setTimeRange: (range) => set({ timeRange: range }),

  reset: () =>
    set({
      selectedEventId: null,
      selectedClipId: null,
      hoveredEventId: null,
      filters: {},
      zoomLevel: 1,
      timeRange: null,
    }),
}));
