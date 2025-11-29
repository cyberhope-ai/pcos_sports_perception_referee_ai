/**
 * Phase 12.5: Skill Impact Panel
 *
 * Per-event skill impact display showing how a decision affects referee skills
 * and any TwinFlow disagreement between referee and AI Twin
 * Enhanced with PCOS Event Bus integration
 */

import { useEffect, useRef } from 'react';
import {
  Target,
  TrendingUp,
  TrendingDown,
  Zap,
  AlertTriangle,
  Loader2,
  Info,
  BookOpen,
} from 'lucide-react';
import { useSkillDNAStore } from '../../state/useSkillDNAStore';
import { emitPcosEvent, PCOS_EVENT_TYPES, SYSTEM_ACTOR } from '../../pcos/pcosEventBus';

interface SkillImpactPanelProps {
  eventId: string | null;
}

export function SkillImpactPanel({ eventId }: SkillImpactPanelProps) {
  const {
    eventImpact,
    loadingEventImpact,
    errorEventImpact,
    loadEventImpact,
    clearEventImpact,
  } = useSkillDNAStore();

  // Track previous impact to emit events only once
  const prevImpactRef = useRef<typeof eventImpact>(null);

  // Load impact when eventId changes
  useEffect(() => {
    if (eventId) {
      loadEventImpact(eventId);
    } else {
      clearEventImpact();
    }
  }, [eventId, loadEventImpact, clearEventImpact]);

  // Emit PCOS event when eventImpact is loaded
  useEffect(() => {
    if (eventImpact && eventImpact !== prevImpactRef.current) {
      emitPcosEvent(
        PCOS_EVENT_TYPES.SKILLDNA.IMPACT_CALCULATED,
        {
          eventId,
          summary: eventImpact.summary,
          impactCount: eventImpact.impacts.length,
          hasTwinDelta: !!eventImpact.twinDelta,
          twinDeltaSeverity: eventImpact.twinDelta?.severity,
          hasCoachingNote: !!eventImpact.coachingNote,
        },
        SYSTEM_ACTOR
      );
      prevImpactRef.current = eventImpact;
    }
  }, [eventImpact, eventId]);

  if (!eventId) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center text-slate-500">
          <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Select an event to view skill impact</p>
        </div>
      </div>
    );
  }

  if (loadingEventImpact) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <span className="text-sm text-slate-400">Analyzing skill impact...</span>
        </div>
      </div>
    );
  }

  if (errorEventImpact) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center text-red-400">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">{errorEventImpact}</p>
        </div>
      </div>
    );
  }

  if (!eventImpact) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-sm text-slate-500">No impact data available</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Summary */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Impact Summary</h4>
            <p className="text-sm text-slate-300">{eventImpact.summary}</p>
          </div>
        </div>
      </div>

      {/* Skill Impacts */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-cyan-400" />
          Skill Impacts
        </h4>
        <div className="space-y-3">
          {eventImpact.impacts.map((impact) => (
            <SkillImpactRow key={impact.key} impact={impact} />
          ))}
        </div>
      </div>

      {/* TwinFlow Delta */}
      {eventImpact.twinDelta && (
        <div className={`rounded-lg p-4 ${getSeverityStyle(eventImpact.twinDelta.severity)}`}>
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            TwinFlow Disagreement
          </h4>
          <div className="space-y-3">
            {/* Decision Comparison */}
            <div className="flex items-center gap-4">
              <div className="flex-1 text-center">
                <p className="text-xs text-slate-400 mb-1">Referee Called</p>
                <p className="text-sm font-medium text-white bg-slate-700/50 rounded py-1 px-2">
                  {eventImpact.twinDelta.refDecision}
                </p>
              </div>
              <div className="text-slate-500 text-xs">vs</div>
              <div className="flex-1 text-center">
                <p className="text-xs text-slate-400 mb-1">AI Twin Says</p>
                <p className="text-sm font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 rounded py-1 px-2">
                  {eventImpact.twinDelta.twinDecision}
                </p>
              </div>
            </div>

            {/* Severity Badge */}
            <div className="flex items-center justify-between">
              <SeverityBadge severity={eventImpact.twinDelta.severity} />
              <span className="text-xs text-slate-400">
                {(eventImpact.twinDelta.confidence * 100).toFixed(0)}% confidence
              </span>
            </div>

            {/* Note */}
            {eventImpact.twinDelta.note && (
              <p className="text-xs text-slate-300 italic border-l-2 border-slate-600 pl-3">
                {eventImpact.twinDelta.note}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Coaching Note */}
      {eventImpact.coachingNote && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Coaching Note
          </h4>
          <p className="text-sm text-slate-300">{eventImpact.coachingNote}</p>
        </div>
      )}
    </div>
  );
}

interface SkillImpactRowProps {
  impact: {
    key: string;
    label: string;
    delta: number;
    importance: 'low' | 'medium' | 'high';
  };
}

function SkillImpactRow({ impact }: SkillImpactRowProps) {
  const isPositive = impact.delta >= 0;
  const deltaPercent = (impact.delta * 100).toFixed(1);

  const importanceStyles = {
    low: 'bg-slate-600',
    medium: 'bg-yellow-500',
    high: 'bg-cyan-500',
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${importanceStyles[impact.importance]}`} />
        <span className="text-sm text-slate-300">{impact.label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {isPositive ? '+' : ''}{deltaPercent}%
        </span>
        {isPositive ? (
          <TrendingUp className="w-4 h-4 text-green-400" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-400" />
        )}
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: 'minor' | 'moderate' | 'major' }) {
  const styles = {
    minor: 'bg-green-500/20 text-green-400',
    moderate: 'bg-yellow-500/20 text-yellow-400',
    major: 'bg-red-500/20 text-red-400',
  };

  const labels = {
    minor: 'Minor Difference',
    moderate: 'Moderate Divergence',
    major: 'Major Disagreement',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[severity]}`}>
      {labels[severity]}
    </span>
  );
}

function getSeverityStyle(severity: 'minor' | 'moderate' | 'major'): string {
  const styles = {
    minor: 'bg-green-500/10 border border-green-500/30',
    moderate: 'bg-yellow-500/10 border border-yellow-500/30',
    major: 'bg-red-500/10 border border-red-500/30',
  };
  return styles[severity];
}
