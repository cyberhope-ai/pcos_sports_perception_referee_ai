/**
 * Phase 12.7: URL Ingestion Panel
 *
 * Supports Vimeo URLs and direct video links (MP4, MOV, etc.)
 */

import { useState } from 'react';
import {
  Link,
  Search,
  Clock,
  Eye,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle,
  Play,
  Globe,
  Film,
} from 'lucide-react';
import { useIngestionStore } from '../../state/useIngestionStore';

type UrlSourceType = 'vimeo' | 'direct' | 'unknown';

export function UrlIngestPanel() {
  const {
    urlInput,
    setUrlInput,
    urlMetadata,
    isLoadingUrlMetadata,
    isIngestingUrl,
    fetchUrlMetadata,
    clearUrlMetadata,
    ingestFromUrl,
    error,
    clearError,
  } = useIngestionStore();

  const [localUrl, setLocalUrl] = useState(urlInput);

  // Detect URL source type
  const detectSourceType = (url: string): UrlSourceType => {
    if (!url) return 'unknown';
    const lowerUrl = url.toLowerCase();

    if (lowerUrl.includes('vimeo.com')) {
      return 'vimeo';
    }

    // Check for direct video file extensions
    if (lowerUrl.match(/\.(mp4|mov|avi|mkv|webm|m4v)(\?|$)/)) {
      return 'direct';
    }

    return 'unknown';
  };

  const sourceType = detectSourceType(localUrl);

  const handleFetchMetadata = () => {
    setUrlInput(localUrl);
    setTimeout(() => fetchUrlMetadata(), 0);
  };

  const handleIngest = async () => {
    const gameId = await ingestFromUrl();
    if (gameId) {
      setLocalUrl('');
    }
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  const getSourceIcon = () => {
    switch (sourceType) {
      case 'vimeo':
        return <Film className="w-5 h-5 text-blue-400" />;
      case 'direct':
        return <Link className="w-5 h-5 text-green-400" />;
      default:
        return <Globe className="w-5 h-5 text-slate-400" />;
    }
  };

  const getSourceLabel = () => {
    switch (sourceType) {
      case 'vimeo':
        return { text: 'Vimeo Video', color: 'text-blue-400 bg-blue-500/20' };
      case 'direct':
        return { text: 'Direct Link', color: 'text-green-400 bg-green-500/20' };
      default:
        return { text: 'Unknown', color: 'text-slate-400 bg-slate-500/20' };
    }
  };

  const sourceLabel = getSourceLabel();

  return (
    <div className="space-y-6">
      {/* URL Input Section */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Link className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">URL Import</h3>
            <p className="text-sm text-slate-400">Import from Vimeo or direct video links</p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={localUrl}
              onChange={(e) => setLocalUrl(e.target.value)}
              placeholder="https://vimeo.com/... or direct video URL"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors pr-24"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && localUrl) {
                  handleFetchMetadata();
                }
              }}
            />
            {localUrl && (
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs rounded ${sourceLabel.color}`}>
                {sourceLabel.text}
              </span>
            )}
          </div>
          <button
            onClick={handleFetchMetadata}
            disabled={!localUrl || isLoadingUrlMetadata}
            className="px-4 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
          >
            {isLoadingUrlMetadata ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
            <span className="hidden sm:inline">Fetch Info</span>
          </button>
        </div>

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

      {/* Metadata Preview */}
      {urlMetadata && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* Thumbnail */}
            <div className="relative md:w-80 aspect-video md:aspect-auto bg-slate-800">
              {urlMetadata.thumbnailUrl ? (
                <>
                  <img
                    src={urlMetadata.thumbnailUrl}
                    alt={urlMetadata.title || 'Video thumbnail'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Play className="w-12 h-12 text-white" />
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {getSourceIcon()}
                </div>
              )}
              {urlMetadata.duration && (
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded text-xs text-white font-medium">
                  {formatDuration(urlMetadata.duration)}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs rounded ${sourceLabel.color}`}>
                      {sourceLabel.text}
                    </span>
                  </div>
                  <h4 className="text-lg font-semibold text-white line-clamp-2">
                    {urlMetadata.title || 'Video'}
                  </h4>
                  {urlMetadata.author && (
                    <p className="text-sm text-slate-400 mt-1">{urlMetadata.author}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-slate-400 text-sm flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Ready</span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 mt-4 text-sm text-slate-400">
                {urlMetadata.duration && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{formatDuration(urlMetadata.duration)}</span>
                  </div>
                )}
                {urlMetadata.fileSize && (
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    <span>{formatFileSize(urlMetadata.fileSize)}</span>
                  </div>
                )}
                {urlMetadata.viewCount && (
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <span>{urlMetadata.viewCount.toLocaleString()} views</span>
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
                  disabled={isIngestingUrl}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  {isIngestingUrl ? (
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
                  onClick={clearUrlMetadata}
                  className="px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Tips */}
      {!urlMetadata && (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-6">
          <h4 className="text-sm font-medium text-slate-400 mb-3">Supported Sources</h4>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Vimeo */}
            <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <div className="flex items-center gap-3 mb-2">
                <Film className="w-5 h-5 text-blue-400" />
                <span className="font-medium text-white">Vimeo</span>
              </div>
              <p className="text-sm text-slate-500">
                Paste any Vimeo video URL. Metadata will be fetched automatically via oEmbed.
              </p>
              <p className="text-xs text-slate-600 mt-2">
                Example: https://vimeo.com/123456789
              </p>
            </div>

            {/* Direct Links */}
            <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <div className="flex items-center gap-3 mb-2">
                <Link className="w-5 h-5 text-green-400" />
                <span className="font-medium text-white">Direct Video Links</span>
              </div>
              <p className="text-sm text-slate-500">
                Any direct link to a video file (MP4, MOV, AVI, MKV, WebM).
              </p>
              <p className="text-xs text-slate-600 mt-2">
                Example: https://example.com/video.mp4
              </p>
            </div>
          </div>

          {/* Processing Pipeline Preview */}
          <div className="mt-4 pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-600 mb-2">Processing Pipeline:</p>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {['Download', 'Detection', 'Tracking', 'Events', 'QSurfaces', 'SkillDNA', 'Clips'].map((step, i) => (
                <div key={step} className="flex items-center gap-2 flex-shrink-0">
                  <span className="px-2 py-1 bg-slate-800 text-slate-400 rounded text-xs">
                    {step}
                  </span>
                  {i < 6 && <span className="text-slate-600">→</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
