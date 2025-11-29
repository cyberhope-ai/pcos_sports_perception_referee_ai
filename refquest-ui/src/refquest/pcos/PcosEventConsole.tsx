/**
 * Phase 12.5: PCOS Event Console
 *
 * Development panel for viewing PCOS event stream in real-time.
 * Toggle with keyboard shortcut. Shows recent events with filtering.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Terminal,
  X,
  Trash2,
  Filter,
  ChevronDown,
  ChevronUp,
  Activity,
  User,
  Bot,
  Settings2,
  Copy,
  Check,
} from 'lucide-react';
import {
  subscribeToEvents,
  getRecentEvents,
  clearEventHistory,
  ENABLE_PCOS_EVENT_LOG,
  type PcosEvent,
} from './pcosEventBus';

interface PcosEventConsoleProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PcosEventConsole({ isOpen, onClose }: PcosEventConsoleProps) {
  const [events, setEvents] = useState<PcosEvent[]>([]);
  const [filter, setFilter] = useState('');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [isPaused, setIsPaused] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load initial events and subscribe to new ones
  useEffect(() => {
    if (!isOpen) return;

    // Load existing events
    setEvents(getRecentEvents(50));

    // Subscribe to new events
    const unsubscribe = subscribeToEvents((event) => {
      if (!isPaused) {
        setEvents((prev) => [event, ...prev].slice(0, 100));
      }
    });

    return unsubscribe;
  }, [isOpen, isPaused]);

  const handleClear = () => {
    clearEventHistory();
    setEvents([]);
  };

  const toggleExpand = (eventId: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const handleCopy = useCallback(async (event: PcosEvent) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(event, null, 2));
      setCopiedId(event.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  // Filter events
  const filteredEvents = filter
    ? events.filter(
        (e) =>
          e.type.toLowerCase().includes(filter.toLowerCase()) ||
          JSON.stringify(e.context).toLowerCase().includes(filter.toLowerCase())
      )
    : events;

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-80 bg-slate-900 border-t border-cyan-500/30 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-cyan-400">
            <Terminal className="w-4 h-4" />
            <span className="font-semibold text-sm">PCOS Event Console</span>
          </div>
          {ENABLE_PCOS_EVENT_LOG && (
            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
              LIVE
            </span>
          )}
          <span className="text-xs text-slate-500">
            {filteredEvents.length} events
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Input */}
          <div className="relative">
            <Filter className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter events..."
              className="w-48 pl-7 pr-3 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* Pause/Resume */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`p-1.5 rounded transition-colors ${
              isPaused
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title={isPaused ? 'Resume' : 'Pause'}
          >
            <Activity className="w-4 h-4" />
          </button>

          {/* Clear */}
          <button
            onClick={handleClear}
            className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
            title="Clear events"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
            title="Close console"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Event List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs">
        {filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            <div className="text-center">
              <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No events yet</p>
              <p className="text-xs mt-1">Events will appear here as they occur</p>
            </div>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              isExpanded={expandedEvents.has(event.id)}
              onToggle={() => toggleExpand(event.id)}
              onCopy={() => handleCopy(event)}
              isCopied={copiedId === event.id}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-1.5 border-t border-slate-700 bg-slate-800/30 text-xs text-slate-500 flex items-center justify-between">
        <span>Phase 12.5 · PCOS Event Bus</span>
        <span>Press Ctrl+Shift+E to toggle</span>
      </div>
    </div>
  );
}

// Individual Event Row
interface EventRowProps {
  event: PcosEvent;
  isExpanded: boolean;
  onToggle: () => void;
  onCopy: () => void;
  isCopied: boolean;
}

function EventRow({ event, isExpanded, onToggle, onCopy, isCopied }: EventRowProps) {
  const getActorIcon = () => {
    if (!event.actor) return <Settings2 className="w-3 h-3 text-slate-500" />;
    switch (event.actor.type) {
      case 'HUMAN':
        return <User className="w-3 h-3 text-blue-400" />;
      case 'AI':
        return <Bot className="w-3 h-3 text-purple-400" />;
      case 'SYSTEM':
        return <Settings2 className="w-3 h-3 text-slate-400" />;
    }
  };

  const getTypeColor = (type: string): string => {
    if (type.startsWith('OFFICIATING')) return 'text-green-400';
    if (type.startsWith('AI')) return 'text-purple-400';
    if (type.startsWith('COMMITTEE')) return 'text-yellow-400';
    if (type.startsWith('SKILLDNA')) return 'text-cyan-400';
    if (type.startsWith('INGESTION')) return 'text-orange-400';
    if (type.startsWith('NAV')) return 'text-slate-400';
    return 'text-slate-300';
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="bg-slate-800/50 rounded border border-slate-700/50 hover:border-slate-600/50 transition-colors">
      {/* Main Row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left"
      >
        {/* Timestamp */}
        <span className="text-slate-500 w-16 flex-shrink-0">
          {formatTime(event.timestamp)}
        </span>

        {/* Actor Icon */}
        <span className="flex-shrink-0">{getActorIcon()}</span>

        {/* Event Type */}
        <span className={`flex-1 truncate ${getTypeColor(event.type)}`}>
          {event.type}
        </span>

        {/* Persona (if AI) */}
        {event.actor?.persona && (
          <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
            {event.actor.persona}
          </span>
        )}

        {/* Context Preview */}
        <span className="text-slate-500 truncate max-w-[200px]">
          {Object.keys(event.context).slice(0, 2).join(', ')}
        </span>

        {/* Expand Icon */}
        {isExpanded ? (
          <ChevronUp className="w-3 h-3 text-slate-500" />
        ) : (
          <ChevronDown className="w-3 h-3 text-slate-500" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 pb-2 border-t border-slate-700/50">
          <div className="flex items-center justify-between mt-2 mb-1">
            <span className="text-slate-500">Context:</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopy();
              }}
              className="p-1 text-slate-500 hover:text-cyan-400 transition-colors"
              title="Copy event JSON"
            >
              {isCopied ? (
                <Check className="w-3 h-3 text-green-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
          <pre className="bg-slate-900/50 rounded p-2 text-slate-300 overflow-x-auto">
            {JSON.stringify(event.context, null, 2)}
          </pre>
          <div className="mt-2 flex items-center gap-4 text-slate-500">
            <span>ID: {event.id}</span>
            <span>Source: {event.source}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Hook for keyboard shortcut to toggle console
export function usePcosConsoleShortcut(): [boolean, () => void] {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+E to toggle
      if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return [isOpen, toggle];
}
