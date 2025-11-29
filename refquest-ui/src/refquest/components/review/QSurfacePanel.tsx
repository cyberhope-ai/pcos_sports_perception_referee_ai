/**
 * Phase 12.2: QSurface Panel
 *
 * Displays multi-perspective analysis from Referee, Coach, Player, and League viewpoints
 * with expandable reasoning accordions and score visualizations
 */

import { ChevronDown, ChevronUp, BookOpen, AlertTriangle } from 'lucide-react';
import type { QSurfaceData, QSurfacePerspective } from '../../api/refquestQSurfaceApi';

interface QSurfacePanelProps {
  data: QSurfaceData | null;
  loading: boolean;
  error: string | null;
  expandedPerspectives: Set<string>;
  onToggleExpand: (persona: string) => void;
}

const PERSONA_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  referee: { label: 'Referee View', icon: '🎯', color: 'cyan' },
  coach: { label: 'Coach View', icon: '📋', color: 'orange' },
  player: { label: 'Player View', icon: '🏀', color: 'purple' },
  league: { label: 'League View', icon: '🏛️', color: 'green' },
};

export function QSurfacePanel({
  data,
  loading,
  error,
  expandedPerspectives,
  onToggleExpand,
}: QSurfacePanelProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-400">Loading QSurface analysis...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center text-red-400">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-sm text-slate-500">Select an event to view QSurface analysis</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Consensus Header */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-white">Multi-Perspective Consensus</h4>
          <DivergenceBadge level={data.divergenceLevel} />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-green-500 rounded-full transition-all"
              style={{ width: `${data.consensusScore * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium text-cyan-400">
            {(data.consensusScore * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Perspective Cards */}
      <div className="space-y-3">
        {(['referee', 'coach', 'player', 'league'] as const).map((persona) => (
          <PerspectiveCard
            key={persona}
            persona={persona}
            perspective={data.perspectives[persona]}
            isExpanded={expandedPerspectives.has(persona)}
            onToggle={() => onToggleExpand(persona)}
          />
        ))}
      </div>
    </div>
  );
}

function DivergenceBadge({ level }: { level: 'low' | 'medium' | 'high' }) {
  const styles = {
    low: 'bg-green-500/20 text-green-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    high: 'bg-red-500/20 text-red-400',
  };

  const labels = {
    low: 'Low Divergence',
    medium: 'Medium Divergence',
    high: 'High Divergence',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[level]}`}>
      {labels[level]}
    </span>
  );
}

interface PerspectiveCardProps {
  persona: 'referee' | 'coach' | 'player' | 'league';
  perspective: QSurfacePerspective;
  isExpanded: boolean;
  onToggle: () => void;
}

function PerspectiveCard({ persona, perspective, isExpanded, onToggle }: PerspectiveCardProps) {
  const config = PERSONA_LABELS[persona];
  const scoreColor = getScoreColor(perspective.score);

  return (
    <div className="bg-slate-800/50 rounded-lg overflow-hidden">
      {/* Card Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{config.icon}</span>
          <div className="text-left">
            <p className="text-sm font-medium text-white">{config.label}</p>
            <p className="text-xs text-slate-400">{perspective.recommendation}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Score Badge */}
          <div className={`px-2 py-1 rounded text-sm font-bold ${scoreColor}`}>
            {(perspective.score * 100).toFixed(0)}
          </div>
          {/* Confidence indicator */}
          <div className="flex items-center gap-1">
            <div className="w-12 h-1.5 bg-slate-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-400 rounded-full"
                style={{ width: `${perspective.confidence * 100}%` }}
              />
            </div>
          </div>
          {/* Expand icon */}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-700/50">
          {/* Reasoning Chain */}
          <div className="mt-3">
            <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Reasoning Chain
            </h5>
            <ul className="space-y-2">
              {perspective.reasoning.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-cyan-400 mt-0.5">•</span>
                  {reason}
                </li>
              ))}
            </ul>
          </div>

          {/* Key Factors */}
          <div className="mt-4">
            <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Key Factors
            </h5>
            <div className="flex flex-wrap gap-2">
              {perspective.keyFactors.map((factor, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-slate-700/50 text-slate-300 rounded text-xs"
                >
                  {factor}
                </span>
              ))}
            </div>
          </div>

          {/* Rule References */}
          <div className="mt-4">
            <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              Rule References
            </h5>
            <div className="space-y-1">
              {perspective.ruleReferences.map((rule, idx) => (
                <p key={idx} className="text-xs text-cyan-400/80 font-mono">
                  {rule}
                </p>
              ))}
            </div>
          </div>

          {/* Dissent (if present) */}
          {perspective.dissent && (
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-yellow-400 mb-1">Dissenting View</p>
                  <p className="text-xs text-slate-300">{perspective.dissent}</p>
                </div>
              </div>
            </div>
          )}

          {/* Confidence Details */}
          <div className="mt-4 pt-3 border-t border-slate-700/50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Confidence Level</span>
              <span className={`font-medium ${perspective.confidence >= 0.8 ? 'text-green-400' : perspective.confidence >= 0.6 ? 'text-yellow-400' : 'text-red-400'}`}>
                {(perspective.confidence * 100).toFixed(0)}% Confident
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getScoreColor(score: number): string {
  if (score >= 0.8) return 'bg-green-500/20 text-green-400';
  if (score >= 0.6) return 'bg-yellow-500/20 text-yellow-400';
  return 'bg-red-500/20 text-red-400';
}
