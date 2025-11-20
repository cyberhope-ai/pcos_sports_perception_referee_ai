/**
 * Phase 5A: Event Detail Page (Placeholder)
 *
 * Detailed view of a single event with QSurfaces
 * Full implementation in Phase 5C
 */
import { useParams } from 'react-router-dom';
import { useEvent } from '../api/hooks';
import { formatEventType } from '../utils/formatters';

export function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const { data: event, isLoading, error } = useEvent(eventId || '');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-600 font-medium">Error loading event</p>
          <p className="text-gray-500 text-sm mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Event Detail</h1>

        {/* Placeholder for Phase 5C */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Event: {eventId}</h2>
          <p className="text-gray-600 mb-4">
            Full event inspector with 4 QSurface views will be implemented in Phase 5C.
          </p>

          {event && (
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">Type:</span> {formatEventType(event.event_type)}
              </p>
              <p className="text-sm">
                <span className="font-medium">Timestamp:</span> {event.timestamp}s
              </p>
              <p className="text-sm">
                <span className="font-medium">Frame:</span> {event.frame_number}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
