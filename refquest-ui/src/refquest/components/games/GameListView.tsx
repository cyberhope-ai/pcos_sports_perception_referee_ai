/**
 * Phase 12.0: Game List View
 *
 * Home page showing all games and sessions
 */

import { useNavigate } from 'react-router-dom';
import { Play, Clock, CheckCircle, AlertCircle, Video, Calendar, MapPin } from 'lucide-react';
import { mockGames } from '../../mock/data';

const statusConfig = {
  completed: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
  processing_skilldna: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  processing_video: { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  uploaded: { icon: Clock, color: 'text-slate-400', bg: 'bg-slate-500/10' },
  failed: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  generating_clips: { icon: Clock, color: 'text-purple-400', bg: 'bg-purple-500/10' },
};

export function GameListView() {
  const navigate = useNavigate();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Games & Sessions</h1>
        <p className="text-slate-400 mt-1">Select a game to review or analyze</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Games" value={mockGames.length} icon={<Video className="w-5 h-5" />} color="cyan" />
        <StatCard label="Completed" value={mockGames.filter(g => g.processing_status === 'completed').length} icon={<CheckCircle className="w-5 h-5" />} color="green" />
        <StatCard label="Processing" value={mockGames.filter(g => g.processing_status.includes('processing')).length} icon={<Clock className="w-5 h-5" />} color="yellow" />
        <StatCard label="This Week" value={2} icon={<Calendar className="w-5 h-5" />} color="purple" />
      </div>

      {/* Game Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockGames.map((game) => {
          const status = statusConfig[game.processing_status] || statusConfig.uploaded;
          const StatusIcon = status.icon;

          return (
            <div
              key={game.id}
              className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-cyan-500/50 transition-all cursor-pointer group"
              onClick={() => navigate(`/refquest/game/${game.id}/review`)}
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-slate-800 rounded-lg mb-3 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Video className="w-12 h-12 text-slate-600" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-cyan-500/80 flex items-center justify-center">
                    <Play className="w-6 h-6 text-white" />
                  </div>
                </div>
                {/* Status Badge */}
                <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs flex items-center gap-1 ${status.bg} ${status.color}`}>
                  <StatusIcon className="w-3 h-3" />
                  <span className="capitalize">{game.processing_status.replace('_', ' ')}</span>
                </div>
              </div>

              {/* Game Info */}
              <div className="space-y-2">
                <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors">
                  {game.metadata?.teams?.join(' vs ') || 'Unknown Game'}
                </h3>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {game.metadata?.date || 'Unknown date'}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {game.metadata?.venue || 'Unknown venue'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">{game.metadata?.league}</span>
                  <span className="text-slate-500">{formatDuration(game.duration)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  const colorClasses = {
    cyan: 'text-cyan-400 bg-cyan-500/10',
    green: 'text-green-400 bg-green-500/10',
    yellow: 'text-yellow-400 bg-yellow-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
  };
  const classes = colorClasses[color as keyof typeof colorClasses] || colorClasses.cyan;

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${classes}`}>
          {icon}
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
