/**
 * Phase 12.5: Review Workspace
 *
 * Main game review interface with integrated video player, timeline, QSurface, and AI Assist
 * Enhanced with PCOS Event Bus integration
 */

import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { TopBarGameContext } from './TopBarGameContext';
import { DecisionPanel } from './DecisionPanel';
import { ActionHistoryPanel } from './ActionHistoryPanel';
import { VideoPlayer } from './VideoPlayer';
import { TimelineStrip, ClipList } from './TimelineStrip';
import { mockGames } from '../../mock/data';
import {
  fetchGameVideoURL,
  fetchTimelineEvents,
  fetchGameClips,
  type TimelineEvent,
  type GameClip,
  type VideoInfo,
} from '../../api/refquestVideoApi';
import { useVideoPlayerStore } from '../../state/useVideoPlayerStore';
import { Loader2, Film, List } from 'lucide-react';
import { emitPcosEvent, PCOS_EVENT_TYPES, HUMAN_ACTOR } from '../../pcos/pcosEventBus';

export function ReviewWorkspace() {
  const { gameId } = useParams<{ gameId: string }>();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<'qsurface' | 'ai' | 'details' | 'impact'>('qsurface');

  // API data state
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [clips, setClips] = useState<GameClip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showClipList, setShowClipList] = useState(false);

  // Get video player store for duration
  const { duration, setSelectedEventTimestamp } = useVideoPlayerStore();

  const game = mockGames.find(g => g.id === gameId);

  // Fetch video, timeline, and clips data
  useEffect(() => {
    if (!gameId) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [video, timeline, gameClips] = await Promise.all([
          fetchGameVideoURL(gameId),
          fetchTimelineEvents(gameId),
          fetchGameClips(gameId),
        ]);

        setVideoInfo(video);
        setTimelineEvents(timeline);
        setClips(gameClips);
      } catch (error) {
        console.error('[ReviewWorkspace] Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [gameId]);

  // Handle event selection from timeline
  const handleEventClick = (event: TimelineEvent) => {
    setSelectedEventId(event.id);
    setSelectedEventTimestamp(event.timestamp);

    // Emit PCOS event
    emitPcosEvent(
      PCOS_EVENT_TYPES.OFFICIATING.EVENT_SELECTED,
      {
        eventId: event.id,
        gameId,
        timestamp: event.timestamp,
        eventType: event.event_type,
        description: event.description,
      },
      HUMAN_ACTOR
    );
  };

  // Handle clip click
  const handleClipClick = (clipId: string, startTime: number) => {
    const clip = clips.find(c => c.id === clipId);
    if (clip) {
      setSelectedEventId(clip.event_id);
      setSelectedEventTimestamp(startTime);
    }
  };

  if (!game) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-500">Game not found</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
        <p className="text-slate-400">Loading game data...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top Bar with Game Context */}
      <TopBarGameContext game={game} />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Video + Timeline (60%) */}
        <div className="w-[60%] flex flex-col border-r border-slate-800">
          {/* Video Player */}
          <div className="flex-1 bg-black relative">
            <VideoPlayer
              videoUrl={videoInfo?.url}
              onTimeUpdate={(time) => {
                // Find nearest event for potential auto-selection
                const nearestEvent = timelineEvents.find(
                  e => Math.abs(e.timestamp - time) < 0.5
                );
                if (nearestEvent && nearestEvent.id !== selectedEventId) {
                  // Optional: Auto-highlight near events
                }
              }}
            />

            {/* Clip List Toggle */}
            <button
              onClick={() => setShowClipList(!showClipList)}
              className={`absolute top-4 right-4 p-2 rounded-lg transition-colors z-10 ${
                showClipList ? 'bg-cyan-500 text-white' : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
              title="Toggle clip list"
            >
              <List className="w-5 h-5" />
            </button>

            {/* Floating Clip List */}
            {showClipList && clips.length > 0 && (
              <div className="absolute top-14 right-4 w-64 max-h-[60%] overflow-y-auto bg-slate-900/95 border border-slate-700 rounded-lg p-3 z-10">
                <ClipList
                  clips={clips}
                  onClipClick={handleClipClick}
                />
              </div>
            )}
          </div>

          {/* Timeline Strip */}
          <div className="h-28 border-t border-slate-800 bg-slate-900">
            <TimelineStrip
              events={timelineEvents}
              duration={videoInfo?.duration || duration || 2880}
              onEventClick={handleEventClick}
            />
          </div>
        </div>

        {/* Right Panel: Decision Panel + History (40%) */}
        <div className="w-[40%] flex flex-col">
          {/* Decision Panel */}
          <div className="flex-1 overflow-auto">
            <DecisionPanel
              eventId={selectedEventId}
              event={timelineEvents.find(e => e.id === selectedEventId)}
              currentTab={currentTab}
              onTabChange={setCurrentTab}
            />
          </div>

          {/* Action History */}
          <div className="h-48 border-t border-slate-800">
            <ActionHistoryPanel gameId={gameId || ''} />
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-8 border-t border-slate-800 bg-slate-900/50 px-4 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Film className="w-3 h-3" />
            {videoInfo ? `${videoInfo.width}x${videoInfo.height} @ ${videoInfo.fps}fps` : 'No video'}
          </span>
          <span>{timelineEvents.length} events</span>
          <span>{clips.length} clips</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Game: {game.id}</span>
          <span className="text-cyan-400">Phase 12.5 PCOS Event Bus</span>
        </div>
      </div>
    </div>
  );
}
