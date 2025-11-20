/**
 * Phase 5A: Clip State Store (Zustand)
 *
 * Manages clip player state and selection
 */
import { create } from 'zustand';
import type { VideoPlayerState } from '../types';

interface ClipState {
  selectedClipId: string | null;
  playerState: VideoPlayerState;
  isFullscreen: boolean;
  showControls: boolean;

  // Actions
  setSelectedClip: (clipId: string | null) => void;
  updatePlayerState: (state: Partial<VideoPlayerState>) => void;
  setFullscreen: (fullscreen: boolean) => void;
  setShowControls: (show: boolean) => void;
  reset: () => void;
}

const initialPlayerState: VideoPlayerState = {
  currentTime: 0,
  duration: 0,
  playing: false,
  volume: 0.8,
  muted: false,
  playbackRate: 1,
};

export const useClipStore = create<ClipState>((set) => ({
  // Initial state
  selectedClipId: null,
  playerState: initialPlayerState,
  isFullscreen: false,
  showControls: true,

  // Actions
  setSelectedClip: (clipId) =>
    set({
      selectedClipId: clipId,
      playerState: initialPlayerState,
    }),

  updatePlayerState: (newState) =>
    set((state) => ({
      playerState: { ...state.playerState, ...newState },
    })),

  setFullscreen: (fullscreen) => set({ isFullscreen: fullscreen }),

  setShowControls: (show) => set({ showControls: show }),

  reset: () =>
    set({
      selectedClipId: null,
      playerState: initialPlayerState,
      isFullscreen: false,
      showControls: true,
    }),
}));
