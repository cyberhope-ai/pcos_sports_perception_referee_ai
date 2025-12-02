/**
 * Phase 12.9: Clip Editor Modal
 *
 * Modal for creating or trimming video clips with IN/OUT point selection.
 */

import { useState, useCallback, useEffect } from 'react';
import { X, Scissors, Check, RotateCcw } from 'lucide-react';
import { type GameClip } from '../../api/refquestVideoApi';
import { formatTimeFull } from '../../state/useVideoPlayerStore';

interface ClipEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (clipData: { startTime: number; endTime: number; label: string }) => void;
  mode: 'create' | 'trim';
  clip?: GameClip;
  currentTime?: number;
  duration: number;
}

export function ClipEditorModal({
  isOpen,
  onClose,
  onSave,
  mode,
  clip,
  currentTime = 0,
  duration,
}: ClipEditorModalProps) {
  // Default to 10 second clip around current time
  const defaultStart = Math.max(0, currentTime - 5);
  const defaultEnd = Math.min(duration, currentTime + 5);

  const [inPoint, setInPoint] = useState(clip?.start_time ?? defaultStart);
  const [outPoint, setOutPoint] = useState(clip?.end_time ?? defaultEnd);
  const [label, setLabel] = useState(clip?.label ?? '');
  const [isDragging, setIsDragging] = useState<'in' | 'out' | null>(null);

  // Reset state when clip changes
  useEffect(() => {
    if (clip) {
      setInPoint(clip.start_time);
      setOutPoint(clip.end_time);
      setLabel(clip.label);
    } else {
      setInPoint(defaultStart);
      setOutPoint(defaultEnd);
      setLabel('');
    }
  }, [clip, defaultStart, defaultEnd]);

  // Calculate positions for timeline handles
  const inPosition = (inPoint / duration) * 100;
  const outPosition = (outPoint / duration) * 100;
  const clipWidth = outPosition - inPosition;

  // Handle timeline click/drag
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const percentage = (e.clientX - rect.left) / rect.width;
      const time = percentage * duration;

      // Determine which handle is closer
      const distToIn = Math.abs(time - inPoint);
      const distToOut = Math.abs(time - outPoint);

      if (distToIn < distToOut) {
        setInPoint(Math.min(time, outPoint - 1));
      } else {
        setOutPoint(Math.max(time, inPoint + 1));
      }
    },
    [duration, inPoint, outPoint]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const time = percentage * duration;

      if (isDragging === 'in') {
        setInPoint(Math.min(time, outPoint - 1));
      } else {
        setOutPoint(Math.max(time, inPoint + 1));
      }
    },
    [isDragging, duration, inPoint, outPoint]
  );

  const handleSave = () => {
    if (!label.trim()) {
      return; // Require a label
    }
    onSave({
      startTime: inPoint,
      endTime: outPoint,
      label: label.trim(),
    });
  };

  const handleReset = () => {
    if (clip) {
      setInPoint(clip.start_time);
      setOutPoint(clip.end_time);
      setLabel(clip.label);
    } else {
      setInPoint(defaultStart);
      setOutPoint(defaultEnd);
      setLabel('');
    }
  };

  if (!isOpen) return null;

  const clipDuration = outPoint - inPoint;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Scissors className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-medium text-white">
              {mode === 'create' ? 'Create Clip' : 'Trim Clip'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Label Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Clip Label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Block/Charge Review"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Timeline Trim UI */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Trim Points
            </label>

            {/* Timeline Container */}
            <div
              className="relative h-12 bg-slate-800 rounded-lg cursor-crosshair"
              onClick={handleTimelineClick}
              onMouseMove={handleMouseMove}
              onMouseUp={() => setIsDragging(null)}
              onMouseLeave={() => setIsDragging(null)}
            >
              {/* Selected region */}
              <div
                className="absolute top-0 bottom-0 bg-cyan-500/30 border-x-2 border-cyan-400"
                style={{
                  left: `${inPosition}%`,
                  width: `${clipWidth}%`,
                }}
              />

              {/* IN handle */}
              <div
                className="absolute top-0 bottom-0 w-4 -ml-2 cursor-ew-resize group"
                style={{ left: `${inPosition}%` }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setIsDragging('in');
                }}
              >
                <div className="absolute inset-y-0 left-1/2 w-1 bg-cyan-400 group-hover:bg-cyan-300" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-6 bg-cyan-400 rounded-sm group-hover:bg-cyan-300" />
              </div>

              {/* OUT handle */}
              <div
                className="absolute top-0 bottom-0 w-4 -ml-2 cursor-ew-resize group"
                style={{ left: `${outPosition}%` }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setIsDragging('out');
                }}
              >
                <div className="absolute inset-y-0 left-1/2 w-1 bg-cyan-400 group-hover:bg-cyan-300" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-6 bg-cyan-400 rounded-sm group-hover:bg-cyan-300" />
              </div>

              {/* Time markers */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 py-1 text-[10px] text-slate-500 font-mono">
                <span>0:00</span>
                <span>{formatTimeFull(duration / 2)}</span>
                <span>{formatTimeFull(duration)}</span>
              </div>
            </div>

            {/* Time Display */}
            <div className="flex justify-between mt-3">
              <div className="text-center">
                <div className="text-xs text-slate-500 mb-1">IN Point</div>
                <div className="px-3 py-1.5 bg-slate-800 rounded text-sm font-mono text-cyan-400">
                  {formatTimeFull(inPoint)}
                </div>
              </div>

              <div className="text-center">
                <div className="text-xs text-slate-500 mb-1">Duration</div>
                <div className="px-3 py-1.5 bg-slate-800 rounded text-sm font-mono text-white">
                  {formatTimeFull(clipDuration)}
                </div>
              </div>

              <div className="text-center">
                <div className="text-xs text-slate-500 mb-1">OUT Point</div>
                <div className="px-3 py-1.5 bg-slate-800 rounded text-sm font-mono text-cyan-400">
                  {formatTimeFull(outPoint)}
                </div>
              </div>
            </div>
          </div>

          {/* Numeric Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                IN (seconds)
              </label>
              <input
                type="number"
                min={0}
                max={outPoint - 1}
                step={0.1}
                value={inPoint.toFixed(1)}
                onChange={(e) => setInPoint(Math.max(0, Math.min(parseFloat(e.target.value) || 0, outPoint - 1)))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                OUT (seconds)
              </label>
              <input
                type="number"
                min={inPoint + 1}
                max={duration}
                step={0.1}
                value={outPoint.toFixed(1)}
                onChange={(e) => setOutPoint(Math.min(duration, Math.max(parseFloat(e.target.value) || 0, inPoint + 1)))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700 bg-slate-800/50">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!label.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>{mode === 'create' ? 'Create Clip' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
