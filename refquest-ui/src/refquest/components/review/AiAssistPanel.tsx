/**
 * Phase 12.5: AI Assist Panel
 *
 * Displays AI recommendation with confidence, factors, alternatives,
 * rule references, and action buttons for referee decision workflow
 * Enhanced with PCOS Event Bus integration
 */

import { useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Users, AlertTriangle, BookOpen, TrendingUp, TrendingDown, Minus, Scale } from 'lucide-react';
import type { AiAssistData } from '../../api/refquestQSurfaceApi';
import { emitPcosEvent, PCOS_EVENT_TYPES, HUMAN_ACTOR, aiActor } from '../../pcos/pcosEventBus';

interface AiAssistPanelProps {
  data: AiAssistData | null;
  loading: boolean;
  error: string | null;
  selectedAction: 'accept' | 'override' | 'committee' | null;
  onAccept: () => void;
  onOverride: (newCall: string) => void;
  onSendToCommittee: () => void;
}

export function AiAssistPanel({
  data,
  loading,
  error,
  selectedAction,
  onAccept,
  onOverride,
  onSendToCommittee,
}: AiAssistPanelProps) {
  // Track previous data to emit events only on new data
  const prevDataRef = useRef<AiAssistData | null>(null);

  // Emit AI analysis received event when data changes
  useEffect(() => {
    if (data && data !== prevDataRef.current) {
      emitPcosEvent(
        PCOS_EVENT_TYPES.AI.ANALYSIS_RECEIVED,
        {
          recommendedCall: data.recommendedCall,
          confidence: data.confidence,
          riskLevel: data.riskLevel,
          callCategory: data.callCategory,
          committeeRecommended: data.committeeRecommended,
          personaCount: data.personaBreakdown.length,
        },
        aiActor('ai_assist')
      );
      prevDataRef.current = data;
    }
  }, [data]);

  // Wrapped handlers with event emission
  const handleAccept = () => {
    emitPcosEvent(
      PCOS_EVENT_TYPES.OFFICIATING.RULING_SUBMITTED,
      {
        action: 'accept',
        recommendedCall: data?.recommendedCall,
        confidence: data?.confidence,
      },
      HUMAN_ACTOR
    );
    onAccept();
  };

  const handleOverride = (newCall: string) => {
    emitPcosEvent(
      PCOS_EVENT_TYPES.OFFICIATING.RULING_SUBMITTED,
      {
        action: 'override',
        originalCall: data?.recommendedCall,
        newCall,
      },
      HUMAN_ACTOR
    );
    onOverride(newCall);
  };

  const handleSendToCommittee = () => {
    emitPcosEvent(
      PCOS_EVENT_TYPES.COMMITTEE.CREATED,
      {
        action: 'send_to_committee',
        recommendedCall: data?.recommendedCall,
        confidence: data?.confidence,
        riskLevel: data?.riskLevel,
      },
      HUMAN_ACTOR
    );
    onSendToCommittee();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-400">Analyzing event...</span>
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
        <p className="text-sm text-slate-500">Select an event to view AI analysis</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Primary Recommendation */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-green-500/10 border border-cyan-500/30 rounded-lg p-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-6 h-6 text-green-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-white">{data.recommendedCall}</h3>
              <span className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-xs">
                {data.callCategory}
              </span>
            </div>
            <p className="text-sm text-slate-300">{data.advisorySummary}</p>

            {/* Confidence & Risk */}
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Confidence:</span>
                <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${getConfidenceColor(data.confidence)}`}
                    style={{ width: `${data.confidence * 100}%` }}
                  />
                </div>
                <span className={`text-sm font-medium ${getConfidenceTextColor(data.confidence)}`}>
                  {(data.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <RiskBadge level={data.riskLevel} />
            </div>
          </div>
        </div>
      </div>

      {/* Decision Factors */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Scale className="w-4 h-4 text-cyan-400" />
          Decision Factors
        </h4>
        <div className="space-y-2">
          {data.factors.map((factor, idx) => (
            <FactorRow key={idx} factor={factor} />
          ))}
        </div>
      </div>

      {/* Alternative Calls */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-white mb-3">Alternative Calls</h4>
        <div className="space-y-2">
          {data.alternativeCalls.map((alt, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 bg-slate-700/30 rounded hover:bg-slate-700/50 transition-colors cursor-pointer"
              onClick={() => handleOverride(alt.callType)}
            >
              <div>
                <p className="text-sm text-slate-300">{alt.callType}</p>
                <p className="text-xs text-slate-500">{alt.reasoning}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  {(alt.probability * 100).toFixed(0)}%
                </span>
                <div className="w-16 h-1.5 bg-slate-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500/60 rounded-full"
                    style={{ width: `${alt.probability * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rule References */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-cyan-400" />
          Rule References
        </h4>
        <div className="space-y-2">
          {data.ruleReferences.map((ref, idx) => (
            <div key={idx} className="p-2 bg-slate-700/30 rounded">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-cyan-400">{ref.rule}</span>
                <span className="text-xs text-slate-500">|</span>
                <span className="text-xs text-slate-400">{ref.section}</span>
              </div>
              <p className="text-xs text-slate-500">{ref.relevance}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Persona Breakdown */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-white mb-3">Persona Analysis</h4>
        <div className="grid grid-cols-2 gap-2">
          {data.personaBreakdown.map((persona, idx) => (
            <div key={idx} className="p-2 bg-slate-700/30 rounded">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-300">{persona.persona}</span>
                <span className={`text-xs font-medium ${getScoreTextColor(persona.score)}`}>
                  {(persona.score * 100).toFixed(0)}
                </span>
              </div>
              <p className="text-xs text-cyan-400">{persona.stance}</p>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{persona.keyReason}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Committee Alert */}
      {data.committeeRecommended && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-400">Committee Review Recommended</p>
              <p className="text-xs text-slate-400 mt-1">
                This event has factors that suggest multi-agent deliberation would improve decision quality.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleAccept}
          disabled={selectedAction === 'accept'}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-colors ${
            selectedAction === 'accept'
              ? 'bg-green-500 text-white'
              : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          Accept Call
        </button>
        <button
          onClick={handleSendToCommittee}
          disabled={selectedAction === 'committee'}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-colors ${
            selectedAction === 'committee'
              ? 'bg-cyan-500 text-white'
              : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
          }`}
        >
          <Users className="w-4 h-4" />
          Committee
        </button>
        <button
          onClick={() => handleOverride('Manual Override')}
          disabled={selectedAction === 'override'}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-colors ${
            selectedAction === 'override'
              ? 'bg-orange-500 text-white'
              : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
          }`}
        >
          <XCircle className="w-4 h-4" />
          Override
        </button>
      </div>

      {/* Selection Confirmation */}
      {selectedAction && (
        <div className={`p-3 rounded-lg text-center text-sm ${
          selectedAction === 'accept' ? 'bg-green-500/20 text-green-400' :
          selectedAction === 'committee' ? 'bg-cyan-500/20 text-cyan-400' :
          'bg-orange-500/20 text-orange-400'
        }`}>
          {selectedAction === 'accept' && 'Recommendation accepted'}
          {selectedAction === 'committee' && 'Sent to committee for deliberation'}
          {selectedAction === 'override' && 'Call overridden - manual review'}
        </div>
      )}
    </div>
  );
}

function RiskBadge({ level }: { level: 'low' | 'medium' | 'high' }) {
  const styles = {
    low: 'bg-green-500/20 text-green-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    high: 'bg-red-500/20 text-red-400',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[level]}`}>
      {level.charAt(0).toUpperCase() + level.slice(1)} Risk
    </span>
  );
}

interface FactorRowProps {
  factor: {
    factor: string;
    weight: number;
    evidence: string;
    impact: 'supports' | 'opposes' | 'neutral';
  };
}

function FactorRow({ factor }: FactorRowProps) {
  const ImpactIcon = factor.impact === 'supports' ? TrendingUp :
                     factor.impact === 'opposes' ? TrendingDown : Minus;

  const impactColor = factor.impact === 'supports' ? 'text-green-400' :
                      factor.impact === 'opposes' ? 'text-red-400' : 'text-slate-400';

  return (
    <div className="flex items-center gap-3 p-2 bg-slate-700/30 rounded">
      <ImpactIcon className={`w-4 h-4 ${impactColor} flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-slate-300 truncate">{factor.factor}</span>
          <span className="text-xs text-slate-500">{(factor.weight * 100).toFixed(0)}%</span>
        </div>
        <p className="text-xs text-slate-500 truncate">{factor.evidence}</p>
      </div>
      <div className="w-12 h-1.5 bg-slate-600 rounded-full overflow-hidden flex-shrink-0">
        <div
          className={`h-full rounded-full ${
            factor.impact === 'supports' ? 'bg-green-500' :
            factor.impact === 'opposes' ? 'bg-red-500' : 'bg-slate-400'
          }`}
          style={{ width: `${factor.weight * 100}%` }}
        />
      </div>
    </div>
  );
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.85) return 'bg-green-500';
  if (confidence >= 0.7) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getConfidenceTextColor(confidence: number): string {
  if (confidence >= 0.85) return 'text-green-400';
  if (confidence >= 0.7) return 'text-yellow-400';
  return 'text-red-400';
}

function getScoreTextColor(score: number): string {
  if (score >= 0.8) return 'text-green-400';
  if (score >= 0.6) return 'text-yellow-400';
  return 'text-red-400';
}
