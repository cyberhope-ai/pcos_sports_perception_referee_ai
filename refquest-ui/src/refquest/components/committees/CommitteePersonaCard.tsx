/**
 * Phase 12.4: Committee Persona Card
 *
 * Displays a single persona's argument within a committee deliberation round,
 * showing avatar, role, stance, confidence, reasoning, and rule references
 */

import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  BookOpen,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Edit3,
  Check,
  X,
} from 'lucide-react';
import type { PersonaArgument } from '../../api/refquestCommitteeApi';
import { getPersonaConfig } from '../../api/refquestCommitteeApi';

interface CommitteePersonaCardProps {
  argument: PersonaArgument;
  isExpanded: boolean;
  onToggleExpand: () => void;
  humanNote?: string;
  onHumanNoteChange?: (note: string) => void;
  showRound?: boolean;
}

export function CommitteePersonaCard({
  argument,
  isExpanded,
  onToggleExpand,
  humanNote,
  onHumanNoteChange,
}: CommitteePersonaCardProps) {
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(humanNote || '');

  const persona = getPersonaConfig(argument.personaId);

  const colorStyles: Record<string, { bg: string; border: string; text: string; accent: string }> = {
    red: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
      accent: 'bg-red-500/20',
    },
    green: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      text: 'text-green-400',
      accent: 'bg-green-500/20',
    },
    yellow: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      text: 'text-yellow-400',
      accent: 'bg-yellow-500/20',
    },
    blue: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
      accent: 'bg-blue-500/20',
    },
  };

  const style = colorStyles[persona.color] || colorStyles.blue;

  const handleSaveNote = () => {
    onHumanNoteChange?.(noteText);
    setIsEditingNote(false);
  };

  const handleCancelNote = () => {
    setNoteText(humanNote || '');
    setIsEditingNote(false);
  };

  return (
    <div className={`rounded-lg border ${style.border} ${style.bg} overflow-hidden`}>
      {/* Header - Always visible */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/5 transition-colors"
      >
        {/* Persona Avatar */}
        <div className={`w-12 h-12 rounded-xl ${style.accent} flex items-center justify-center text-2xl`}>
          {persona.icon}
        </div>

        {/* Persona Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${style.text}`}>{persona.name}</span>
            <span className="text-xs text-slate-500">{persona.archetype}</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <StanceBadge stance={argument.stance} />
            <ConfidenceMeter confidence={argument.confidence} />
          </div>
        </div>

        {/* Expand Toggle */}
        <div className="text-slate-500">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-700/50">
          {/* Key Points */}
          <div className="pt-4">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <MessageSquare className="w-3 h-3" />
              Key Arguments
            </h4>
            <ul className="space-y-2">
              {argument.keyPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className={`w-1.5 h-1.5 rounded-full ${style.text} mt-2 flex-shrink-0`} />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* Rule References */}
          {argument.ruleReferences.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <BookOpen className="w-3 h-3" />
                Rule References
              </h4>
              <div className="flex flex-wrap gap-2">
                {argument.ruleReferences.map((ref, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-slate-800/50 text-slate-400 rounded text-xs font-mono"
                  >
                    {ref}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Persona Philosophy */}
          <div className={`p-3 rounded-lg ${style.accent}`}>
            <p className="text-xs text-slate-400 italic">"{persona.philosophy}"</p>
          </div>

          {/* Human Note Section */}
          <div className="border-t border-slate-700/50 pt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Edit3 className="w-3 h-3" />
                Your Notes
              </h4>
              {!isEditingNote && (
                <button
                  onClick={() => setIsEditingNote(true)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  {humanNote ? 'Edit' : 'Add Note'}
                </button>
              )}
            </div>

            {isEditingNote ? (
              <div className="space-y-2">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add your thoughts on this argument..."
                  className="w-full h-20 bg-slate-800/50 border border-slate-700 rounded-lg p-2 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleCancelNote}
                    className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSaveNote}
                    className="p-1.5 text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : humanNote ? (
              <p className="text-sm text-slate-400 bg-slate-800/30 rounded-lg p-3">{humanNote}</p>
            ) : (
              <p className="text-xs text-slate-500 italic">No notes added yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StanceBadge({ stance }: { stance: 'uphold' | 'overturn' | 'abstain' }) {
  const styles = {
    uphold: {
      bg: 'bg-green-500/20',
      text: 'text-green-400',
      icon: <ThumbsUp className="w-3 h-3" />,
      label: 'Uphold',
    },
    overturn: {
      bg: 'bg-red-500/20',
      text: 'text-red-400',
      icon: <ThumbsDown className="w-3 h-3" />,
      label: 'Overturn',
    },
    abstain: {
      bg: 'bg-slate-500/20',
      text: 'text-slate-400',
      icon: <Minus className="w-3 h-3" />,
      label: 'Abstain',
    },
  };

  const style = styles[stance];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
      {style.icon}
      {style.label}
    </span>
  );
}

function ConfidenceMeter({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);

  const getColor = () => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor()} rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-slate-500">{percentage}%</span>
    </div>
  );
}

// Compact variant for grid views
interface CompactPersonaCardProps {
  argument: PersonaArgument;
  onClick?: () => void;
}

export function CompactPersonaCard({ argument, onClick }: CompactPersonaCardProps) {
  const persona = getPersonaConfig(argument.personaId);

  const colorStyles: Record<string, string> = {
    red: 'border-red-500/30 hover:border-red-500/50',
    green: 'border-green-500/30 hover:border-green-500/50',
    yellow: 'border-yellow-500/30 hover:border-yellow-500/50',
    blue: 'border-blue-500/30 hover:border-blue-500/50',
  };

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 bg-slate-800/50 border ${colorStyles[persona.color]} rounded-lg text-left hover:bg-slate-800/70 transition-all`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{persona.icon}</span>
        <span className="text-sm font-medium text-white truncate">{persona.name}</span>
      </div>
      <div className="flex items-center justify-between">
        <StanceBadge stance={argument.stance} />
        <span className="text-xs text-slate-500">{Math.round(argument.confidence * 100)}%</span>
      </div>
    </button>
  );
}
