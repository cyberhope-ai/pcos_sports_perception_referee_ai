/**
 * Phase 12.1: Video Player Zustand Store
 *
 * Global state management for video player controls and synchronization
 */

import { create } from 'zustand';

interface VideoPlayerState {
  // Video element ref (set by VideoPlayer component)
  videoElement: HTMLVideoElement | null;

  // Playback state
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isLoading: boolean;
  isSeeking: boolean;

  // Playback controls
  playbackRate: number;
  volume: number;
  isMuted: boolean;

  // Video source
  videoUrl: string | null;

  // Selected event for sync
  selectedEventTimestamp: number | null;

  // Actions
  setVideoElement: (element: HTMLVideoElement | null) => void;
  setVideoUrl: (url: string) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  seekRelative: (delta: number) => void;
  stepFrame: (direction: 'forward' | 'backward') => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  updateTime: (time: number) => void;
  updateDuration: (duration: number) => void;
  setLoading: (loading: boolean) => void;
  setSeeking: (seeking: boolean) => void;
  setSelectedEventTimestamp: (timestamp: number | null) => void;
}

export const useVideoPlayerStore = create<VideoPlayerState>((set, get) => ({
  // Initial state
  videoElement: null,
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  isLoading: true,
  isSeeking: false,
  playbackRate: 1,
  volume: 1,
  isMuted: false,
  videoUrl: null,
  selectedEventTimestamp: null,

  // Actions
  setVideoElement: (element) => set({ videoElement: element }),

  setVideoUrl: (url) => set({ videoUrl: url, isLoading: true }),

  play: () => {
    const { videoElement } = get();
    if (videoElement) {
      videoElement.play().catch(console.error);
      set({ isPlaying: true });
    }
  },

  pause: () => {
    const { videoElement } = get();
    if (videoElement) {
      videoElement.pause();
      set({ isPlaying: false });
    }
  },

  togglePlay: () => {
    const { isPlaying, play, pause } = get();
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  },

  seek: (time) => {
    const { videoElement, duration } = get();
    if (videoElement) {
      const clampedTime = Math.max(0, Math.min(time, duration));
      videoElement.currentTime = clampedTime;
      set({ currentTime: clampedTime, isSeeking: true });
    }
  },

  seekRelative: (delta) => {
    const { currentTime, seek } = get();
    seek(currentTime + delta);
  },

  stepFrame: (direction) => {
    const { currentTime, seek } = get();
    // Assume 30fps, so each frame is ~0.033 seconds
    const frameTime = 1 / 30;
    const newTime = direction === 'forward'
      ? currentTime + frameTime
      : currentTime - frameTime;
    seek(newTime);
  },

  setPlaybackRate: (rate) => {
    const { videoElement } = get();
    if (videoElement) {
      videoElement.playbackRate = rate;
    }
    set({ playbackRate: rate });
  },

  setVolume: (volume) => {
    const { videoElement } = get();
    const clampedVolume = Math.max(0, Math.min(1, volume));
    if (videoElement) {
      videoElement.volume = clampedVolume;
    }
    set({ volume: clampedVolume, isMuted: clampedVolume === 0 });
  },

  toggleMute: () => {
    const { videoElement, isMuted, volume } = get();
    if (videoElement) {
      videoElement.muted = !isMuted;
    }
    set({ isMuted: !isMuted, volume: isMuted ? (volume || 1) : 0 });
  },

  updateTime: (time) => set({ currentTime: time, isSeeking: false }),

  updateDuration: (duration) => set({ duration, isLoading: false }),

  setLoading: (loading) => set({ isLoading: loading }),

  setSeeking: (seeking) => set({ isSeeking: seeking }),

  setSelectedEventTimestamp: (timestamp) => {
    set({ selectedEventTimestamp: timestamp });
    if (timestamp !== null) {
      get().seek(timestamp);
    }
  },
}));

// Utility functions
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatTimeFull(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
