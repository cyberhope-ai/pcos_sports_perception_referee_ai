/**
 * Phase 5A: Timeline State Store (Zustand)
 *
 * Manages timeline view state and filters
 */
import { create } from 'zustand';
import type { FilterState } from '../types';

interface TimelineState {
  selectedEventId: string | null;
  hoveredEventId: string | null;
  filters: FilterState;
  zoomLevel: number;
  timeRange: [number, number] | null;

  // Actions
  setSelectedEvent: (eventId: string | null) => void;
  setHoveredEvent: (eventId: string | null) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  clearFilters: () => void;
  setZoomLevel: (level: number) => void;
  setTimeRange: (range: [number, number] | null) => void;
  reset: () => void;
}

export const useTimelineStore = create<TimelineState>((set) => ({
  // Initial state
  selectedEventId: null,
  hoveredEventId: null,
  filters: {},
  zoomLevel: 1,
  timeRange: null,

  // Actions
  setSelectedEvent: (eventId) => set({ selectedEventId: eventId }),

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
      hoveredEventId: null,
      filters: {},
      zoomLevel: 1,
      timeRange: null,
    }),
}));
