/**
 * Phase 12.9: Clip Gallery Panel
 *
 * Displays a list of video clips with thumbnails, labels, and time info.
 * Supports clip selection and deletion.
 */

import { useState } from 'react';
import { Play, Trash2, Clock, Scissors, Image } from 'lucide-react';
import { type GameClip } from '../../api/refquestVideoApi';
import { formatTimeFull } from '../../state/useVideoPlayerStore';

interface ClipGalleryPanelProps {
  clips: GameClip[];
  activeClipId?: string;
  onClipSelect: (clipId: string, startTime: number) => void;
  onClipDelete?: (clipId: string) => void;
  onClipTrim?: (clipId: string) => void;
}

export function ClipGalleryPanel({
  clips,
  activeClipId,
  onClipSelect,
  onClipDelete,
  onClipTrim,
}: ClipGalleryPanelProps) {
  const [hoveredClipId, setHoveredClipId] = useState<string | null>(null);

  if (clips.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-slate-500">
        <Scissors className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-sm">No clips available</p>
        <p className="text-xs text-slate-600 mt-1">
          Clips will appear here when created
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700">
        <h3 className="text-sm font-medium text-slate-300">
          Clip Gallery ({clips.length})
        </h3>
      </div>

      {/* Clip List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {clips.map((clip) => {
          const isActive = clip.id === activeClipId;
          const isHovered = clip.id === hoveredClipId;
          const duration = clip.end_time - clip.start_time;

          return (
            <div
              key={clip.id}
              className={`group relative rounded-lg overflow-hidden cursor-pointer transition-all ${
                isActive
                  ? 'ring-2 ring-cyan-500 bg-slate-800'
                  : 'bg-slate-800/50 hover:bg-slate-800'
              }`}
              onClick={() => onClipSelect(clip.id, clip.start_time)}
              onMouseEnter={() => setHoveredClipId(clip.id)}
              onMouseLeave={() => setHoveredClipId(null)}
            >
              <div className="flex">
                {/* Thumbnail Area */}
                <div className="w-24 h-16 bg-slate-900 flex-shrink-0 relative">
                  {clip.thumbnail_url ? (
                    <img
                      src={clip.thumbnail_url}
                      alt={clip.label}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="w-6 h-6 text-slate-600" />
                    </div>
                  )}

                  {/* Play overlay on hover */}
                  {(isHovered || isActive) && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Play
                        className={`w-6 h-6 ${
                          isActive ? 'text-cyan-400' : 'text-white'
                        }`}
                        fill={isActive ? 'currentColor' : 'none'}
                      />
                    </div>
                  )}

                  {/* Duration badge */}
                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 rounded text-[10px] text-white font-mono">
                    {formatTimeFull(duration)}
                  </div>
                </div>

                {/* Clip Info */}
                <div className="flex-1 p-2 min-w-0">
                  <div
                    className={`text-sm font-medium truncate ${
                      isActive ? 'text-cyan-400' : 'text-slate-200'
                    }`}
                  >
                    {clip.label}
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>
                      {formatTimeFull(clip.start_time)} -{' '}
                      {formatTimeFull(clip.end_time)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons (visible on hover) */}
              {(isHovered || isActive) && (onClipDelete || onClipTrim) && (
                <div className="absolute top-1 right-1 flex gap-1">
                  {onClipTrim && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClipTrim(clip.id);
                      }}
                      className="p-1 rounded bg-slate-700/90 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
                      title="Trim clip"
                    >
                      <Scissors className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onClipDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClipDelete(clip.id);
                      }}
                      className="p-1 rounded bg-slate-700/90 hover:bg-red-600 text-slate-300 hover:text-white transition-colors"
                      title="Delete clip"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
