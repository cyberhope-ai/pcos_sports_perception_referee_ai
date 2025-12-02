/**
 * Phase 12.6: Ingestion Monitor Panel
 *
 * Real-time job monitoring with status groups and navigation
 * Phase 13.4: Added NVENC hardware encoding indicator and Clear Errors button
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Clock,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Play,
  Youtube,
  Upload,
  ExternalLink,
  Trash2,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
  HardDrive,
  Database,
  Film,
  FolderOpen,
} from 'lucide-react';
import { useIngestionStore } from '../../state/useIngestionStore';
import type { IngestionJob } from '../../api/refquestIngestionApi';

// API base for system validation
const API_BASE = 'http://localhost:8088';

// NVENC status type
interface NvencStatus {
  available: boolean;
  message: string;
}

// Fetch NVENC status from system validation API
async function fetchNvencStatus(): Promise<NvencStatus> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/system/validate?_t=${Date.now()}`, {
      cache: 'no-store',
    });
    if (!response.ok) {
      return { available: false, message: 'System check failed' };
    }
    const data = await response.json();

    // Check NVENC specifically
    if (data.nvenc?.status === 'ok') {
      return { available: true, message: data.nvenc.message || 'NVENC Active' };
    } else if (data.nvenc?.status === 'warning') {
      return { available: true, message: data.nvenc.message || 'NVENC Available' };
    }
    return { available: false, message: data.nvenc?.message || 'NVENC unavailable' };
  } catch {
    return { available: false, message: 'Cannot check NVENC' };
  }
}

export function IngestionMonitorPanel() {
  const navigate = useNavigate();

  const jobs = useIngestionStore((state) => state.jobs);
  const isLoadingJobs = useIngestionStore((state) => state.isLoadingJobs);
  const refreshJobs = useIngestionStore((state) => state.refreshJobs);
  const startPolling = useIngestionStore((state) => state.startPolling);
  const stopPolling = useIngestionStore((state) => state.stopPolling);
  const clearFailedJobs = useIngestionStore((state) => state.clearFailedJobs);

  // Fetch NVENC status
  const { data: nvencStatus } = useQuery({
    queryKey: ['nvenc-status'],
    queryFn: fetchNvencStatus,
    staleTime: 60000, // Cache for 1 minute
    refetchOnWindowFocus: false,
  });

  // Memoize filtered job lists to prevent infinite re-renders
  const pendingJobs = useMemo(
    () => jobs.filter((j) => j.status === 'queued' || j.status === 'downloading'),
    [jobs]
  );
  const activeJobs = useMemo(
    () => jobs.filter((j) =>
      ['uploading', 'processing', 'processing_skilldna', 'generating_clips'].includes(j.status)
    ),
    [jobs]
  );
  const completedJobs = useMemo(
    () => jobs.filter((j) => j.status === 'completed'),
    [jobs]
  );
  const failedJobs = useMemo(
    () => jobs.filter((j) => j.status === 'failed'),
    [jobs]
  );

  // Start polling on mount - use empty dependency array since store functions are stable
  useEffect(() => {
    startPolling(5000);
    return () => stopPolling();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenReview = (gameId: string) => {
    navigate(`/refquest/game/${gameId}/review`);
  };

  return (
    <div className="space-y-6">
      {/* Header with NVENC Badge and Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white">Processing Monitor</h3>
            {/* NVIDIA NVENC Hardware Encoding Badge */}
            {nvencStatus && (
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  nvencStatus.available
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-slate-700/50 text-slate-500 border border-slate-600/30'
                }`}
                title={nvencStatus.message}
              >
                <Zap className={`w-3 h-3 ${nvencStatus.available ? 'text-green-400' : 'text-slate-500'}`} />
                <span>NVENC</span>
                {nvencStatus.available && (
                  <CheckCircle className="w-3 h-3 text-green-400" />
                )}
              </div>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {jobs.length} total job{jobs.length !== 1 ? 's' : ''} · Auto-refreshing every 5s
            {nvencStatus?.available && ' · Hardware encoding enabled'}
          </p>
        </div>
        <button
          onClick={refreshJobs}
          disabled={isLoadingJobs}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingJobs ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Active Jobs */}
      {activeJobs.length > 0 && (
        <JobSection
          title="Active Processing"
          icon={<Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />}
          jobs={activeJobs}
          color="yellow"
        />
      )}

      {/* Pending Jobs */}
      {pendingJobs.length > 0 && (
        <JobSection
          title="Pending"
          icon={<Clock className="w-5 h-5 text-slate-400" />}
          jobs={pendingJobs}
          color="slate"
        />
      )}

      {/* Completed Jobs */}
      {completedJobs.length > 0 && (
        <JobSection
          title="Completed"
          icon={<CheckCircle className="w-5 h-5 text-green-400" />}
          jobs={completedJobs}
          color="green"
          onOpenReview={handleOpenReview}
        />
      )}

      {/* Failed Jobs */}
      {failedJobs.length > 0 && (
        <JobSection
          title="Failed"
          icon={<AlertCircle className="w-5 h-5 text-red-400" />}
          jobs={failedJobs}
          color="red"
          onClearAll={clearFailedJobs}
        />
      )}

      {/* Empty State */}
      {jobs.length === 0 && !isLoadingJobs && (
        <div className="text-center py-16 bg-slate-900/30 border border-slate-800/50 rounded-xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
            <Play className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No Ingestion Jobs</h3>
          <p className="text-slate-400 max-w-md mx-auto">
            Start by uploading a video file or ingesting a YouTube video from the other tabs.
          </p>
        </div>
      )}

      {/* Loading State */}
      {isLoadingJobs && jobs.length === 0 && (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading jobs...</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Job Section Component
// ============================================================================

interface JobSectionProps {
  title: string;
  icon: React.ReactNode;
  jobs: IngestionJob[];
  color: 'yellow' | 'slate' | 'green' | 'red';
  onOpenReview?: (gameId: string) => void;
  onClearAll?: () => void;
}

function JobSection({ title, icon, jobs, color, onOpenReview, onClearAll }: JobSectionProps) {
  const colorMap = {
    yellow: 'border-yellow-500/30 bg-yellow-500/5',
    slate: 'border-slate-700 bg-slate-900/30',
    green: 'border-green-500/30 bg-green-500/5',
    red: 'border-red-500/30 bg-red-500/5',
  };

  return (
    <div className={`border rounded-xl overflow-hidden ${colorMap[color]}`}>
      {/* Section Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-medium text-white">{title}</span>
          <span className="text-sm text-slate-500">({jobs.length})</span>
        </div>
        {onClearAll && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
            title="Clear all failed jobs"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* Jobs List */}
      <div className="divide-y divide-slate-800/50">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} onOpenReview={onOpenReview} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Job Card Component with Expandable Metadata
// ============================================================================

interface JobCardProps {
  job: IngestionJob;
  onOpenReview?: (gameId: string) => void;
}

function JobCard({ job, onOpenReview }: JobCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusConfig: Record<string, { icon: typeof Clock; color: string; animate?: boolean }> = {
    queued: { icon: Clock, color: 'text-slate-400' },
    downloading: { icon: Loader2, color: 'text-blue-400', animate: true },
    uploading: { icon: Upload, color: 'text-blue-400', animate: true },
    processing: { icon: Loader2, color: 'text-yellow-400', animate: true },
    processing_skilldna: { icon: Loader2, color: 'text-purple-400', animate: true },
    generating_clips: { icon: Loader2, color: 'text-cyan-400', animate: true },
    completed: { icon: CheckCircle, color: 'text-green-400' },
    failed: { icon: AlertCircle, color: 'text-red-400' },
  };

  const config = statusConfig[job.status] || statusConfig.queued;
  const StatusIcon = config.icon;

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'N/A';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // Show metadata info icon only for completed/processing jobs or if metadata exists
  const hasMetadata = job.metadata || job.storagePath || job.duration;

  return (
    <div className="hover:bg-slate-800/30 transition-colors">
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Source Icon */}
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            job.source === 'youtube' ? 'bg-red-500/20' : 'bg-cyan-500/20'
          }`}>
            {job.source === 'youtube' ? (
              <Youtube className="w-5 h-5 text-red-400" />
            ) : (
              <Upload className="w-5 h-5 text-cyan-400" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-white truncate">
                {job.title || job.videoFilename}
              </h4>
              <StatusIcon className={`w-4 h-4 ${config.color} ${config.animate ? 'animate-spin' : ''} flex-shrink-0`} />
              {/* Info toggle button */}
              {hasMetadata && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1 rounded hover:bg-slate-700/50 transition-colors"
                  title="Show video details"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <Info className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{job.stage}</p>

            {/* Quick stats row */}
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
              {job.duration && (
                <span className="flex items-center gap-1">
                  <Film className="w-3 h-3" />
                  {formatDuration(job.duration)}
                </span>
              )}
              {job.metadata?.resolution && (
                <span>{job.metadata.resolution}</span>
              )}
              {job.metadata?.fileSize && (
                <span className="flex items-center gap-1">
                  <HardDrive className="w-3 h-3" />
                  {formatFileSize(job.metadata.fileSize)}
                </span>
              )}
              {job.metadata?.codec && (
                <span className="px-1.5 py-0.5 bg-slate-700/50 rounded text-[10px] uppercase">
                  {job.metadata.codec}
                </span>
              )}
              {job.inDatabase !== undefined && (
                <span className={`flex items-center gap-1 ${job.inDatabase ? 'text-green-500' : 'text-slate-600'}`}>
                  <Database className="w-3 h-3" />
                  {job.inDatabase ? 'DB' : 'No DB'}
                </span>
              )}
            </div>

            {/* Progress Bar */}
            {job.status !== 'queued' && job.status !== 'completed' && job.status !== 'failed' && (
              <div className="mt-2">
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-slate-600">{job.status}</span>
                  <span className="text-xs text-slate-400">{job.progress}%</span>
                </div>
              </div>
            )}

            {/* Error */}
            {job.error && (
              <p className="text-xs text-red-400 mt-2 line-clamp-2">{job.error}</p>
            )}
          </div>

          {/* Timestamp */}
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-slate-500">{formatTime(job.updatedAt)}</p>

            {/* Action Button */}
            {job.status === 'completed' && job.gameId && onOpenReview && (
              <button
                onClick={() => onOpenReview(job.gameId!)}
                className="mt-2 flex items-center gap-1 px-3 py-1.5 text-xs bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 rounded-lg transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Review</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Metadata Panel */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-700/50 bg-slate-900/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            {/* Resolution */}
            <div>
              <p className="text-slate-500 mb-1">Resolution</p>
              <p className="text-slate-300 font-medium">
                {job.metadata?.resolution || (job.metadata?.width && job.metadata?.height
                  ? `${job.metadata.width}x${job.metadata.height}`
                  : 'N/A')}
              </p>
            </div>

            {/* File Size */}
            <div>
              <p className="text-slate-500 mb-1">File Size</p>
              <p className="text-slate-300 font-medium">
                {formatFileSize(job.metadata?.fileSize)}
              </p>
            </div>

            {/* Codec */}
            <div>
              <p className="text-slate-500 mb-1">Video Codec</p>
              <p className="text-slate-300 font-medium uppercase">
                {job.metadata?.codec || 'N/A'}
              </p>
            </div>

            {/* Encoder */}
            <div>
              <p className="text-slate-500 mb-1">Encoder</p>
              <p className={`font-medium ${job.metadata?.encoder === 'NVENC' ? 'text-green-400' : 'text-slate-300'}`}>
                {job.metadata?.encoder || 'N/A'}
              </p>
            </div>

            {/* Bitrate */}
            <div>
              <p className="text-slate-500 mb-1">Bitrate</p>
              <p className="text-slate-300 font-medium">
                {job.metadata?.bitrate ? `${job.metadata.bitrate} kbps` : 'N/A'}
              </p>
            </div>

            {/* FPS */}
            <div>
              <p className="text-slate-500 mb-1">Frame Rate</p>
              <p className="text-slate-300 font-medium">
                {job.metadata?.fps ? `${job.metadata.fps} fps` : 'N/A'}
              </p>
            </div>

            {/* Duration */}
            <div>
              <p className="text-slate-500 mb-1">Duration</p>
              <p className="text-slate-300 font-medium">
                {job.duration ? formatDuration(job.duration) : 'N/A'}
              </p>
            </div>

            {/* Database Status */}
            <div>
              <p className="text-slate-500 mb-1">Database</p>
              <p className={`font-medium flex items-center gap-1 ${job.inDatabase ? 'text-green-400' : 'text-slate-500'}`}>
                <Database className="w-3 h-3" />
                {job.inDatabase ? 'Stored' : 'Not stored'}
              </p>
            </div>
          </div>

          {/* Storage Path */}
          {job.storagePath && (
            <div className="mt-3 pt-3 border-t border-slate-700/30">
              <p className="text-slate-500 text-xs mb-1 flex items-center gap-1">
                <FolderOpen className="w-3 h-3" />
                Storage Location
              </p>
              <p className="text-slate-400 text-xs font-mono bg-slate-800/50 rounded px-2 py-1 break-all">
                {job.storagePath}
              </p>
            </div>
          )}

          {/* Game ID */}
          {job.gameId && (
            <div className="mt-2">
              <p className="text-slate-500 text-xs mb-1">Game ID</p>
              <p className="text-cyan-400 text-xs font-mono">{job.gameId}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
