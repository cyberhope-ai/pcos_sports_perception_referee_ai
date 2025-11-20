/**
 * Phase 5C: Event Detail Page
 *
 * Detailed event analysis page featuring:
 * - Clip playback for the selected event
 * - Multi-persona QSurface views with tab switching
 * - Event metadata and timeline context
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useEvent, useEventClip, useEventQSurfaces } from '../api/hooks';
import { ClipPlayer } from '../components/clips/ClipPlayer';
import { RefereeView } from '../components/qsurfaces/RefereeView';
import { CoachView } from '../components/qsurfaces/CoachView';
import { PlayerView } from '../components/qsurfaces/PlayerView';
import { LeagueView } from '../components/qsurfaces/LeagueView';
import { PlayCircle, AlertCircle } from 'lucide-react';
import { cn } from '../utils/cn';
import { formatEventType } from '../utils/formatters';

type PersonaTab = 'referee' | 'coach' | 'player' | 'league';

export function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const [selectedPersona, setSelectedPersona] = useState<PersonaTab>('referee');

  // Fetch event, clip, and QSurface data
  const { data: event, isLoading: eventLoading, error: eventError } = useEvent(eventId || '');
  const { data: clip, isLoading: clipLoading } = useEventClip(eventId || '');
  const { data: qsurfaces, isLoading: qsurfacesLoading, error: qsurfacesError } = useEventQSurfaces(eventId || '');

  // Render loading state
  if (eventLoading || clipLoading || qsurfacesLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event details...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (eventError || qsurfacesError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Event</h2>
          <p className="text-gray-600">{eventError?.message || qsurfacesError?.message || 'Failed to load event details'}</p>
        </div>
      </div>
    );
  }

  // Render no event state
  if (!event) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <PlayCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h2>
          <p className="text-gray-600">The requested event could not be found.</p>
        </div>
      </div>
    );
  }

  // Find appropriate QSurface for selected persona
  const getQSurfaceForPersona = (persona: PersonaTab) => {
    if (!qsurfaces || qsurfaces.length === 0) return null;

    // Try to find a QSurface that matches the persona type
    const matchingQSurface = qsurfaces.find((qs) => {
      const surfaceType = qs.surface_type?.toLowerCase();
      return surfaceType?.includes(persona);
    });

    // Fallback to first QSurface if no match found
    return matchingQSurface || qsurfaces[0];
  };

  const currentQSurface = getQSurfaceForPersona(selectedPersona);

  // Persona tab configuration
  const personaTabs = [
    { key: 'referee' as PersonaTab, label: 'Referee', icon: '👨‍⚖️', color: 'border-amber-500 text-amber-700' },
    { key: 'coach' as PersonaTab, label: 'Coach', icon: '👨‍🏫', color: 'border-blue-500 text-blue-700' },
    { key: 'player' as PersonaTab, label: 'Player', icon: '🏀', color: 'border-green-500 text-green-700' },
    { key: 'league' as PersonaTab, label: 'League', icon: '🏆', color: 'border-purple-500 text-purple-700' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Event Analysis</h1>
          <p className="mt-2 text-gray-600">
            Detailed multi-perspective analysis for event {eventId?.substring(0, 8)}...
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Clip Player (1/3 width on large screens) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden sticky top-8">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <PlayCircle className="w-5 h-5" />
                  Event Clip
                </h2>
              </div>
              <div className="aspect-video bg-black">
                {clip ? (
                  <ClipPlayer />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      <PlayCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No clip available</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Event Metadata */}
              <div className="p-4 bg-gray-50 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Event Details</h3>
                <dl className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Event ID:</dt>
                    <dd className="font-mono text-gray-900">{eventId?.substring(0, 12)}...</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Type:</dt>
                    <dd className="font-semibold text-gray-900">{formatEventType(event.event_type)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Timestamp:</dt>
                    <dd className="text-gray-900">{event.timestamp?.toFixed(2)}s</dd>
                  </div>
                  {event.frame_number && (
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Frame:</dt>
                      <dd className="text-gray-900">{event.frame_number}</dd>
                    </div>
                  )}
                  {event.confidence && (
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Confidence:</dt>
                      <dd className="font-semibold text-gray-900">{(event.confidence * 100).toFixed(0)}%</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>

          {/* Right Column: QSurface Views (2/3 width on large screens) */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Persona Tabs */}
              <div className="border-b border-gray-200 bg-gray-50">
                <nav className="flex space-x-4 px-6 py-3" aria-label="Persona Views">
                  {personaTabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setSelectedPersona(tab.key)}
                      className={cn(
                        'px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all flex items-center gap-2',
                        selectedPersona === tab.key
                          ? `${tab.color} bg-white shadow-sm`
                          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      )}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* QSurface View Content */}
              <div className="p-6">
                {!currentQSurface ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No QSurface Data</h3>
                    <p className="text-sm text-gray-600">
                      No QSurface analysis available for this event yet.
                    </p>
                  </div>
                ) : (
                  <>
                    {selectedPersona === 'referee' && <RefereeView qsurface={currentQSurface} />}
                    {selectedPersona === 'coach' && <CoachView qsurface={currentQSurface} />}
                    {selectedPersona === 'player' && <PlayerView qsurface={currentQSurface} />}
                    {selectedPersona === 'league' && <LeagueView qsurface={currentQSurface} />}
                  </>
                )}
              </div>
            </div>

            {/* QSurface Summary Stats */}
            {qsurfaces && qsurfaces.length > 0 && (
              <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Analysis Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{qsurfaces.length}</div>
                    <div className="text-xs text-gray-600 mt-1">QSurface{qsurfaces.length !== 1 ? 's' : ''} Generated</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {selectedPersona.charAt(0).toUpperCase() + selectedPersona.slice(1)}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Active Perspective</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {currentQSurface?.scores ? Object.keys(currentQSurface.scores).length : 0}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Metrics Tracked</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
