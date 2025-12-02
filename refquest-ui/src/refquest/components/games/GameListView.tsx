/**
 * Phase 12.0 + 12.9 + 13.5: Game List View
 *
 * Home page showing all games and sessions with filters and search
 * Phase 13.5: Now fetches REAL data from backend API instead of mock data
 */

import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Clock, CheckCircle, AlertCircle, Video, Calendar, MapPin, Search, Filter, X, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { emitPcosEvent, PCOS_EVENT_TYPES, HUMAN_ACTOR } from '../../pcos/pcosEventBus';

// API configuration
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8088/api/v1';

// Game type from backend (API returns 'status', we normalize to 'processing_status')
interface GameFromAPI {
  id: string;
  sport: string;
  status: string;  // API uses 'status' not 'processing_status'
  video_path?: string;
  duration?: number;
  metadata?: {
    teams?: string[];
    date?: string;
    venue?: string;
    league?: string;
  };
}

interface Game {
  id: string;
  sport: string;
  processing_status: string;
  video_path?: string;
  duration?: number;
  metadata?: {
    teams?: string[];
    date?: string;
    venue?: string;
    league?: string;
  };
}

const statusConfig = {
  completed: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Completed' },
  processing_skilldna: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Processing SkillDNA' },
  processing_video: { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Processing Video' },
  uploaded: { icon: Clock, color: 'text-slate-400', bg: 'bg-slate-500/10', label: 'Uploaded' },
  failed: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Failed' },
  generating_clips: { icon: Clock, color: 'text-purple-400', bg: 'bg-purple-500/10', label: 'Generating Clips' },
};

type StatusFilter = 'all' | 'completed' | 'processing' | 'failed';

// Fetch games from backend API and normalize field names
async function fetchGames(): Promise<Game[]> {
  const response = await fetch(`${API_BASE}/games`);
  if (!response.ok) {
    throw new Error(`Failed to fetch games: ${response.status}`);
  }
  const data = await response.json();

  // Normalize API response: 'status' -> 'processing_status'
  const gamesFromAPI: GameFromAPI[] = data.games || [];
  return gamesFromAPI.map((g): Game => ({
    id: g.id,
    sport: g.sport,
    processing_status: g.status,  // Map 'status' to 'processing_status'
    video_path: g.video_path,
    duration: g.duration,
    metadata: g.metadata,
  }));
}

export function GameListView() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sportFilter, setSportFilter] = useState<string | null>(null);

  // Real data state (Phase 13.5)
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Fetch games from backend on mount and refresh
  useEffect(() => {
    let isMounted = true;

    async function loadGames() {
      setIsLoading(true);
      setError(null);

      try {
        const fetchedGames = await fetchGames();
        if (isMounted) {
          setGames(fetchedGames);
          setLastRefresh(new Date());
          console.log('[GameListView] Loaded', fetchedGames.length, 'games from backend');
        }
      } catch (err) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : 'Failed to fetch games';
          setError(message);
          console.error('[GameListView] Error loading games:', err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadGames();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadGames, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedGames = await fetchGames();
      setGames(fetchedGames);
      setLastRefresh(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch games';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Get unique sports from games
  const sports = useMemo(() => {
    const sportSet = new Set(games.map(g => g.metadata?.league || g.sport || 'Unknown').filter(Boolean));
    return Array.from(sportSet);
  }, [games]);

  // Filter games
  const filteredGames = useMemo(() => {
    let result = [...games];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(g => {
        const teams = g.metadata?.teams?.join(' ').toLowerCase() || '';
        const venue = g.metadata?.venue?.toLowerCase() || '';
        const league = g.metadata?.league?.toLowerCase() || '';
        return teams.includes(query) || venue.includes(query) || league.includes(query);
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(g => {
        const status = g.processing_status as string;
        if (statusFilter === 'completed') return status === 'completed';
        if (statusFilter === 'processing') return status.includes('processing') || status === 'generating_clips';
        if (statusFilter === 'failed') return status === 'failed';
        return true;
      });
    }

    // Sport/league filter
    if (sportFilter) {
      result = result.filter(g => g.metadata?.league === sportFilter);
    }

    return result;
  }, [searchQuery, statusFilter, sportFilter]);

  // Handle filter changes with PCOS event
  const handleFilterChange = (filterType: string, value: string) => {
    emitPcosEvent(
      PCOS_EVENT_TYPES.NAV.FILTER_APPLIED,
      { filterType, value, resultCount: filteredGames.length },
      HUMAN_ACTOR
    );
  };

  const handleStatusFilter = (status: StatusFilter) => {
    setStatusFilter(status);
    handleFilterChange('status', status);
  };

  const handleSportFilter = (sport: string | null) => {
    setSportFilter(sport);
    handleFilterChange('sport', sport || 'all');
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSportFilter(null);
    handleFilterChange('clear', 'all');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || sportFilter;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Games & Sessions</h1>
        <p className="text-slate-400 mt-1">Select a game to review or analyze</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by team, venue, or league..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleFilterChange('search', e.target.value);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <div className="flex gap-1">
              {(['all', 'completed', 'processing', 'failed'] as StatusFilter[]).map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusFilter(status)}
                  className={`px-3 py-1.5 text-sm rounded-lg capitalize transition-colors ${
                    statusFilter === status
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Sport Filter */}
          <select
            value={sportFilter || ''}
            onChange={(e) => handleSportFilter(e.target.value || null)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Leagues</option>
            {sports.map((sport) => (
              <option key={sport} value={sport}>{sport}</option>
            ))}
          </select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        {/* Active filters summary */}
        {hasActiveFilters && (
          <div className="mt-3 text-sm text-slate-400">
            Showing {filteredGames.length} of {games.length} games
          </div>
        )}

        {/* Refresh button and status */}
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-1 px-2 py-1 rounded text-cyan-400 hover:bg-cyan-500/10 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
          </div>
          <span className="text-green-400">LIVE DATA</span>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-red-400 font-medium">Failed to load games</p>
            <p className="text-red-300/70 text-sm">{error}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="ml-auto px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Games" value={games.length} icon={<Video className="w-5 h-5" />} color="cyan" />
        <StatCard label="Completed" value={games.filter(g => g.processing_status === 'completed').length} icon={<CheckCircle className="w-5 h-5" />} color="green" />
        <StatCard label="Failed" value={games.filter(g => g.processing_status === 'failed').length} icon={<AlertCircle className="w-5 h-5" />} color="red" />
        <StatCard label="Processing" value={games.filter(g => g.processing_status?.includes('processing')).length} icon={<Clock className="w-5 h-5" />} color="yellow" />
      </div>

      {/* Game Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && games.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-500">
            <Loader2 className="w-12 h-12 mb-3 animate-spin text-cyan-400" />
            <p className="text-cyan-400">Loading games from backend...</p>
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-500">
            <Video className="w-12 h-12 mb-3 opacity-50" />
            <p>{games.length === 0 ? 'No games in database yet' : 'No games match your filters'}</p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-2 text-cyan-400 hover:text-cyan-300 text-sm"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : filteredGames.map((game) => {
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
                  {game.metadata?.teams?.join(' vs ') || `Game ${game.id.slice(0, 8)}`}
                </h3>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Video className="w-3 h-3" />
                    {game.sport || 'basketball'}
                  </span>
                  {game.video_path && (
                    <span className="flex items-center gap-1 truncate max-w-[120px]" title={game.video_path}>
                      <MapPin className="w-3 h-3" />
                      {game.video_path.split('/').pop() || 'video'}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-mono">{game.id.slice(0, 8)}...</span>
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
    red: 'text-red-400 bg-red-500/10',
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
