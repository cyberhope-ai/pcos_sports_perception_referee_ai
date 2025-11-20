/**
 * Phase 5B: Timeline Marker Component
 *
 * Renders individual event markers on the timeline with:
 * - Color coding by foul type
 * - Hover tooltips
 * - Click interaction for clip selection
 */
import { type TimelineEventMarker } from '../../types';
import { formatTimestamp } from '../../utils/formatters';
import { getFoulTypeStyle, getEventTypeColor, getEventTypeLabel } from '../../utils/foul-styling';
import { cn } from '../../utils/cn';
import { AlertCircle, Video } from 'lucide-react';

interface TimelineMarkerProps {
  marker: TimelineEventMarker;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: () => void;
  onLeave: () => void;
}

export function TimelineMarker({
  marker,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  onLeave,
}: TimelineMarkerProps) {
  const foulType = marker.metadata?.foul_type as string | undefined;
  const foulStyle = getFoulTypeStyle(foulType);
  const eventColor = getEventTypeColor(marker.event_type);

  return (
    <div className="relative group">
      {/* Marker dot */}
      <button
        onClick={onSelect}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        className={cn(
          'w-4 h-4 rounded-full border-2 transition-all duration-200',
          'hover:scale-125 focus:outline-none focus:ring-2 focus:ring-primary-500',
          isSelected && 'scale-125 ring-2 ring-primary-500',
          !foulType && eventColor,
          foulType && foulStyle.borderColor,
          foulType ? 'bg-white' : ''
        )}
        aria-label={`Event at ${formatTimestamp(marker.timestamp)}`}
      >
        {foulType && (
          <div className={cn('w-full h-full rounded-full', foulStyle.bgColor)} />
        )}
      </button>

      {/* Clip indicator */}
      {marker.has_clip && (
        <div className="absolute -top-1 -right-1">
          <Video className="w-3 h-3 text-blue-600" />
        </div>
      )}

      {/* Tooltip on hover */}
      {(isHovered || isSelected) && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-10">
          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-3 h-3" />
              <span className="font-semibold">{getEventTypeLabel(marker.event_type)}</span>
            </div>

            {foulType && (
              <div className="text-gray-300 mb-1">
                Foul: {foulStyle.label}
              </div>
            )}

            <div className="text-gray-400">
              {formatTimestamp(marker.timestamp)}
            </div>

            {marker.confidence !== undefined && (
              <div className="text-gray-400">
                Confidence: {(marker.confidence * 100).toFixed(0)}%
              </div>
            )}

            {marker.has_clip && (
              <div className="text-blue-400 flex items-center gap-1 mt-1">
                <Video className="w-3 h-3" />
                <span>Clip available</span>
              </div>
            )}

            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
              <div className="border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
