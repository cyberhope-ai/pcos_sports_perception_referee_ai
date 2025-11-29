/**
 * Phase 12.3: Decision Panel
 *
 * Right panel with tabs for QSurface perspectives, AI Assist analysis,
 * Call Details, and Skill Impact - integrated with event reasoning store
 * and SkillDNA store for per-event skill impact
 */

import { useEffect } from 'react';
import { FileText, Brain, TrendingUp, Layers, Clock } from 'lucide-react';
import type { TimelineEvent } from '../../api/refquestVideoApi';
import { formatTime } from '../../state/useVideoPlayerStore';
import { useEventReasoningStore } from '../../state/useEventReasoningStore';
import { QSurfacePanel } from './QSurfacePanel';
import { AiAssistPanel } from './AiAssistPanel';
import { SkillImpactPanel } from './SkillImpactPanel';

interface DecisionPanelProps {
  eventId: string | null;
  event?: TimelineEvent;
  currentTab: 'qsurface' | 'ai' | 'details' | 'impact';
  onTabChange: (tab: 'qsurface' | 'ai' | 'details' | 'impact') => void;
}

export function DecisionPanel({ eventId, event, currentTab, onTabChange }: DecisionPanelProps) {
  // Get store state and actions
  const {
    qsurfaces,
    qsurfacesLoading,
    qsurfacesError,
    aiAssist,
    aiAssistLoading,
    aiAssistError,
    expandedPerspectives,
    selectedAction,
    loadEventReasoning,
    clearEventReasoning,
    togglePerspectiveExpand,
    acceptRecommendation,
    overrideCall,
    sendToCommittee,
  } = useEventReasoningStore();

  // Load reasoning data when event changes
  useEffect(() => {
    if (eventId) {
      loadEventReasoning(eventId);
    } else {
      clearEventReasoning();
    }
  }, [eventId, loadEventReasoning, clearEventReasoning]);

  if (!eventId) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center text-slate-500">
          <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Select an event from the timeline</p>
          <p className="text-sm mt-1">to view QSurface & AI analysis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Event Header */}
      {event && (
        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between mb-2">
            <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs font-medium capitalize">
              {event.event_type.replace('_', ' ')}
            </span>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock className="w-3 h-3" />
              <span>{formatTime(event.timestamp)}</span>
              <span>Q{event.quarter}</span>
            </div>
          </div>
          <p className="text-sm text-slate-300">{event.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-slate-500">Detection Confidence:</span>
            <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden max-w-[100px]">
              <div
                className="h-full bg-green-500 rounded-full"
                style={{ width: `${event.confidence * 100}%` }}
              />
            </div>
            <span className="text-xs text-green-400">{(event.confidence * 100).toFixed(0)}%</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <TabButton
          active={currentTab === 'qsurface'}
          onClick={() => onTabChange('qsurface')}
          icon={<Layers className="w-4 h-4" />}
          label="QSurface"
        />
        <TabButton
          active={currentTab === 'ai'}
          onClick={() => onTabChange('ai')}
          icon={<Brain className="w-4 h-4" />}
          label="AI Assist"
        />
        <TabButton
          active={currentTab === 'details'}
          onClick={() => onTabChange('details')}
          icon={<FileText className="w-4 h-4" />}
          label="Details"
        />
        <TabButton
          active={currentTab === 'impact'}
          onClick={() => onTabChange('impact')}
          icon={<TrendingUp className="w-4 h-4" />}
          label="Impact"
        />
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4">
        {currentTab === 'qsurface' && (
          <QSurfacePanel
            data={qsurfaces}
            loading={qsurfacesLoading}
            error={qsurfacesError}
            expandedPerspectives={expandedPerspectives}
            onToggleExpand={togglePerspectiveExpand}
          />
        )}
        {currentTab === 'ai' && (
          <AiAssistPanel
            data={aiAssist}
            loading={aiAssistLoading}
            error={aiAssistError}
            selectedAction={selectedAction}
            onAccept={acceptRecommendation}
            onOverride={overrideCall}
            onSendToCommittee={sendToCommittee}
          />
        )}
        {currentTab === 'details' && <CallDetailsTab event={event} />}
        {currentTab === 'impact' && <SkillImpactPanel eventId={eventId} />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 text-xs font-medium transition-colors ${
        active
          ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function CallDetailsTab({ event }: { event?: TimelineEvent }) {
  const eventType = event?.event_type || 'foul';
  const isBlockCharge = eventType === 'foul';

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-white mb-2">Event Type</h4>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-sm capitalize">
            {eventType.replace('_', ' ')}
          </span>
          {isBlockCharge && (
            <span className="text-slate-400 text-sm">Block/Charge</span>
          )}
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-white mb-2">Confidence</h4>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full"
              style={{ width: `${(event?.confidence || 0.85) * 100}%` }}
            />
          </div>
          <span className="text-green-400 text-sm font-medium">
            {((event?.confidence || 0.85) * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-white mb-2">Actors Involved</h4>
        <div className="space-y-2">
          {event?.players_involved?.map((player, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-slate-400">{player}</span>
              <span className="text-slate-500">{i === 0 ? 'Offensive' : 'Defensive'}</span>
            </div>
          )) || (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Player #23</span>
                <span className="text-slate-500">Offensive</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Player #7</span>
                <span className="text-slate-500">Defensive</span>
              </div>
            </>
          )}
        </div>
      </div>

      {event?.coordinates && (
        <div className="bg-slate-800/50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-white mb-2">Court Position</h4>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-400">X: {event.coordinates.x.toFixed(1)}</span>
            <span className="text-slate-400">Y: {event.coordinates.y.toFixed(1)}</span>
          </div>
        </div>
      )}

      <div className="bg-slate-800/50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-white mb-2">Rule Reference</h4>
        <p className="text-sm text-slate-400">
          Rule 12B, Section 1 - {eventType === 'foul' ? 'Block/Charge' : eventType.replace('_', ' ')}
        </p>
        <p className="text-xs text-slate-500 mt-2">
          {eventType === 'foul'
            ? 'A blocking foul is called when a defender does not establish position in time...'
            : `Official ruling for ${eventType.replace('_', ' ')} calls.`}
        </p>
      </div>
    </div>
  );
}

