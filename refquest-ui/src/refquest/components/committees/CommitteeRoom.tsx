/**
 * Phase 12.4: Committee Room
 *
 * Enhanced committee room with multi-agent governance system.
 * Shows 3-round debate, persona arguments, consensus building,
 * and governance actions.
 */

import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Clock,
  AlertCircle,
  Loader2,
  ExternalLink,
  Video,
} from 'lucide-react';
import { useCommitteeStore } from '../../state/useCommitteeStore';
import { CommitteeRoundsPanel } from './CommitteeRoundsPanel';
import { ConsensusPanel } from './ConsensusPanel';

export function CommitteeRoom() {
  const { committeeId } = useParams<{ committeeId: string }>();
  const navigate = useNavigate();

  // Get store state and actions
  const {
    conversation,
    loadingConversation,
    errorConversation,
    currentRound,
    roundArguments,
    loadingArguments,
    humanNotes,
    consensus,
    loadingConsensus,
    actionInProgress,
    expandedPersonas,
    selectedView,
    loadCommitteeData,
    nextRound,
    prevRound,
    goToRound,
    setHumanNote,
    computeConsensus,
    finalizeRuling,
    togglePersonaExpanded,
    setSelectedView,
    clearCommittee,
  } = useCommitteeStore();

  // Load committee data on mount
  useEffect(() => {
    if (committeeId) {
      loadCommitteeData(committeeId);
    }

    // Cleanup on unmount
    return () => {
      clearCommittee();
    };
  }, [committeeId, loadCommitteeData, clearCommittee]);

  // Loading state
  if (loadingConversation) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
          <span className="text-slate-400">Loading committee...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (errorConversation) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-12 h-12 text-red-400" />
          <p className="text-red-400">{errorConversation}</p>
          <button
            onClick={() => navigate('/refquest/committees')}
            className="mt-4 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Back to Committees
          </button>
        </div>
      </div>
    );
  }

  // Not found state
  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Committee not found</p>
          <button
            onClick={() => navigate('/refquest/committees')}
            className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Back to Committees
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Header */}
      <CommitteeHeader
        conversation={conversation}
        onBack={() => navigate('/refquest/committees')}
      />

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Rounds & Persona Arguments */}
        <div className="flex-1 border-r border-slate-800 overflow-hidden">
          <CommitteeRoundsPanel
            currentRound={currentRound}
            arguments={roundArguments}
            loading={loadingArguments}
            expandedPersonas={expandedPersonas}
            humanNotes={humanNotes}
            selectedView={selectedView}
            onPrevRound={prevRound}
            onNextRound={nextRound}
            onGoToRound={goToRound}
            onTogglePersona={togglePersonaExpanded}
            onSetHumanNote={setHumanNote}
            onSetView={setSelectedView}
          />
        </div>

        {/* Right Panel: Consensus & Actions */}
        <div className="w-96 overflow-y-auto bg-slate-900/30">
          <ConsensusPanel
            consensus={consensus}
            loading={loadingConsensus}
            eventId={conversation.eventId}
            committeeId={conversation.id}
            actionInProgress={actionInProgress}
            onFinalizeRuling={finalizeRuling}
            onComputeConsensus={computeConsensus}
          />
        </div>
      </div>
    </div>
  );
}

// Committee Header Component
interface CommitteeHeaderProps {
  conversation: {
    id: string;
    eventId: string;
    eventDescription: string;
    status: string;
    createdAt: string;
    currentRound: number;
  };
  onBack: () => void;
}

function CommitteeHeader({ conversation, onBack }: CommitteeHeaderProps) {
  const statusColors = {
    active: 'bg-green-500/20 text-green-400 border-green-500/30',
    deliberating: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    concluded: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    pending: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };

  const statusStyle = statusColors[conversation.status as keyof typeof statusColors] || statusColors.pending;

  return (
    <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50">
      <div className="flex items-center gap-4">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Committee Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-white">Committee Review</h1>
            <span className={`px-2 py-0.5 text-xs font-medium rounded border ${statusStyle}`}>
              {conversation.status}
            </span>
          </div>
          <p className="text-sm text-slate-400 line-clamp-1">
            {conversation.eventDescription}
          </p>
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-6">
          {/* Round Info */}
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Users className="w-4 h-4" />
            <span>Round {conversation.currentRound}/3</span>
          </div>

          {/* Timestamp */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="w-4 h-4" />
            <span>{formatDate(conversation.createdAt)}</span>
          </div>

          {/* View Event Link */}
          <Link
            to={`/refquest/game/demo/review?event=${conversation.eventId}`}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
          >
            <Video className="w-4 h-4" />
            View Event
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// Helper function to format date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
