/**
 * Phase 12.5: Consensus Panel
 *
 * Displays committee consensus results with confidence visualization,
 * persona vote breakdown, dissent notes, and governance action buttons
 * Enhanced with PCOS Event Bus integration
 */

import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Send,
  AlertOctagon,
  BookOpen,
  Loader2,
  Info,
} from 'lucide-react';
import type { ConsensusResult, PersonaRole, CommitteeAction } from '../../api/refquestCommitteeApi';
import { getPersonaConfig } from '../../api/refquestCommitteeApi';
import { emitPcosEvent, PCOS_EVENT_TYPES, HUMAN_ACTOR, SYSTEM_ACTOR } from '../../pcos/pcosEventBus';

interface ConsensusPanelProps {
  consensus: ConsensusResult | null;
  loading: boolean;
  eventId: string;
  committeeId: string;
  actionInProgress: boolean;
  onFinalizeRuling: (action: CommitteeAction) => void;
  onComputeConsensus: () => void;
}

export function ConsensusPanel({
  consensus,
  loading,
  eventId,
  committeeId,
  actionInProgress,
  onFinalizeRuling,
  onComputeConsensus,
}: ConsensusPanelProps) {
  // Handler for computing consensus - declared early to allow use before main render
  const handleComputeConsensus = () => {
    // Emit PCOS event for consensus computation
    emitPcosEvent(
      PCOS_EVENT_TYPES.COMMITTEE.CONSENSUS_COMPUTED,
      {
        eventId,
        committeeId,
        action: 'compute_consensus',
      },
      SYSTEM_ACTOR
    );
    onComputeConsensus();
  };

  // Handler for governance actions
  const handleAction = (actionType: 'send_to_referee' | 'escalate_to_league' | 'create_teaching_package') => {
    const action: CommitteeAction = {
      type: actionType,
      committeeId,
      eventId,
      recommendation: consensus!.recommendation,
      notes: consensus!.finalReasoning,
    };

    // Emit PCOS event for committee action
    emitPcosEvent(
      PCOS_EVENT_TYPES.COMMITTEE.ACTION_TAKEN,
      {
        actionType,
        committeeId,
        eventId,
        recommendation: consensus!.recommendation,
        confidence: consensus!.confidence,
        unanimity: consensus!.unanimity,
      },
      HUMAN_ACTOR
    );

    onFinalizeRuling(action);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <span className="text-sm text-slate-400">Computing consensus...</span>
        </div>
      </div>
    );
  }

  if (!consensus) {
    return (
      <div className="p-6">
        <div className="text-center">
          <Users className="w-12 h-12 mx-auto mb-3 text-slate-500 opacity-50" />
          <h3 className="text-lg font-semibold text-white mb-2">Consensus Not Available</h3>
          <p className="text-sm text-slate-400 mb-4">
            Complete Round 3 deliberations to compute consensus
          </p>
          <button
            onClick={handleComputeConsensus}
            className="px-4 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 rounded-lg hover:bg-cyan-500/30 transition-colors"
          >
            Compute Consensus
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Main Recommendation */}
      <RecommendationCard
        recommendation={consensus.recommendation}
        confidence={consensus.confidence}
        unanimity={consensus.unanimity >= 0.9}
      />

      {/* Persona Votes Breakdown */}
      <VotesBreakdown votes={consensus.personaVotes} />

      {/* Dissent Notes (if any) */}
      {consensus.dissentNotes.length > 0 && (
        <DissentSection notes={consensus.dissentNotes} />
      )}

      {/* Final Reasoning */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400" />
          Final Reasoning
        </h4>
        <p className="text-sm text-slate-300">{consensus.finalReasoning}</p>
      </div>

      {/* Suggested Actions */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-white mb-2">Suggested Actions</h4>
        <ul className="space-y-1">
          {consensus.suggestedActions.map((action, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              {action}
            </li>
          ))}
        </ul>
      </div>

      {/* Governance Actions */}
      <GovernanceActions
        disabled={actionInProgress}
        onSendToReferee={() => handleAction('send_to_referee')}
        onEscalate={() => handleAction('escalate_to_league')}
        onCreateTeaching={() => handleAction('create_teaching_package')}
      />
    </div>
  );
}

// Recommendation Card with confidence ring
function RecommendationCard({
  recommendation,
  confidence,
  unanimity,
}: {
  recommendation: 'uphold' | 'overturn';
  confidence: number;
  unanimity: boolean;
}) {
  const isUphold = recommendation === 'uphold';
  const confidencePercent = Math.round(confidence * 100);

  return (
    <div
      className={`rounded-xl p-6 ${
        isUphold ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Confidence Ring */}
        <div className="relative w-20 h-20">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-slate-700"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${confidencePercent * 2.51} 251`}
              className={isUphold ? 'text-green-500' : 'text-red-500'}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-lg font-bold ${isUphold ? 'text-green-400' : 'text-red-400'}`}>
              {confidencePercent}%
            </span>
          </div>
        </div>

        {/* Recommendation Details */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {isUphold ? (
              <CheckCircle2 className="w-6 h-6 text-green-400" />
            ) : (
              <XCircle className="w-6 h-6 text-red-400" />
            )}
            <h3 className={`text-xl font-bold ${isUphold ? 'text-green-400' : 'text-red-400'}`}>
              {isUphold ? 'UPHOLD' : 'OVERTURN'}
            </h3>
          </div>
          <p className="text-sm text-slate-400">
            Committee recommends to {recommendation} the original call
          </p>
          {unanimity && (
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium">
              <Users className="w-3 h-3" />
              Unanimous Decision
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Votes Breakdown
function VotesBreakdown({
  votes,
}: {
  votes: Record<PersonaRole, 'uphold' | 'overturn' | 'abstain'>;
}) {
  const personas: PersonaRole[] = ['strict_judge', 'flow_advocate', 'safety_guardian', 'league_rep'];

  return (
    <div className="bg-slate-800/50 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <Users className="w-4 h-4 text-cyan-400" />
        Persona Votes
      </h4>
      <div className="grid grid-cols-2 gap-3">
        {personas.map((personaId) => {
          const persona = getPersonaConfig(personaId);
          const vote = votes[personaId];

          return (
            <div
              key={personaId}
              className="flex items-center gap-2 p-2 bg-slate-900/50 rounded-lg"
            >
              <span className="text-lg">{persona.icon}</span>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-slate-400 truncate block">{persona.name}</span>
              </div>
              <VoteBadge vote={vote} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VoteBadge({ vote }: { vote: 'uphold' | 'overturn' | 'abstain' }) {
  const styles = {
    uphold: { bg: 'bg-green-500/20', text: 'text-green-400', icon: <ThumbsUp className="w-3 h-3" /> },
    overturn: { bg: 'bg-red-500/20', text: 'text-red-400', icon: <ThumbsDown className="w-3 h-3" /> },
    abstain: { bg: 'bg-slate-500/20', text: 'text-slate-400', icon: <Minus className="w-3 h-3" /> },
  };

  const style = styles[vote];

  return (
    <span className={`p-1 rounded ${style.bg} ${style.text}`} title={vote}>
      {style.icon}
    </span>
  );
}

// Dissent Section
function DissentSection({
  notes,
}: {
  notes: Array<{ personaId: PersonaRole; reason: string }>;
}) {
  return (
    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        Dissenting Opinions
      </h4>
      <div className="space-y-2">
        {notes.map((note, i) => {
          const persona = getPersonaConfig(note.personaId);
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="text-sm">{persona.icon}</span>
              <div>
                <span className="text-xs text-yellow-400 font-medium">{persona.name}:</span>
                <p className="text-xs text-slate-300 mt-0.5">{note.reason}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Governance Actions
function GovernanceActions({
  disabled,
  onSendToReferee,
  onEscalate,
  onCreateTeaching,
}: {
  disabled: boolean;
  onSendToReferee: () => void;
  onEscalate: () => void;
  onCreateTeaching: () => void;
}) {
  return (
    <div className="border-t border-slate-800 pt-4 mt-4">
      <h4 className="text-sm font-semibold text-white mb-3">Governance Actions</h4>
      <div className="grid grid-cols-1 gap-2">
        <ActionButton
          onClick={onSendToReferee}
          disabled={disabled}
          icon={<Send className="w-4 h-4" />}
          label="Send to Referee"
          description="Notify referee of committee recommendation"
          variant="primary"
        />
        <ActionButton
          onClick={onEscalate}
          disabled={disabled}
          icon={<AlertOctagon className="w-4 h-4" />}
          label="Escalate to League"
          description="Send for league office review"
          variant="warning"
        />
        <ActionButton
          onClick={onCreateTeaching}
          disabled={disabled}
          icon={<BookOpen className="w-4 h-4" />}
          label="Create Teaching Package"
          description="Generate training material from this case"
          variant="info"
        />
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  icon,
  label,
  description,
  variant,
}: {
  onClick: () => void;
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
  description: string;
  variant: 'primary' | 'warning' | 'info';
}) {
  const variantStyles = {
    primary: 'bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-400',
    warning: 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20 text-orange-400',
    info: 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20 text-purple-400',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-3 p-3 border rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]}`}
    >
      {disabled ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      <div className="text-left">
        <span className="text-sm font-medium">{label}</span>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </button>
  );
}

// Standalone Consensus Summary (for use in other views)
export function ConsensusSummary({
  consensus,
  compact = false,
}: {
  consensus: ConsensusResult;
  compact?: boolean;
}) {
  const isUphold = consensus.recommendation === 'uphold';
  const confidencePercent = Math.round(consensus.confidence * 100);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {isUphold ? (
          <CheckCircle2 className="w-4 h-4 text-green-400" />
        ) : (
          <XCircle className="w-4 h-4 text-red-400" />
        )}
        <span className={`text-sm font-medium ${isUphold ? 'text-green-400' : 'text-red-400'}`}>
          {consensus.recommendation.toUpperCase()}
        </span>
        <span className="text-xs text-slate-500">({confidencePercent}%)</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg ${
        isUphold ? 'bg-green-500/10' : 'bg-red-500/10'
      }`}
    >
      {isUphold ? (
        <CheckCircle2 className="w-6 h-6 text-green-400" />
      ) : (
        <XCircle className="w-6 h-6 text-red-400" />
      )}
      <div className="flex-1">
        <span className={`font-semibold ${isUphold ? 'text-green-400' : 'text-red-400'}`}>
          {consensus.recommendation.toUpperCase()}
        </span>
        <span className="text-sm text-slate-400 ml-2">with {confidencePercent}% confidence</span>
      </div>
      {consensus.unanimity && (
        <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">
          Unanimous
        </span>
      )}
    </div>
  );
}
