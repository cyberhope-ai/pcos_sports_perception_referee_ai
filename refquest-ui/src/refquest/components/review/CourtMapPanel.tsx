/**
 * Phase 12.9: Court Map Panel
 *
 * SVG-based basketball court visualization showing event locations.
 * Displays events as colored dots with selection support.
 */

import { useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { type GameEvent } from '../../api/refquestVideoApi';

interface CourtMapPanelProps {
  events: GameEvent[];
  activeEventId?: string;
  onEventClick?: (eventId: string, timestamp: number) => void;
  showLabels?: boolean;
}

// Court dimensions (NBA: 94ft x 50ft, using proportional units)
const COURT_WIDTH = 94;
const COURT_HEIGHT = 50;
const VIEW_PADDING = 2;

// Event type to color mapping
const EVENT_COLORS: Record<string, string> = {
  foul: '#ef4444', // red
  violation: '#f97316', // orange
  timeout: '#3b82f6', // blue
  substitution: '#22c55e', // green
  jump_ball: '#a855f7', // purple
  out_of_bounds: '#eab308', // yellow
  default: '#64748b', // slate
};

export function CourtMapPanel({
  events,
  activeEventId,
  onEventClick,
  showLabels = false,
}: CourtMapPanelProps) {
  // Filter events with coordinates
  const eventsWithCoords = useMemo(() => {
    return events.filter((e) => e.x !== undefined && e.y !== undefined);
  }, [events]);

  // Calculate viewBox
  const viewBox = `${-VIEW_PADDING} ${-VIEW_PADDING} ${COURT_WIDTH + VIEW_PADDING * 2} ${COURT_HEIGHT + VIEW_PADDING * 2}`;

  if (eventsWithCoords.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-slate-500">
        <MapPin className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-sm">No court locations available</p>
        <p className="text-xs text-slate-600 mt-1">
          Events with coordinates will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700">
        <h3 className="text-sm font-medium text-slate-300">
          Court Map ({eventsWithCoords.length} events)
        </h3>
      </div>

      {/* Court SVG */}
      <div className="flex-1 p-4 flex items-center justify-center">
        <svg
          viewBox={viewBox}
          className="w-full h-full max-h-[300px]"
          style={{ aspectRatio: `${COURT_WIDTH}/${COURT_HEIGHT}` }}
        >
          {/* Court Background */}
          <rect
            x={0}
            y={0}
            width={COURT_WIDTH}
            height={COURT_HEIGHT}
            fill="#1e293b"
            stroke="#475569"
            strokeWidth={0.5}
            rx={1}
          />

          {/* Center Circle */}
          <circle
            cx={COURT_WIDTH / 2}
            cy={COURT_HEIGHT / 2}
            r={6}
            fill="none"
            stroke="#475569"
            strokeWidth={0.3}
          />

          {/* Center Line */}
          <line
            x1={COURT_WIDTH / 2}
            y1={0}
            x2={COURT_WIDTH / 2}
            y2={COURT_HEIGHT}
            stroke="#475569"
            strokeWidth={0.3}
          />

          {/* Left Three-Point Line (simplified arc) */}
          <path
            d={`M 0,3 L 14,3 A 23.75,23.75 0 0 1 14,47 L 0,47`}
            fill="none"
            stroke="#475569"
            strokeWidth={0.3}
          />

          {/* Right Three-Point Line (simplified arc) */}
          <path
            d={`M 94,3 L 80,3 A 23.75,23.75 0 0 0 80,47 L 94,47`}
            fill="none"
            stroke="#475569"
            strokeWidth={0.3}
          />

          {/* Left Key/Paint */}
          <rect
            x={0}
            y={17}
            width={19}
            height={16}
            fill="none"
            stroke="#475569"
            strokeWidth={0.3}
          />

          {/* Right Key/Paint */}
          <rect
            x={75}
            y={17}
            width={19}
            height={16}
            fill="none"
            stroke="#475569"
            strokeWidth={0.3}
          />

          {/* Left Basket */}
          <circle
            cx={5.25}
            cy={25}
            r={0.75}
            fill="none"
            stroke="#f97316"
            strokeWidth={0.3}
          />
          <rect
            x={4}
            y={22}
            width={0.5}
            height={6}
            fill="#f97316"
          />

          {/* Right Basket */}
          <circle
            cx={88.75}
            cy={25}
            r={0.75}
            fill="none"
            stroke="#f97316"
            strokeWidth={0.3}
          />
          <rect
            x={89.5}
            y={22}
            width={0.5}
            height={6}
            fill="#f97316"
          />

          {/* Event Markers */}
          {eventsWithCoords.map((event) => {
            const isActive = event.id === activeEventId;
            const color = EVENT_COLORS[event.eventType] || EVENT_COLORS.default;
            const x = event.x!;
            const y = event.y!;

            return (
              <g
                key={event.id}
                onClick={() => onEventClick?.(event.id, event.gameTimeSeconds)}
                style={{ cursor: onEventClick ? 'pointer' : 'default' }}
              >
                {/* Outer ring for active event */}
                {isActive && (
                  <circle
                    cx={x}
                    cy={y}
                    r={3}
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth={0.5}
                    className="animate-pulse"
                  />
                )}

                {/* Event dot */}
                <circle
                  cx={x}
                  cy={y}
                  r={isActive ? 2 : 1.5}
                  fill={color}
                  stroke={isActive ? '#22d3ee' : '#0f172a'}
                  strokeWidth={0.3}
                  opacity={isActive ? 1 : 0.8}
                />

                {/* Label on hover/active */}
                {(showLabels || isActive) && (
                  <text
                    x={x}
                    y={y - 3}
                    textAnchor="middle"
                    fontSize={2}
                    fill="#e2e8f0"
                    className="pointer-events-none"
                  >
                    {event.eventType.replace(/_/g, ' ')}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-slate-700">
        <div className="flex flex-wrap gap-3 justify-center">
          {Object.entries(EVENT_COLORS)
            .filter(([key]) => key !== 'default')
            .map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[10px] text-slate-400 capitalize">
                  {type.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
