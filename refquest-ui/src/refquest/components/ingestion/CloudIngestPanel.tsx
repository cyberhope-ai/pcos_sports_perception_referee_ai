/**
 * Phase 12.8: Cloud Ingestion Panel
 *
 * Supports cloud storage providers: AWS S3, Google Cloud Storage, Azure Blob Storage
 * Auto-detects provider from URL patterns
 */

import { useState } from 'react';
import {
  Cloud,
  Search,
  Clock,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle,
  HardDrive,
} from 'lucide-react';
import { useIngestionStore } from '../../state/useIngestionStore';

type CloudProvider = 's3' | 'gcs' | 'azure' | 'direct';

export function CloudIngestPanel() {
  const {
    cloudUrlInput,
    setCloudUrlInput,
    cloudMetadata,
    isLoadingCloudMetadata,
    isIngestingCloud,
    fetchCloudMetadata,
    clearCloudMetadata,
    ingestFromCloud,
    error,
    clearError,
  } = useIngestionStore();

  const [localUrl, setLocalUrl] = useState(cloudUrlInput);

  // Detect cloud provider from URL
  const detectProvider = (url: string): CloudProvider => {
    if (!url) return 'direct';
    const lowerUrl = url.toLowerCase();

    // AWS S3 patterns
    if (lowerUrl.includes('s3.amazonaws.com') || lowerUrl.includes('.amazonaws.com/')) {
      return 's3';
    }

    // Google Cloud Storage patterns
    if (lowerUrl.includes('storage.googleapis.com') || lowerUrl.includes('storage.cloud.google.com')) {
      return 'gcs';
    }

    // Azure Blob Storage patterns
    if (lowerUrl.includes('blob.core.windows.net')) {
      return 'azure';
    }

    return 'direct';
  };

  const provider = detectProvider(localUrl);

  const handleFetchMetadata = () => {
    setCloudUrlInput(localUrl);
    setTimeout(() => fetchCloudMetadata(), 0);
  };

  const handleIngest = async () => {
    const gameId = await ingestFromCloud();
    if (gameId) {
      setLocalUrl('');
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  const getProviderIcon = () => {
    switch (provider) {
      case 's3':
        return <Cloud className="w-5 h-5 text-orange-400" />;
      case 'gcs':
        return <Cloud className="w-5 h-5 text-blue-400" />;
      case 'azure':
        return <Cloud className="w-5 h-5 text-cyan-400" />;
      default:
        return <HardDrive className="w-5 h-5 text-slate-400" />;
    }
  };

  const getProviderLabel = () => {
    switch (provider) {
      case 's3':
        return { text: 'AWS S3', color: 'text-orange-400 bg-orange-500/20', fullName: 'Amazon S3' };
      case 'gcs':
        return { text: 'GCS', color: 'text-blue-400 bg-blue-500/20', fullName: 'Google Cloud Storage' };
      case 'azure':
        return { text: 'Azure', color: 'text-cyan-400 bg-cyan-500/20', fullName: 'Azure Blob Storage' };
      default:
        return { text: 'Direct', color: 'text-slate-400 bg-slate-500/20', fullName: 'Direct HTTPS' };
    }
  };

  const providerLabel = getProviderLabel();

  return (
    <div className="space-y-6">
      {/* URL Input Section */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 via-blue-500/20 to-cyan-500/20 flex items-center justify-center">
            <Cloud className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Cloud Storage Import</h3>
            <p className="text-sm text-slate-400">Import from AWS S3, Google Cloud, or Azure</p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={localUrl}
              onChange={(e) => setLocalUrl(e.target.value)}
              placeholder="https://bucket.s3.amazonaws.com/video.mp4?..."
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors pr-24"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && localUrl) {
                  handleFetchMetadata();
                }
              }}
            />
            {localUrl && (
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs rounded ${providerLabel.color}`}>
                {providerLabel.text}
              </span>
            )}
          </div>
          <button
            onClick={handleFetchMetadata}
            disabled={!localUrl || isLoadingCloudMetadata}
            className="px-4 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
          >
            {isLoadingCloudMetadata ? (
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
      {cloudMetadata && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* Provider Icon Section */}
            <div className="relative md:w-80 aspect-video md:aspect-auto bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
              <div className="text-center">
                {getProviderIcon()}
                <p className="text-sm text-slate-400 mt-2">{providerLabel.fullName}</p>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs rounded ${providerLabel.color}`}>
                      {providerLabel.text}
                    </span>
                    {cloudMetadata.contentType && (
                      <span className="px-2 py-1 text-xs rounded bg-slate-700 text-slate-300">
                        {cloudMetadata.contentType}
                      </span>
                    )}
                  </div>
                  <h4 className="text-lg font-semibold text-white line-clamp-2">
                    {cloudMetadata.filename || 'Cloud Video'}
                  </h4>
                  <p className="text-sm text-slate-400 mt-1 truncate">{cloudMetadata.url}</p>
                </div>
                <div className="flex items-center gap-1 text-slate-400 text-sm flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Ready</span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 mt-4 text-sm text-slate-400">
                {cloudMetadata.fileSize && (
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    <span>{formatFileSize(cloudMetadata.fileSize)}</span>
                  </div>
                )}
                {cloudMetadata.lastModified && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Modified: {new Date(cloudMetadata.lastModified).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {/* Processing Info */}
              <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
                <p className="text-xs text-slate-500 mb-2">Pipeline will include:</p>
                <div className="flex flex-wrap gap-2">
                  {['Cloud Download', 'YOLOv8s Detection', 'ByteTrack', 'Event Detection', 'QSurfaces', 'Clips'].map((step) => (
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
                  disabled={isIngestingCloud}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 via-blue-500 to-cyan-500 hover:from-orange-400 hover:via-blue-400 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  {isIngestingCloud ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Starting Ingestion...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      <span>Ingest from Cloud</span>
                    </>
                  )}
                </button>
                <button
                  onClick={clearCloudMetadata}
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
      {!cloudMetadata && (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-6">
          <h4 className="text-sm font-medium text-slate-400 mb-3">Supported Cloud Providers</h4>

          <div className="grid md:grid-cols-3 gap-4">
            {/* AWS S3 */}
            <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <div className="flex items-center gap-3 mb-2">
                <Cloud className="w-5 h-5 text-orange-400" />
                <span className="font-medium text-white">Amazon S3</span>
              </div>
              <p className="text-sm text-slate-500">
                Use pre-signed URLs from S3 buckets. Supports any region.
              </p>
              <p className="text-xs text-slate-600 mt-2">
                *.s3.amazonaws.com/*
              </p>
            </div>

            {/* Google Cloud Storage */}
            <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <div className="flex items-center gap-3 mb-2">
                <Cloud className="w-5 h-5 text-blue-400" />
                <span className="font-medium text-white">Google Cloud</span>
              </div>
              <p className="text-sm text-slate-500">
                Use signed URLs from GCS buckets with read access.
              </p>
              <p className="text-xs text-slate-600 mt-2">
                storage.googleapis.com/*
              </p>
            </div>

            {/* Azure Blob */}
            <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <div className="flex items-center gap-3 mb-2">
                <Cloud className="w-5 h-5 text-cyan-400" />
                <span className="font-medium text-white">Azure Blob</span>
              </div>
              <p className="text-sm text-slate-500">
                Use SAS tokens for Azure Blob Storage containers.
              </p>
              <p className="text-xs text-slate-600 mt-2">
                *.blob.core.windows.net/*
              </p>
            </div>
          </div>

          {/* Security Note */}
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-yellow-400 font-medium">Security Note</p>
                <p className="text-xs text-yellow-400/80 mt-1">
                  Pre-signed/SAS URLs contain temporary credentials. They expire after a set time and provide secure, temporary access to your cloud storage.
                </p>
              </div>
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
