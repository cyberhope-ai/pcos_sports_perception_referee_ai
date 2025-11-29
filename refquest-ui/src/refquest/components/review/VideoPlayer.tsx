/**
 * Phase 12.1: Video Player Component
 *
 * Full-featured video player with playback controls, speed adjustment, and frame stepping
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Loader2,
} from 'lucide-react';
import { useVideoPlayerStore, formatTimeFull } from '../../state/useVideoPlayerStore';

interface VideoPlayerProps {
  videoUrl?: string;
  onTimeUpdate?: (time: number) => void;
}

const PLAYBACK_RATES = [0.25, 0.5, 1, 1.5, 2];

export function VideoPlayer({ videoUrl, onTimeUpdate }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const {
    currentTime,
    duration,
    isPlaying,
    isLoading,
    playbackRate,
    isMuted,
    setVideoElement,
    play,
    pause,
    togglePlay,
    seek,
    seekRelative,
    stepFrame,
    setPlaybackRate,
    toggleMute,
    updateTime,
    updateDuration,
    setLoading,
  } = useVideoPlayerStore();

  // Register video element with store
  useEffect(() => {
    if (videoRef.current) {
      setVideoElement(videoRef.current);
    }
    return () => setVideoElement(null);
  }, [setVideoElement]);

  // Handle video events
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      updateTime(time);
      onTimeUpdate?.(time);
    }
  }, [updateTime, onTimeUpdate]);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      updateDuration(videoRef.current.duration);
      setLoading(false);
    }
  }, [updateDuration, setLoading]);

  const handlePlay = useCallback(() => play(), [play]);
  const handlePause = useCallback(() => pause(), [pause]);

  // Progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    seek(percentage * duration);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekRelative(e.shiftKey ? -10 : -5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekRelative(e.shiftKey ? 10 : 5);
          break;
        case ',':
          stepFrame('backward');
          break;
        case '.':
          stepFrame('forward');
          break;
        case 'm':
          toggleMute();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, seekRelative, stepFrame, toggleMute]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="relative w-full h-full bg-black group">
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={handlePlay}
        onPause={handlePause}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
        playsInline
      />

      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
        </div>
      )}

      {/* No Video Placeholder */}
      {!videoUrl && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
          <Play className="w-16 h-16 text-slate-600 mb-4" />
          <p className="text-slate-500">No video loaded</p>
          <p className="text-xs text-slate-600 mt-1">Select a game to begin review</p>
        </div>
      )}

      {/* Controls Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Progress Bar */}
        <div
          className="h-1.5 bg-slate-700 rounded-full cursor-pointer mb-3 group/progress"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-cyan-500 rounded-full relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-cyan-400 rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center gap-4">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-white" />
            ) : (
              <Play className="w-6 h-6 text-white" />
            )}
          </button>

          {/* Skip Backward */}
          <button
            onClick={() => seekRelative(-10)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Back 10s"
          >
            <SkipBack className="w-5 h-5 text-white" />
          </button>

          {/* Frame Step Backward */}
          <button
            onClick={() => stepFrame('backward')}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Previous frame (,)"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>

          {/* Frame Step Forward */}
          <button
            onClick={() => stepFrame('forward')}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Next frame (.)"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>

          {/* Skip Forward */}
          <button
            onClick={() => seekRelative(10)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Forward 10s"
          >
            <SkipForward className="w-5 h-5 text-white" />
          </button>

          {/* Time Display */}
          <div className="text-sm text-white font-mono">
            {formatTimeFull(currentTime)} / {formatTimeFull(duration)}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Playback Speed */}
          <div className="flex items-center gap-1">
            {PLAYBACK_RATES.map((rate) => (
              <button
                key={rate}
                onClick={() => setPlaybackRate(rate)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  playbackRate === rate
                    ? 'bg-cyan-500 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Volume */}
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-white" />
            ) : (
              <Volume2 className="w-5 h-5 text-white" />
            )}
          </button>

          {/* Fullscreen */}
          <button
            onClick={() => videoRef.current?.requestFullscreen?.()}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Maximize className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Play/Pause Center Indicator (brief flash) */}
      <div
        className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-200 ${
          isPlaying ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="w-20 h-20 rounded-full bg-black/50 flex items-center justify-center">
          <Play className="w-10 h-10 text-white ml-1" />
        </div>
      </div>
    </div>
  );
}
