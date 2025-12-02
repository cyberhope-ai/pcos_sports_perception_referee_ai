/**
 * Phase 12.6 + Search: YouTube Ingestion Panel
 *
 * YouTube video search with thumbnails, URL input, metadata preview, and ingestion trigger
 */

import { useState } from 'react';
import {
  Youtube,
  Search,
  Clock,
  Eye,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle,
  Play,
  ChevronDown,
  X,
  Link2,
} from 'lucide-react';
import { useIngestionStore } from '../../state/useIngestionStore';
import type { YouTubeSearchResult } from '../../api/refquestIngestionApi';

export function YoutubeIngestPanel() {
  const {
    // Search state
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    searchNextPageToken,
    searchYouTube,
    loadMoreResults,
    selectSearchResult,
    clearSearchResults,
    // URL state
    youtubeUrl,
    setYoutubeUrl,
    youtubeMetadata,
    isLoadingMetadata,
    isIngesting,
    fetchMetadata,
    clearMetadata,
    ingestYoutube,
    error,
    clearError,
  } = useIngestionStore();

  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [localUrl, setLocalUrl] = useState(youtubeUrl);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const handleSearch = () => {
    setSearchQuery(localSearchQuery);
    setTimeout(() => searchYouTube(), 0);
  };

  const handleSelectResult = (result: YouTubeSearchResult) => {
    selectSearchResult(result);
  };

  const handleFetchMetadata = () => {
    setYoutubeUrl(localUrl);
    setTimeout(() => fetchMetadata(), 0);
  };

  const handleIngest = async () => {
    const gameId = await ingestYoutube();
    if (gameId) {
      setLocalUrl('');
      setLocalSearchQuery('');
      clearSearchResults();
    }
  };

  const handleClearSelection = () => {
    clearMetadata();
    setLocalUrl('');
  };

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatIsoDuration = (isoDuration?: string): string => {
    if (!isoDuration) return '';
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '';
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatViews = (views?: number): string => {
    if (!views) return 'N/A';
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M views`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K views`;
    return `${views} views`;
  };

  const formatDate = (isoDate: string): string => {
    const date = new Date(isoDate);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
            <Youtube className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Search YouTube</h3>
            <p className="text-sm text-slate-400">Find basketball videos directly within the app</p>
          </div>
        </div>

        {/* Search Input */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              placeholder="Search for basketball games, highlights, officiating..."
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && localSearchQuery) {
                  handleSearch();
                }
              }}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!localSearchQuery || isSearching}
            className="px-6 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {isSearching ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
            <span>Search</span>
          </button>
        </div>

        {/* Toggle URL Input */}
        <button
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="mt-3 text-sm text-slate-500 hover:text-slate-400 flex items-center gap-1"
        >
          <Link2 className="w-4 h-4" />
          <span>Or paste a YouTube URL directly</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showUrlInput ? 'rotate-180' : ''}`} />
        </button>

        {/* URL Input (Collapsible) */}
        {showUrlInput && (
          <div className="mt-3 flex gap-3">
            <input
              type="text"
              value={localUrl}
              onChange={(e) => setLocalUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1 px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && localUrl) {
                  handleFetchMetadata();
                }
              }}
            />
            <button
              onClick={handleFetchMetadata}
              disabled={!localUrl || isLoadingMetadata}
              className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2"
            >
              {isLoadingMetadata ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>Fetch</span>
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={clearError}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Search Results Grid */}
      {searchResults.length > 0 && !youtubeMetadata && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-400">
              Search Results ({searchResults.length})
            </h4>
            <button
              onClick={clearSearchResults}
              className="text-sm text-slate-500 hover:text-white flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.map((result) => (
              <SearchResultCard
                key={result.videoId}
                result={result}
                onSelect={handleSelectResult}
                formatDuration={formatIsoDuration}
                formatDate={formatDate}
              />
            ))}
          </div>

          {/* Load More */}
          {searchNextPageToken && (
            <div className="text-center">
              <button
                onClick={loadMoreResults}
                disabled={isSearching}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg transition-colors flex items-center gap-2 mx-auto"
              >
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                <span>Load More Results</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Selected Video Preview */}
      {youtubeMetadata && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* Thumbnail */}
            <div className="relative md:w-80 aspect-video md:aspect-auto bg-slate-800">
              <img
                src={youtubeMetadata.thumbnailUrl}
                alt={youtubeMetadata.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <Play className="w-12 h-12 text-white" />
              </div>
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded text-xs text-white font-medium">
                {formatDuration(youtubeMetadata.duration)}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-white line-clamp-2">
                    {youtubeMetadata.title}
                  </h4>
                  <p className="text-sm text-slate-400 mt-1">{youtubeMetadata.channel}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-slate-400 text-sm flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Ready</span>
                  </div>
                  <button
                    onClick={handleClearSelection}
                    className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded transition-colors"
                    title="Clear selection"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 mt-4 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{formatDuration(youtubeMetadata.duration)}</span>
                </div>
                {youtubeMetadata.viewCount && (
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <span>{formatViews(youtubeMetadata.viewCount)}</span>
                  </div>
                )}
              </div>

              {/* Processing Info */}
              <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
                <p className="text-xs text-slate-500 mb-2">Pipeline will include:</p>
                <div className="flex flex-wrap gap-2">
                  {['Download', 'YOLOv8s Detection', 'ByteTrack', 'Event Detection', 'QSurfaces', 'Clips'].map((step) => (
                    <span key={step} className="px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded text-xs">
                      {step}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={handleIngest}
                  disabled={isIngesting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  {isIngesting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Starting Ingestion...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      <span>Ingest Video</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleClearSelection}
                  className="px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State / Quick Tips */}
      {!youtubeMetadata && searchResults.length === 0 && !isSearching && (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-6">
          <h4 className="text-sm font-medium text-slate-400 mb-3">Quick Tips</h4>
          <ul className="space-y-2 text-sm text-slate-500">
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-1">1.</span>
              <span>Use the search bar to find basketball videos directly on YouTube</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-1">2.</span>
              <span>Click on a video thumbnail to select it for ingestion</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-1">3.</span>
              <span>Processing typically takes 5-15 minutes depending on video length</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-1">4.</span>
              <span>You can also paste a YouTube URL directly using the toggle above</span>
            </li>
          </ul>

          {/* Sample Search Suggestions */}
          <div className="mt-4 pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-600 mb-2">Try searching for:</p>
            <div className="flex flex-wrap gap-2">
              {['NBA foul highlights', 'basketball referee mechanics', 'NBA controversial calls', 'basketball game full'].map((term) => (
                <button
                  key={term}
                  onClick={() => {
                    setLocalSearchQuery(term);
                    setSearchQuery(term);
                    setTimeout(() => searchYouTube(), 0);
                  }}
                  className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded-lg text-xs cursor-pointer hover:bg-slate-700 hover:text-white transition-colors"
                >
                  "{term}"
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isSearching && searchResults.length === 0 && (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 text-red-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Searching YouTube...</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Search Result Card Component
// ============================================================================

interface SearchResultCardProps {
  result: YouTubeSearchResult;
  onSelect: (result: YouTubeSearchResult) => void;
  formatDuration: (duration?: string) => string;
  formatDate: (date: string) => string;
}

function SearchResultCard({ result, onSelect, formatDuration, formatDate }: SearchResultCardProps) {
  return (
    <button
      onClick={() => onSelect(result)}
      className="group text-left bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-red-500/50 hover:bg-slate-800/50 transition-all"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-slate-800">
        <img
          src={result.thumbnailUrl}
          alt={result.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
          <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center">
            <Play className="w-5 h-5 text-white ml-0.5" />
          </div>
        </div>
        {result.duration && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 rounded text-xs text-white font-medium">
            {formatDuration(result.duration)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h5 className="text-sm font-medium text-white line-clamp-2 group-hover:text-red-400 transition-colors">
          {result.title}
        </h5>
        <p className="text-xs text-slate-500 mt-1">{result.channel}</p>
        <p className="text-xs text-slate-600 mt-0.5">{formatDate(result.publishedAt)}</p>
      </div>
    </button>
  );
}
