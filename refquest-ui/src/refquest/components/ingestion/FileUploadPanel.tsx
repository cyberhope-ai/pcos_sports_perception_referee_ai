/**
 * Phase 12.6: File Upload Panel
 *
 * Drag & drop file upload with progress tracking
 */

import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  FileVideo,
  X,
  CheckCircle,
  AlertCircle,
  HardDrive,
} from 'lucide-react';
import { useIngestionStore } from '../../state/useIngestionStore';

export function FileUploadPanel() {
  const {
    selectedFile,
    setSelectedFile,
    uploadProgress,
    isUploading,
    startUpload,
    error,
    clearError,
  } = useIngestionStore();

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find((f) => f.type.startsWith('video/'));

    if (videoFile) {
      setSelectedFile(videoFile);
    }
  }, [setSelectedFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    await startUpload();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          isDragging
            ? 'border-cyan-500 bg-cyan-500/10 scale-[1.02]'
            : selectedFile
            ? 'border-green-500/50 bg-green-500/5'
            : 'border-slate-700 bg-slate-900/30 hover:border-slate-600'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {!selectedFile ? (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
              <Upload className={`w-8 h-8 ${isDragging ? 'text-cyan-400' : 'text-slate-500'}`} />
            </div>
            <p className="text-lg font-medium text-white mb-1">Drop video files here</p>
            <p className="text-sm text-slate-500 mb-4">or click to browse your computer</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-white font-medium rounded-lg transition-colors"
            >
              Select Files
            </button>
            <p className="text-xs text-slate-600 mt-4">
              Supported: MP4, MOV, AVI, MKV · Max 500MB
            </p>
          </>
        ) : (
          <div className="text-left">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <FileVideo className="w-7 h-7 text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-slate-400">{formatFileSize(selectedFile.size)}</p>
              </div>
              {!isUploading && (
                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Uploading...</span>
                  <span className="text-cyan-400">{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400 flex-1">{error}</p>
          <button
            onClick={clearError}
            className="text-red-400 hover:text-red-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upload Button */}
      {selectedFile && !isUploading && (
        <button
          onClick={handleUpload}
          className="w-full px-6 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-3"
        >
          <Upload className="w-5 h-5" />
          <span>Upload & Process Video</span>
        </button>
      )}

      {/* Upload Info */}
      <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <HardDrive className="w-5 h-5 text-slate-400" />
          <h4 className="text-sm font-medium text-slate-400">Local File Upload</h4>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
            <p className="text-slate-400">
              Files are uploaded directly to the RefQuest backend for processing
            </p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
            <p className="text-slate-400">
              The AI pipeline (YOLOv8s + ByteTrack) runs automatically after upload
            </p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
            <p className="text-slate-400">
              Events, QSurfaces, SkillDNA, and clips are generated and stored
            </p>
          </div>
        </div>

        {/* Processing Pipeline Preview */}
        <div className="mt-4 pt-4 border-t border-slate-800">
          <p className="text-xs text-slate-600 mb-2">Processing Pipeline:</p>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {['Upload', 'Detection', 'Tracking', 'Events', 'QSurfaces', 'SkillDNA', 'Clips'].map((step, i) => (
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
    </div>
  );
}
