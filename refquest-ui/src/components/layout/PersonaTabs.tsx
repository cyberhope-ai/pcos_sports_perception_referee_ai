/**
 * Phase 5A: Persona Tabs Component
 *
 * Tabs for switching between different persona views
 */
import { PersonaType } from '../../types';
import { useGameStore } from '../../state/gameStore';
import { cn } from '../../utils/cn';
import { Eye, Users, User, Trophy } from 'lucide-react';

interface PersonaTab {
  type: PersonaType;
  label: string;
  icon: typeof Eye;
  color: string;
}

const personaTabs: PersonaTab[] = [
  {
    type: PersonaType.REFEREE,
    label: 'Referee View',
    icon: Eye,
    color: 'referee',
  },
  {
    type: PersonaType.COACH,
    label: 'Coach View',
    icon: Users,
    color: 'coach',
  },
  {
    type: PersonaType.PLAYER,
    label: 'Player View',
    icon: User,
    color: 'player',
  },
  {
    type: PersonaType.LEAGUE,
    label: 'League View',
    icon: Trophy,
    color: 'league',
  },
];

export function PersonaTabs() {
  const { selectedPersona, setSelectedPersona } = useGameStore();

  return (
    <div className="flex border-b border-gray-200 bg-white">
      {personaTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = selectedPersona === tab.type;

        return (
          <button
            key={tab.type}
            onClick={() => setSelectedPersona(tab.type)}
            className={cn(
              'flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors',
              isActive
                ? `border-${tab.color} text-${tab.color}-dark`
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            <Icon className="w-4 h-4 mr-2" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
