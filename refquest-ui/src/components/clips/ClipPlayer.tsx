/**
 * Phase 5B: Clip Player Component
 *
 * Video player for event clips with:
 * - Video playback controls
 * - Event metadata overlay
 * - Loading and error states
 */
import { useEffect, useRef, useState } from 'react';
import { useTimelineStore } from '../../state/timelineStore';
import { useEventClip } from '../../api/hooks';
import { type Clip } from '../../types';
import { formatTimestamp } from '../../utils/formatters';
import { Play, Pause, Volume2, VolumeX, Maximize, PlayCircle } from 'lucide-react';

export function ClipPlayer() {
  const { selectedEventId } = useTimelineStore();
  const { data: clip, isLoading, error } = useEventClip(selectedEventId || '');

  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);

  // Construct video URL from clip path
  const getVideoUrl = (clip: Clip): string => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
    // Assuming clip_path is relative to backend, construct full URL
    if (clip.clip_path.startsWith('http')) {
      return clip.clip_path;
    }
    // Remove /api/v1 from base URL and append clip path
    const cleanBaseUrl = baseUrl.replace('/api/v1', '');
    return `${cleanBaseUrl}${clip.clip_path}`;
  };

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);
    const handleEnded = () => setPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [clip]);

  // Volume control
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = muted;
    }
  }, [volume, muted]);

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const toggleMute = () => {
    setMuted(!muted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  // No event selected state
  if (!selectedEventId) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-8">
        <PlayCircle className="w-16 h-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Event Selected</h3>
        <p className="text-sm text-gray-600 text-center">
          Click on an event marker in the timeline to view its clip
        </p>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Loading clip...</p>
        </div>
      </div>
    );
  }

  // Error or no clip state
  if (error || !clip) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <PlayCircle className="w-8 h-8 text-yellow-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Clip Available</h3>
          <p className="text-sm text-gray-600">
            {error ? 'Error loading clip' : 'No clip generated for this event'}
          </p>
        </div>
      </div>
    );
  }

  const videoUrl = getVideoUrl(clip);

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Video player */}
      <div className="relative flex-1 bg-black">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          onClick={togglePlayPause}
        />

        {/* Event info overlay */}
        <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg text-sm">
          <div className="font-semibold">Event Clip</div>
          <div className="text-gray-300 text-xs">
            {formatTimestamp(clip.start_time)} - {formatTimestamp(clip.end_time)}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 px-4 py-3">
        {/* Progress bar */}
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer mb-3"
        />

        {/* Control buttons */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            {/* Play/Pause */}
            <button
              onClick={togglePlayPause}
              className="hover:text-primary-400 transition-colors"
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>

            {/* Time display */}
            <div className="text-sm tabular-nums">
              {formatTimestamp(currentTime)} / {formatTimestamp(duration)}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Volume control */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="hover:text-primary-400 transition-colors"
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="hover:text-primary-400 transition-colors"
              aria-label="Fullscreen"
            >
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Clip metadata */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-3 text-white">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-400 text-xs">Clip ID</div>
            <div className="font-mono text-xs truncate">{clip.id}</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs">Duration</div>
            <div>{formatTimestamp(clip.end_time - clip.start_time)}</div>
          </div>
          {clip.clip_category && (
            <div>
              <div className="text-gray-400 text-xs">Category</div>
              <div className="capitalize">{clip.clip_category.replace('_', ' ')}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
