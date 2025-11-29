/**
 * Phase 12.0: Top Bar Game Context
 *
 * Shows current game context in review workspace
 */

import { ArrowLeft, Clock, Video, Users, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Game } from '../../../types';

interface TopBarGameContextProps {
  game: Game;
}

export function TopBarGameContext({ game }: TopBarGameContextProps) {
  const navigate = useNavigate();

  return (
    <div className="h-14 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between px-4">
      {/* Left: Back + Game Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/refquest')}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="font-semibold text-white">
            {game.metadata?.teams?.join(' vs ') || 'Game Review'}
          </h2>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {game.metadata?.date}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {game.metadata?.league}
            </span>
          </div>
        </div>
      </div>

      {/* Center: Status */}
      <div className="flex items-center gap-2">
        <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          {game.processing_status}
        </div>
      </div>

      {/* Right: Duration + Actions */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Clock className="w-4 h-4" />
          <span>{formatDuration(game.duration)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Video className="w-4 h-4" />
          <span>{game.fps} FPS</span>
        </div>
      </div>
    </div>
  );
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
