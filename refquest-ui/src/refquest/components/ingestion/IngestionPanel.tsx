/**
 * Phase 12.5: Ingestion Panel
 *
 * Video upload and processing status view
 * Enhanced with PCOS Event Bus integration
 */

import { useState } from 'react';
import { Upload, FileVideo, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { mockIngestionJobs } from '../../mock/data';
import { emitPcosEvent, PCOS_EVENT_TYPES, HUMAN_ACTOR } from '../../pcos/pcosEventBus';

export function IngestionPanel() {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Video Ingestion</h1>
        <p className="text-slate-400 mt-1">Upload and process game footage</p>
      </div>

      {/* Upload Zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          isDragging
            ? 'border-cyan-500 bg-cyan-500/10'
            : 'border-slate-700 bg-slate-900/30 hover:border-slate-600'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          // Emit PCOS event for video queued
          const files = Array.from(e.dataTransfer.files);
          files.forEach((file) => {
            emitPcosEvent(
              PCOS_EVENT_TYPES.INGESTION.VIDEO_QUEUED,
              {
                filename: file.name,
                fileSize: file.size,
                fileType: file.type,
              },
              HUMAN_ACTOR
            );
          });
          // TODO: Handle file upload
          console.log('[IngestionPanel] Files dropped:', files);
        }}
      >
        <Upload className="w-12 h-12 mx-auto text-slate-500 mb-4" />
        <p className="text-white font-medium mb-1">Drop video files here</p>
        <p className="text-sm text-slate-500 mb-4">or click to browse</p>
        <button className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors">
          Select Files
        </button>
        <p className="text-xs text-slate-600 mt-4">
          Supported: MP4, MOV, AVI · Max 500MB
        </p>
      </div>

      {/* Processing Queue */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Processing Queue</h2>
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <div className="space-y-3">
          {mockIngestionJobs.map((job) => (
            <IngestionJobCard key={job.id} job={job} />
          ))}
        </div>

        {mockIngestionJobs.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <FileVideo className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No videos in queue</p>
          </div>
        )}
      </div>
    </div>
  );
}

function IngestionJobCard({ job }: { job: typeof mockIngestionJobs[0] }) {
  const statusConfig: Record<string, { icon: typeof Clock; color: string; bg: string; animate?: boolean }> = {
    queued: { icon: Clock, color: 'text-slate-400', bg: 'bg-slate-500/10' },
    uploading: { icon: Upload, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    processing: { icon: RefreshCw, color: 'text-yellow-400', bg: 'bg-yellow-500/10', animate: true },
    analyzing: { icon: RefreshCw, color: 'text-purple-400', bg: 'bg-purple-500/10', animate: true },
    completed: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
    failed: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  };

  const config = statusConfig[job.status];
  const StatusIcon = config.icon;

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
      <div className="flex items-start gap-4">
        {/* Status Icon */}
        <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
          <StatusIcon className={`w-5 h-5 ${config.color} ${config.animate ? 'animate-spin' : ''}`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-white truncate">{job.video_filename}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
              {job.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">{job.stage}</p>

          {/* Progress Bar */}
          {job.status !== 'queued' && job.status !== 'completed' && job.status !== 'failed' && (
            <div className="mt-2">
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${job.status === 'analyzing' ? 'bg-purple-500' : 'bg-cyan-500'} transition-all`}
                  style={{ width: `${job.progress}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-slate-600">Progress</span>
                <span className="text-xs text-slate-400">{job.progress}%</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {job.error && (
            <p className="text-xs text-red-400 mt-2">{job.error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
