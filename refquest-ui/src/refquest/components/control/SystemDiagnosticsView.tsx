/**
 * Phase 13.3: System Diagnostics View
 *
 * Displays system validation results from /api/v1/system/validate
 * Shows status cards for: GPU, CUDA, NVENC, YOLO, yt-dlp, Directories, DB Schema, MCP
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Cpu,
  HardDrive,
  Database,
  Wifi,
  Video,
  FolderCheck,
  Download,
  Zap,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { emitPcosEvent, PCOS_EVENT_TYPES, SYSTEM_ACTOR } from '../../pcos/pcosEventBus';

// API base URL
const API_BASE = 'http://localhost:8088';

// Types matching backend
interface ValidationResult {
  name: string;
  status: 'ok' | 'warning' | 'error' | 'skipped';
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

interface SystemValidationReport {
  overall_status: 'ok' | 'warning' | 'error';
  results: ValidationResult[];
  timestamp: string;
  blocking_issues: string[];
  warnings: string[];
}

// Known validation check keys in the API response
const VALIDATION_KEYS = ['gpu', 'cuda', 'ffmpeg', 'nvenc', 'yolo', 'yt_dlp', 'directories', 'refiq', 'mcp'];

// Status config for visual styling
const statusConfig = {
  ok: {
    icon: CheckCircle,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    label: 'Healthy',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    label: 'Warning',
  },
  error: {
    icon: XCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    label: 'Error',
  },
  skipped: {
    icon: Clock,
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    label: 'Skipped',
  },
};

// Icon mapping for different check types
const checkIcons: Record<string, React.ElementType> = {
  gpu: Cpu,
  cuda: Zap,
  ffmpeg: Video,
  nvenc: Video,
  yolo: Cpu,
  yt_dlp: Download,
  directories: FolderCheck,
  refiq: Database,
  mcp: Wifi,
};

// Fetch validation from API and transform response
async function fetchValidation(): Promise<SystemValidationReport> {
  // Add cache-busting timestamp to force fresh data
  const response = await fetch(`${API_BASE}/api/v1/system/validate?_t=${Date.now()}`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch validation: ${response.statusText}`);
  }
  const data = await response.json();

  // Transform API response: extract individual results into an array
  const results: ValidationResult[] = VALIDATION_KEYS
    .filter(key => data[key])
    .map(key => data[key] as ValidationResult);

  // Extract warnings from results with warning status
  const warnings: string[] = results
    .filter(r => r.status === 'warning')
    .map(r => r.message);

  return {
    overall_status: data.overall_status || 'error',
    results,
    timestamp: data.timestamp || new Date().toISOString(),
    blocking_issues: data.blocking_issues || [],
    warnings,
  };
}

export function SystemDiagnosticsView() {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const {
    data: report,
    isLoading,
    error,
    refetch,
    isFetching,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['system-validation'],
    queryFn: fetchValidation,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });

  // Emit PCOS event on validation complete
  useEffect(() => {
    if (report) {
      emitPcosEvent(
        PCOS_EVENT_TYPES.SYSTEM.VALIDATION_COMPLETED,
        {
          overallStatus: report.overall_status,
          blockingIssues: report.blocking_issues.length,
          warnings: report.warnings.length,
        },
        SYSTEM_ACTOR
      );
    }
  }, [report]);

  const handleRefresh = useCallback(() => {
    emitPcosEvent(
      PCOS_EVENT_TYPES.SYSTEM.VALIDATION_STARTED,
      { manual: true },
      SYSTEM_ACTOR
    );
    refetch();
  }, [refetch]);

  const toggleCard = (name: string) => {
    setExpandedCard(expandedCard === name ? null : name);
  };

  // Format timestamp
  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Get overall status config
  const overallStatus = report?.overall_status || 'error';
  const OverallIcon = statusConfig[overallStatus].icon;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">System Diagnostics</h1>
          <p className="text-slate-400 mt-1">
            Validate system dependencies and connectivity
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Validating...' : 'Run Validation'}
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
            <p className="text-slate-400">Running system validation...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3">
            <XCircle className="w-6 h-6 text-red-400" />
            <div>
              <h3 className="text-red-400 font-medium">Validation Failed</h3>
              <p className="text-sm text-slate-400 mt-1">
                {error instanceof Error ? error.message : 'Failed to connect to backend'}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Make sure the backend is running at {API_BASE}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {report && (
        <>
          {/* Overall Status Banner */}
          <div
            className={`${statusConfig[overallStatus].bg} ${statusConfig[overallStatus].border} border rounded-xl p-4 mb-6`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <OverallIcon className={`w-6 h-6 ${statusConfig[overallStatus].color}`} />
                <div>
                  <h3 className={`font-medium ${statusConfig[overallStatus].color}`}>
                    System Status: {statusConfig[overallStatus].label}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {report.blocking_issues.length > 0
                      ? `${report.blocking_issues.length} blocking issue(s) found`
                      : report.warnings.length > 0
                      ? `${report.warnings.length} warning(s) found`
                      : 'All systems operational'}
                  </p>
                </div>
              </div>
              <div className="text-xs text-slate-500">
                Last checked: {formatTime(report.timestamp)}
              </div>
            </div>

            {/* Blocking Issues */}
            {report.blocking_issues.length > 0 && (
              <div className="mt-4 pt-4 border-t border-red-500/30">
                <p className="text-sm font-medium text-red-400 mb-2">Blocking Issues:</p>
                <ul className="space-y-1">
                  {report.blocking_issues.map((issue, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                      <span className="text-red-400">•</span>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {report.warnings.length > 0 && (
              <div className="mt-4 pt-4 border-t border-yellow-500/30">
                <p className="text-sm font-medium text-yellow-400 mb-2">Warnings:</p>
                <ul className="space-y-1">
                  {report.warnings.map((warning, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                      <span className="text-yellow-400">•</span>
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Component Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {report.results.map((result) => {
              const status = statusConfig[result.status];
              const StatusIcon = status.icon;
              const ComponentIcon = checkIcons[result.name] || HardDrive;
              const isExpanded = expandedCard === result.name;

              return (
                <div
                  key={result.name}
                  className={`${status.bg} ${status.border} border rounded-xl overflow-hidden transition-all`}
                >
                  {/* Card Header */}
                  <div
                    className="p-4 cursor-pointer hover:bg-slate-800/30 transition-colors"
                    onClick={() => toggleCard(result.name)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${status.bg} flex items-center justify-center`}>
                          <ComponentIcon className={`w-5 h-5 ${status.color}`} />
                        </div>
                        <div>
                          <h3 className="text-white font-medium capitalize">
                            {result.name.replace(/_/g, ' ')}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <StatusIcon className={`w-3.5 h-3.5 ${status.color}`} />
                            <span className={`text-xs ${status.color}`}>{status.label}</span>
                          </div>
                        </div>
                      </div>
                      {result.details && Object.keys(result.details).length > 0 && (
                        <button className="text-slate-500 hover:text-slate-300">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Message */}
                    <p className="text-sm text-slate-400 mt-2 line-clamp-2">
                      {result.message}
                    </p>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && result.details && Object.keys(result.details).length > 0 && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-700/50">
                      <div className="space-y-2">
                        {Object.entries(result.details).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-sm">
                            <span className="text-slate-500 capitalize">
                              {key.replace(/_/g, ' ')}:
                            </span>
                            <span className="text-slate-300 font-mono text-xs">
                              {typeof value === 'boolean'
                                ? value
                                  ? 'Yes'
                                  : 'No'
                                : typeof value === 'object'
                                ? JSON.stringify(value)
                                : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Ingestion Readiness */}
          <div className="mt-6 bg-slate-900/50 border border-slate-800 rounded-xl p-5">
            <h3 className="text-white font-medium mb-3">Ingestion Readiness</h3>
            <div className="flex items-center gap-4">
              {report.overall_status === 'error' ? (
                <>
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  <div>
                    <p className="text-red-400">Video ingestion blocked</p>
                    <p className="text-xs text-slate-500">
                      Fix blocking issues before ingesting videos
                    </p>
                  </div>
                </>
              ) : report.overall_status === 'warning' ? (
                <>
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div>
                    <p className="text-yellow-400">Video ingestion available with warnings</p>
                    <p className="text-xs text-slate-500">
                      Some features may be limited
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <div>
                    <p className="text-green-400">Video ingestion ready</p>
                    <p className="text-xs text-slate-500">
                      All systems operational
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default SystemDiagnosticsView;
