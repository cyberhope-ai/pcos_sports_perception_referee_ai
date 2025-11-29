/**
 * Phase 12.4: Committee Rounds Panel
 *
 * Multi-round debate navigation and persona argument display.
 * Shows timeline of 3 rounds with persona arguments for each round.
 */

import {
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  RefreshCw,
  Flag,
  Loader2,
  LayoutGrid,
  List,
} from 'lucide-react';
import type { PersonaArgument, PersonaRole } from '../../api/refquestCommitteeApi';
import { getRoundLabel } from '../../api/refquestCommitteeApi';
import { CommitteePersonaCard, CompactPersonaCard } from './CommitteePersonaCard';

interface CommitteeRoundsPanelProps {
  currentRound: 1 | 2 | 3;
  arguments: PersonaArgument[];
  loading: boolean;
  expandedPersonas: Set<PersonaRole>;
  humanNotes: Record<string, string>;
  selectedView: 'timeline' | 'grid';
  onPrevRound: () => void;
  onNextRound: () => void;
  onGoToRound: (round: 1 | 2 | 3) => void;
  onTogglePersona: (personaId: PersonaRole) => void;
  onSetHumanNote: (personaId: string, note: string) => void;
  onSetView: (view: 'timeline' | 'grid') => void;
}

export function CommitteeRoundsPanel({
  currentRound,
  arguments: roundArguments,
  loading,
  expandedPersonas,
  humanNotes,
  selectedView,
  onPrevRound,
  onNextRound,
  onGoToRound,
  onTogglePersona,
  onSetHumanNote,
  onSetView,
}: CommitteeRoundsPanelProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Round Navigation Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Committee Deliberation</h3>
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-0.5">
            <button
              onClick={() => onSetView('timeline')}
              className={`p-1.5 rounded transition-colors ${
                selectedView === 'timeline'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Timeline View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => onSetView('grid')}
              className={`p-1.5 rounded transition-colors ${
                selectedView === 'grid'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Round Timeline */}
        <RoundTimeline
          currentRound={currentRound}
          onGoToRound={onGoToRound}
        />

        {/* Round Navigation Controls */}
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={onPrevRound}
            disabled={currentRound === 1}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <div className="text-center">
            <span className="text-sm text-slate-400">Round</span>
            <span className="ml-2 text-lg font-bold text-cyan-400">{currentRound}</span>
            <span className="text-sm text-slate-500"> / 3</span>
          </div>
          <button
            onClick={onNextRound}
            disabled={currentRound === 3}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Round Label */}
      <div className="px-4 py-3 bg-slate-800/30 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <RoundIcon round={currentRound} />
          <div>
            <h4 className="text-sm font-semibold text-white">{getRoundLabel(currentRound)}</h4>
            <p className="text-xs text-slate-400">{getRoundDescription(currentRound)}</p>
          </div>
        </div>
      </div>

      {/* Arguments Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <span className="text-sm text-slate-400">Loading arguments...</span>
            </div>
          </div>
        ) : roundArguments.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-slate-500">No arguments for this round yet</p>
          </div>
        ) : selectedView === 'timeline' ? (
          <TimelineView
            arguments={roundArguments}
            expandedPersonas={expandedPersonas}
            humanNotes={humanNotes}
            onTogglePersona={onTogglePersona}
            onSetHumanNote={onSetHumanNote}
          />
        ) : (
          <GridView
            arguments={roundArguments}
            onTogglePersona={onTogglePersona}
          />
        )}
      </div>
    </div>
  );
}

// Round Timeline Component
function RoundTimeline({
  currentRound,
  onGoToRound,
}: {
  currentRound: 1 | 2 | 3;
  onGoToRound: (round: 1 | 2 | 3) => void;
}) {
  const rounds: Array<{ num: 1 | 2 | 3; label: string }> = [
    { num: 1, label: 'Initial' },
    { num: 2, label: 'Rebuttals' },
    { num: 3, label: 'Final' },
  ];

  return (
    <div className="flex items-center justify-between">
      {rounds.map((round, idx) => (
        <div key={round.num} className="flex items-center flex-1">
          {/* Round Circle */}
          <button
            onClick={() => onGoToRound(round.num)}
            className={`relative flex flex-col items-center group`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                currentRound === round.num
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                  : currentRound > round.num
                    ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 group-hover:border-slate-500'
              }`}
            >
              {currentRound > round.num ? (
                <span className="text-xs">✓</span>
              ) : (
                <span className="font-semibold">{round.num}</span>
              )}
            </div>
            <span
              className={`mt-1 text-xs ${
                currentRound === round.num ? 'text-cyan-400 font-medium' : 'text-slate-500'
              }`}
            >
              {round.label}
            </span>
          </button>

          {/* Connector Line */}
          {idx < rounds.length - 1 && (
            <div className="flex-1 mx-2">
              <div
                className={`h-0.5 ${
                  currentRound > round.num ? 'bg-green-500/50' : 'bg-slate-700'
                }`}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Round Icon Component
function RoundIcon({ round }: { round: 1 | 2 | 3 }) {
  const icons = {
    1: <MessageCircle className="w-5 h-5 text-cyan-400" />,
    2: <RefreshCw className="w-5 h-5 text-yellow-400" />,
    3: <Flag className="w-5 h-5 text-green-400" />,
  };

  return icons[round];
}

// Get description for each round
function getRoundDescription(round: 1 | 2 | 3): string {
  const descriptions = {
    1: 'Each persona presents their initial position on the call',
    2: 'Personas respond to each other\'s arguments and refine positions',
    3: 'Final positions are stated for consensus building',
  };
  return descriptions[round];
}

// Timeline View Component
function TimelineView({
  arguments: args,
  expandedPersonas,
  humanNotes,
  onTogglePersona,
  onSetHumanNote,
}: {
  arguments: PersonaArgument[];
  expandedPersonas: Set<PersonaRole>;
  humanNotes: Record<string, string>;
  onTogglePersona: (personaId: PersonaRole) => void;
  onSetHumanNote: (personaId: string, note: string) => void;
}) {
  return (
    <div className="space-y-4">
      {args.map((arg) => (
        <CommitteePersonaCard
          key={arg.personaId}
          argument={arg}
          isExpanded={expandedPersonas.has(arg.personaId)}
          onToggleExpand={() => onTogglePersona(arg.personaId)}
          humanNote={humanNotes[arg.personaId]}
          onHumanNoteChange={(note) => onSetHumanNote(arg.personaId, note)}
        />
      ))}
    </div>
  );
}

// Grid View Component
function GridView({
  arguments: args,
  onTogglePersona,
}: {
  arguments: PersonaArgument[];
  onTogglePersona: (personaId: PersonaRole) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {args.map((arg) => (
        <CompactPersonaCard
          key={arg.personaId}
          argument={arg}
          onClick={() => onTogglePersona(arg.personaId)}
        />
      ))}
    </div>
  );
}

// Round Summary Card (for completed rounds)
interface RoundSummaryProps {
  roundNumber: 1 | 2 | 3;
  arguments: PersonaArgument[];
  onClick: () => void;
}

export function RoundSummaryCard({ roundNumber, arguments: args, onClick }: RoundSummaryProps) {
  const upholdCount = args.filter((a) => a.stance === 'uphold').length;
  const overturnCount = args.filter((a) => a.stance === 'overturn').length;

  return (
    <button
      onClick={onClick}
      className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-lg text-left hover:border-cyan-500/50 transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <RoundIcon round={roundNumber} />
          <span className="text-sm font-medium text-white">{getRoundLabel(roundNumber)}</span>
        </div>
        <span className="text-xs text-slate-500">{args.length} arguments</span>
      </div>
      <div className="flex items-center gap-4 text-xs">
        <span className="text-green-400">{upholdCount} Uphold</span>
        <span className="text-red-400">{overturnCount} Overturn</span>
        <span className="text-slate-500">{args.length - upholdCount - overturnCount} Abstain</span>
      </div>
    </button>
  );
}
