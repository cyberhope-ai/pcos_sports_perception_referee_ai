/**
 * Phase 5B: Game Dashboard Page
 *
 * Main dashboard with timeline view and clip player
 * Integrates Timeline + ClipPlayer components
 */
import { useParams } from 'react-router-dom';
import { useGame } from '../api/hooks';
import { useGameStore } from '../state/gameStore';
import { useEffect } from 'react';
import { TimelineView } from '../components/timeline/TimelineView';
import { ClipPlayer } from '../components/clips/ClipPlayer';

export function GameDashboard() {
  const { gameId } = useParams<{ gameId: string }>();
  const { isLoading, error } = useGame(gameId || '');
  const { setCurrentGame } = useGameStore();

  useEffect(() => {
    if (gameId) {
      setCurrentGame(gameId);
    }
  }, [gameId, setCurrentGame]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading game...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-600 font-medium">Error loading game</p>
          <p className="text-gray-500 text-sm mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!gameId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-600">No game ID provided</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full lg:flex-row">
      {/* Timeline View - Left side (60%) */}
      <div className="w-full lg:w-3/5 h-1/2 lg:h-full border-b lg:border-b-0 lg:border-r border-gray-200">
        <TimelineView gameId={gameId} />
      </div>

      {/* Clip Player - Right side (40%) */}
      <div className="w-full lg:w-2/5 h-1/2 lg:h-full">
        <ClipPlayer />
      </div>
    </div>
  );
}
