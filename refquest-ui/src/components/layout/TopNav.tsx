/**
 * Phase 5A: Top Navigation Bar Component
 *
 * Displays current game info and user controls
 */
import { Bell, Search, User } from 'lucide-react';
import { useGameStore } from '../../state/gameStore';
import { useGame } from '../../api/hooks';

export function TopNav() {
  const { currentGameId } = useGameStore();
  const { data: game } = useGame(currentGameId || '');

  return (
    <div className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200">
      {/* Left: Current Game Info */}
      <div className="flex items-center space-x-4">
        {game ? (
          <>
            <div className="text-sm">
              <p className="font-medium text-gray-900">
                {game.metadata?.teams?.join(' vs ') || 'Game'}
              </p>
              <p className="text-gray-500">
                {game.metadata?.date || 'No date'} • {game.metadata?.venue || 'No venue'}
              </p>
            </div>
            <span
              className={`px-2 py-1 text-xs font-medium rounded ${
                game.processing_status === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : game.processing_status === 'failed'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {game.processing_status}
            </span>
          </>
        ) : (
          <p className="text-sm text-gray-500">No game selected</p>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center space-x-4">
        {/* Search */}
        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
          <Search className="w-5 h-5" />
        </button>

        {/* Notifications */}
        <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* User Profile */}
        <button className="flex items-center p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <User className="w-5 h-5 mr-2" />
          <span className="text-sm font-medium">Admin</span>
        </button>
      </div>
    </div>
  );
}
