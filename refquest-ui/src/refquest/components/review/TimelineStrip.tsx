/**
 * Phase 12.1: Timeline Strip Component
 *
 * Visual timeline with clickable event markers, synced with video player
 */

import { useMemo, useState } from 'react';
import { useVideoPlayerStore, formatTime } from '../../state/useVideoPlayerStore';
import type { TimelineEvent } from '../../api/refquestVideoApi';

interface TimelineStripProps {
  events: TimelineEvent[];
  duration: number;
  onEventClick?: (event: TimelineEvent) => void;
}

const EVENT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  foul: { bg: 'bg-red-500', border: 'border-red-400', text: 'text-red-400' },
  violation: { bg: 'bg-orange-500', border: 'border-orange-400', text: 'text-orange-400' },
  timeout: { bg: 'bg-blue-500', border: 'border-blue-400', text: 'text-blue-400' },
  substitution: { bg: 'bg-green-500', border: 'border-green-400', text: 'text-green-400' },
  jump_ball: { bg: 'bg-purple-500', border: 'border-purple-400', text: 'text-purple-400' },
  out_of_bounds: { bg: 'bg-yellow-500', border: 'border-yellow-400', text: 'text-yellow-400' },
  default: { bg: 'bg-cyan-500', border: 'border-cyan-400', text: 'text-cyan-400' },
};

export function TimelineStrip({ events, duration, onEventClick }: TimelineStripProps) {
  const { currentTime, seek, selectedEventTimestamp } = useVideoPlayerStore();
  const [hoveredEvent, setHoveredEvent] = useState<TimelineEvent | null>(null);

  // Group events by quarter for visual separators
  const quarterMarkers = useMemo(() => {
    if (duration <= 0) return [];
    const quarters = [];
    const quarterLength = duration / 4;
    for (let i = 1; i < 4; i++) {
      quarters.push({
        position: (i * quarterLength / duration) * 100,
        label: `Q${i + 1}`,
      });
    }
    return quarters;
  }, [duration]);

  // Calculate playhead position
  const playheadPosition = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Handle timeline click (seek to position)
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    seek(percentage * duration);
  };

  // Handle event marker click
  const handleEventClick = (e: React.MouseEvent, event: TimelineEvent) => {
    e.stopPropagation();
    seek(event.timestamp);
    onEventClick?.(event);
  };

  const getEventColor = (eventType: string) => {
    return EVENT_COLORS[eventType] || EVENT_COLORS.default;
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/50 p-3">
      {/* Timeline Label Row */}
      <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
        <span>0:00</span>
        <div className="flex items-center gap-4">
          {Object.entries(EVENT_COLORS).slice(0, 5).map(([type, colors]) => (
            <div key={type} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${colors.bg}`} />
              <span className="capitalize">{type.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Main Timeline */}
      <div
        className="relative flex-1 bg-slate-800 rounded-lg cursor-pointer min-h-[40px]"
        onClick={handleTimelineClick}
      >
        {/* Quarter Separators */}
        {quarterMarkers.map((quarter, index) => (
          <div
            key={index}
            className="absolute top-0 bottom-0 w-px bg-slate-600"
            style={{ left: `${quarter.position}%` }}
          >
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-slate-500">
              {quarter.label}
            </span>
          </div>
        ))}

        {/* Event Markers */}
        {events.map((event) => {
          const position = (event.timestamp / duration) * 100;
          const colors = getEventColor(event.event_type);
          const isSelected = selectedEventTimestamp === event.timestamp;
          const isHovered = hoveredEvent?.id === event.id;

          return (
            <div
              key={event.id}
              className={`absolute top-1 bottom-1 w-2 rounded cursor-pointer transition-all ${colors.bg} ${
                isSelected ? 'ring-2 ring-white scale-125 z-20' : 'hover:scale-125 z-10'
              }`}
              style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
              onClick={(e) => handleEventClick(e, event)}
              onMouseEnter={() => setHoveredEvent(event)}
              onMouseLeave={() => setHoveredEvent(null)}
            >
              {/* Tooltip */}
              {(isHovered || isSelected) && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 pointer-events-none">
                  <div className={`bg-slate-900 border ${colors.border} rounded-lg p-2 shadow-xl min-w-[150px]`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium ${colors.text} capitalize`}>
                        {event.event_type.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-slate-500">Q{event.quarter}</span>
                    </div>
                    <p className="text-xs text-slate-300 mb-1">{event.description}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>{formatTime(event.timestamp)}</span>
                      <span>{(event.confidence * 100).toFixed(0)}% conf</span>
                    </div>
                  </div>
                  {/* Tooltip arrow */}
                  <div className={`absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900`} />
                </div>
              )}
            </div>
          );
        })}

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-30 pointer-events-none"
          style={{ left: `${playheadPosition}%` }}
        >
          {/* Playhead handle */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-cyan-400 rounded-full" />
          {/* Current time indicator */}
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-cyan-400 font-mono whitespace-nowrap">
            {formatTime(currentTime)}
          </div>
        </div>

        {/* Progress fill */}
        <div
          className="absolute inset-y-0 left-0 bg-cyan-500/10 rounded-l-lg pointer-events-none"
          style={{ width: `${playheadPosition}%` }}
        />
      </div>

      {/* Event Stats Row */}
      <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
        <span>{events.length} events</span>
        <div className="flex items-center gap-3">
          <span>Fouls: {events.filter(e => e.event_type === 'foul').length}</span>
          <span>Violations: {events.filter(e => e.event_type === 'violation').length}</span>
          <span>Timeouts: {events.filter(e => e.event_type === 'timeout').length}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact clip list for sidebar
 */
interface ClipListProps {
  clips: Array<{
    id: string;
    label: string;
    start_time: number;
    end_time: number;
  }>;
  onClipClick?: (clipId: string, startTime: number) => void;
}

export function ClipList({ clips, onClipClick }: ClipListProps) {
  const { seek, currentTime } = useVideoPlayerStore();

  const handleClipClick = (clip: ClipListProps['clips'][0]) => {
    seek(clip.start_time);
    onClipClick?.(clip.id, clip.start_time);
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-slate-400 mb-3">Clips ({clips.length})</h4>
      {clips.map((clip) => {
        const isActive = currentTime >= clip.start_time && currentTime <= clip.end_time;
        return (
          <button
            key={clip.id}
            onClick={() => handleClipClick(clip)}
            className={`w-full text-left p-2 rounded-lg transition-colors ${
              isActive
                ? 'bg-cyan-500/20 border border-cyan-500/30'
                : 'bg-slate-800/50 hover:bg-slate-700/50 border border-transparent'
            }`}
          >
            <p className={`text-sm font-medium ${isActive ? 'text-cyan-400' : 'text-white'}`}>
              {clip.label}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {formatTime(clip.start_time)} - {formatTime(clip.end_time)}
            </p>
          </button>
        );
      })}
    </div>
  );
}
