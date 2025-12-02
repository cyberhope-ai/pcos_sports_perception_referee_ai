/**
 * Phase 12.9: Event List Panel
 *
 * Displays a sortable/filterable list of game events with inline editing.
 * Supports delete, re-label, and adding notes.
 */

import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Clock,
  Edit2,
  Filter,
  MapPin,
  MoreVertical,
  Search,
  StickyNote,
  Trash2,
  X,
} from 'lucide-react';
import { type GameEvent } from '../../api/refquestVideoApi';
import { formatTimeFull } from '../../state/useVideoPlayerStore';

interface EventListPanelProps {
  events: GameEvent[];
  activeEventId?: string;
  onEventSelect: (eventId: string, timestamp: number) => void;
  onEventDelete?: (eventId: string) => void;
  onEventUpdate?: (eventId: string, patch: Partial<GameEvent>) => void;
}

type SortField = 'time' | 'type' | 'severity';
type SortDirection = 'asc' | 'desc';

const EVENT_TYPE_COLORS: Record<string, string> = {
  foul: 'text-red-400',
  violation: 'text-orange-400',
  timeout: 'text-blue-400',
  substitution: 'text-green-400',
  jump_ball: 'text-purple-400',
  out_of_bounds: 'text-yellow-400',
  default: 'text-slate-400',
};

const SEVERITY_COLORS: Record<string, string> = {
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  low: 'bg-green-500/20 text-green-400 border-green-500/30',
};

export function EventListPanel({
  events,
  activeEventId,
  onEventSelect,
  onEventDelete,
  onEventUpdate,
}: EventListPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('time');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'description' | 'notes' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showMenu, setShowMenu] = useState<string | null>(null);

  // Get unique event types for filter
  const eventTypes = useMemo(() => {
    const types = new Set(events.map((e) => e.eventType));
    return Array.from(types).sort();
  }, [events]);

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    let result = [...events];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.eventType.toLowerCase().includes(query) ||
          e.description?.toLowerCase().includes(query) ||
          e.id.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (filterType) {
      result = result.filter((e) => e.eventType === filterType);
    }

    // Apply sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'time':
          comparison = a.gameTimeSeconds - b.gameTimeSeconds;
          break;
        case 'type':
          comparison = a.eventType.localeCompare(b.eventType);
          break;
        case 'severity':
          const severityOrder = { high: 3, medium: 2, low: 1 };
          const aSev = typeof a.severity === 'string' ? severityOrder[a.severity as keyof typeof severityOrder] || 0 : 0;
          const bSev = typeof b.severity === 'string' ? severityOrder[b.severity as keyof typeof severityOrder] || 0 : 0;
          comparison = aSev - bSev;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [events, searchQuery, filterType, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleStartEdit = (event: GameEvent, field: 'description' | 'notes') => {
    setEditingEventId(event.id);
    setEditingField(field);
    setEditValue(field === 'description' ? (event.description || '') : '');
    setShowMenu(null);
  };

  const handleSaveEdit = () => {
    if (editingEventId && editingField && onEventUpdate) {
      onEventUpdate(editingEventId, { [editingField]: editValue });
    }
    setEditingEventId(null);
    setEditingField(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingEventId(null);
    setEditingField(null);
    setEditValue('');
  };

  if (events.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-slate-500">
        <AlertTriangle className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-sm">No events available</p>
        <p className="text-xs text-slate-600 mt-1">
          Events will appear here after video analysis
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with Search and Filter */}
      <div className="px-4 py-3 border-b border-slate-700 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-300">
            Events ({filteredEvents.length})
          </h3>

          {/* Sort Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleSort('time')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                sortField === 'time'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Clock className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleSort('type')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                sortField === 'type'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Type
            </button>
            <button
              onClick={() => handleSort('severity')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                sortField === 'severity'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Sev
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3 h-3 text-slate-500" />
          <button
            onClick={() => setFilterType(null)}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              filterType === null
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
          {eventTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-2 py-0.5 text-xs rounded capitalize transition-colors ${
                filterType === type
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {type.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Event List */}
      <div className="flex-1 overflow-y-auto">
        {filteredEvents.map((event) => {
          const isActive = event.id === activeEventId;
          const isEditing = editingEventId === event.id;
          const typeColor = EVENT_TYPE_COLORS[event.eventType] || EVENT_TYPE_COLORS.default;
          const severityClass = typeof event.severity === 'string'
            ? SEVERITY_COLORS[event.severity] || ''
            : '';

          return (
            <div
              key={event.id}
              className={`relative border-b border-slate-800 transition-colors ${
                isActive ? 'bg-slate-800' : 'hover:bg-slate-800/50'
              }`}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500" />
              )}

              <div
                className="px-4 py-3 cursor-pointer"
                onClick={() => onEventSelect(event.id, event.gameTimeSeconds)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {/* Event Type and Time */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-medium capitalize ${typeColor}`}>
                        {event.eventType.replace(/_/g, ' ')}
                      </span>
                      {event.severity && (
                        <span
                          className={`px-1.5 py-0.5 text-[10px] rounded border ${severityClass}`}
                        >
                          {event.severity}
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {isEditing && editingField === 'description' ? (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-cyan-500"
                          autoFocus
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveEdit();
                          }}
                          className="p-1 text-green-400 hover:text-green-300"
                        >
                          ✓
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelEdit();
                          }}
                          className="p-1 text-red-400 hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 truncate">
                        {event.description || 'No description'}
                      </p>
                    )}

                    {/* Meta info */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeFull(event.gameTimeSeconds)}
                      </span>
                      {event.period && (
                        <span>Q{event.period}</span>
                      )}
                      {event.x !== undefined && event.y !== undefined && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          ({event.x.toFixed(0)}, {event.y.toFixed(0)})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Menu */}
                  {(onEventDelete || onEventUpdate) && (
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(showMenu === event.id ? null : event.id);
                        }}
                        className="p-1 text-slate-500 hover:text-white rounded hover:bg-slate-700"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {showMenu === event.id && (
                        <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-10 py-1 min-w-[120px]">
                          {onEventUpdate && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEdit(event, 'description');
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                Edit Label
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEdit(event, 'notes');
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
                              >
                                <StickyNote className="w-3.5 h-3.5" />
                                Add Note
                              </button>
                            </>
                          )}
                          {onEventDelete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEventDelete(event.id);
                                setShowMenu(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-700"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
