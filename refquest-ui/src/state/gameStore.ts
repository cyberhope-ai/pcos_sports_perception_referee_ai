/**
 * Phase 5A: Game State Store (Zustand)
 *
 * Manages global state for current game and persona selection
 */
import { create } from 'zustand';
import { PersonaType } from '../types';

interface GameState {
  currentGameId: string | null;
  selectedPersona: PersonaType;
  videoPlayerOpen: boolean;
  currentTimestamp: number;

  // Actions
  setCurrentGame: (gameId: string) => void;
  setSelectedPersona: (persona: PersonaType) => void;
  setVideoPlayerOpen: (open: boolean) => void;
  setCurrentTimestamp: (timestamp: number) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  // Initial state
  currentGameId: null,
  selectedPersona: PersonaType.REFEREE,
  videoPlayerOpen: false,
  currentTimestamp: 0,

  // Actions
  setCurrentGame: (gameId) => set({ currentGameId: gameId }),

  setSelectedPersona: (persona) => set({ selectedPersona: persona }),

  setVideoPlayerOpen: (open) => set({ videoPlayerOpen: open }),

  setCurrentTimestamp: (timestamp) => set({ currentTimestamp: timestamp }),

  reset: () =>
    set({
      currentGameId: null,
      selectedPersona: PersonaType.REFEREE,
      videoPlayerOpen: false,
      currentTimestamp: 0,
    }),
}));
