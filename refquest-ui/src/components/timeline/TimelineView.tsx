/**
 * Phase 5B: Timeline View Component
 *
 * Main timeline visualization with:
 * - Event markers along timeline
 * - Filtering by event type and foul type
 * - Click to select events and play clips
 */
import { useMemo } from 'react';
import { useGameTimeline } from '../../api/hooks';
import { useTimelineStore } from '../../state/timelineStore';
import { TimelineMarker } from './TimelineMarker';
import { type TimelineEventMarker } from '../../types';
import { Filter, X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface TimelineViewProps {
  gameId: string;
}

export function TimelineView({ gameId }: TimelineViewProps) {
  const { data: timeline, isLoading, error } = useGameTimeline(gameId);
  const {
    selectedEventId,
    hoveredEventId,
    filters,
    setSelectedEvent,
    setHoveredEvent,
    setFilters,
    clearFilters,
  } = useTimelineStore();

  // Filter markers
  const filteredMarkers = useMemo(() => {
    if (!timeline?.timeline_markers) return [];

    return timeline.timeline_markers.filter((marker) => {
      // Only filter event markers, not clip markers
      if (marker.type !== 'event') return false;

      const eventMarker = marker as TimelineEventMarker;

      // Filter by event type
      if (filters.event_types && filters.event_types.length > 0) {
        if (!filters.event_types.includes(eventMarker.event_type as any)) {
          return false;
        }
      }

      // Filter by foul type
      if (filters.foul_types && filters.foul_types.length > 0) {
        const foulType = eventMarker.metadata?.foul_type;
        if (!foulType || !filters.foul_types.includes(foulType)) {
          return false;
        }
      }

      // Filter by time range
      if (filters.time_range) {
        const [min, max] = filters.time_range;
        if (eventMarker.timestamp < min || eventMarker.timestamp > max) {
          return false;
        }
      }

      // Filter by confidence
      if (filters.min_confidence !== undefined && eventMarker.confidence !== undefined) {
        if (eventMarker.confidence < filters.min_confidence) {
          return false;
        }
      }

      return true;
    }) as TimelineEventMarker[];
  }, [timeline, filters]);

  // Get unique event and foul types for filter options
  const availableEventTypes = useMemo(() => {
    if (!timeline?.timeline_markers) return [];
    const types = new Set<string>();
    timeline.timeline_markers.forEach((m) => {
      if (m.type === 'event') {
        types.add((m as TimelineEventMarker).event_type);
      }
    });
    return Array.from(types);
  }, [timeline]);

  const availableFoulTypes = useMemo(() => {
    if (!timeline?.timeline_markers) return [];
    const types = new Set<string>();
    timeline.timeline_markers.forEach((m) => {
      if (m.type === 'event') {
        const foulType = (m as TimelineEventMarker).metadata?.foul_type;
        if (foulType) types.add(foulType);
      }
    });
    return Array.from(types);
  }, [timeline]);

  const handleMarkerClick = (marker: TimelineEventMarker) => {
    // Find associated clip if exists
    const clipId = timeline?.timeline_markers.find(
      (m) => m.type === 'clip' && m.event_anchor_id === marker.id
    )?.id;

    setSelectedEvent(marker.id, clipId);
  };

  const toggleEventTypeFilter = (eventType: string) => {
    const current = filters.event_types || [];
    const updated = current.includes(eventType as any)
      ? current.filter((t) => t !== eventType as any)
      : [...current, eventType as any];
    setFilters({ event_types: updated.length > 0 ? (updated as any) : undefined });
  };

  const toggleFoulTypeFilter = (foulType: string) => {
    const current = filters.foul_types || [];
    const updated = current.includes(foulType)
      ? current.filter((t) => t !== foulType)
      : [...current, foulType];
    setFilters({ foul_types: updated.length > 0 ? updated : undefined });
  };

  const hasActiveFilters =
    (filters.event_types && filters.event_types.length > 0) ||
    (filters.foul_types && filters.foul_types.length > 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-600">Error loading timeline</div>
      </div>
    );
  }

  if (!timeline) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">No timeline data available</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header with filters */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Game Timeline
          </h2>
          <div className="text-sm text-gray-600">
            {filteredMarkers.length} events
            {hasActiveFilters && ` (filtered)`}
          </div>
        </div>

        {/* Filter Controls */}
        <div className="space-y-3">
          {/* Event Type Filter */}
          {availableEventTypes.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-700 mb-2">Event Types</div>
              <div className="flex flex-wrap gap-2">
                {availableEventTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => toggleEventTypeFilter(type)}
                    className={cn(
                      'px-3 py-1 text-xs rounded-full border transition-colors',
                      filters.event_types?.includes(type as any)
                        ? 'bg-primary-100 border-primary-500 text-primary-700'
                        : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Foul Type Filter */}
          {availableFoulTypes.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-700 mb-2">Foul Types</div>
              <div className="flex flex-wrap gap-2">
                {availableFoulTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => toggleFoulTypeFilter(type)}
                    className={cn(
                      'px-3 py-1 text-xs rounded-full border transition-colors',
                      filters.foul_types?.includes(type)
                        ? 'bg-primary-100 border-primary-500 text-primary-700'
                        : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
            >
              <X className="w-3 h-3" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Timeline visualization */}
      <div className="flex-1 overflow-x-auto p-6">
        {filteredMarkers.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            No events match the current filters
          </div>
        ) : (
          <div className="relative">
            {/* Timeline axis */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-300"></div>

            {/* Markers */}
            <div className="relative flex items-center justify-between min-w-max">
              {filteredMarkers.map((marker) => (
                <div
                  key={marker.id}
                  className="flex-shrink-0 px-4"
                  style={{
                    // Position markers proportionally along timeline
                    flex: marker.timestamp,
                  }}
                >
                  <TimelineMarker
                    marker={marker}
                    isSelected={selectedEventId === marker.id}
                    isHovered={hoveredEventId === marker.id}
                    onSelect={() => handleMarkerClick(marker)}
                    onHover={() => setHoveredEvent(marker.id)}
                    onLeave={() => setHoveredEvent(null)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <div className="font-semibold text-gray-900">{timeline.total_events || 0}</div>
            <div className="text-gray-600 text-xs">Total Events</div>
          </div>
          <div>
            <div className="font-semibold text-gray-900">{timeline.total_clips || 0}</div>
            <div className="text-gray-600 text-xs">Clips Generated</div>
          </div>
          <div>
            <div className="font-semibold text-gray-900">{filteredMarkers.length}</div>
            <div className="text-gray-600 text-xs">Showing</div>
          </div>
        </div>
      </div>
    </div>
  );
}
