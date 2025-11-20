/**
 * Phase 5A: Game Dashboard Page (Placeholder)
 *
 * Main dashboard for viewing game details, timeline, and clips
 * Full implementation in Phase 5B/5C
 */
import { useParams } from 'react-router-dom';
import { useGame } from '../api/hooks';
import { useGameStore } from '../state/gameStore';
import { useEffect } from 'react';

export function GameDashboard() {
  const { gameId } = useParams<{ gameId: string }>();
  const { data: game, isLoading, error } = useGame(gameId || '');
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

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Game Dashboard</h1>

        {/* Placeholder for Phase 5B/5C */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Game: {gameId}</h2>
          <p className="text-gray-600 mb-4">
            Full timeline view, clip player, and event inspector will be implemented in Phase 5B and 5C.
          </p>

          {game && (
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">Status:</span> {game.processing_status}
              </p>
              {game.duration && (
                <p className="text-sm">
                  <span className="font-medium">Duration:</span> {game.duration}s
                </p>
              )}
              {game.fps && (
                <p className="text-sm">
                  <span className="font-medium">FPS:</span> {game.fps}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
