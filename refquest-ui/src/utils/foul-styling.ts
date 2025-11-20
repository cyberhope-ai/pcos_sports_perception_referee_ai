/**
 * Phase 5B: Foul Type Styling Utilities
 *
 * Color coding and styling for different foul types
 * Based on Phase 5B specification and PCOS Visualization standards
 */

export interface FoulTypeStyle {
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
}

const FOUL_TYPE_STYLES: Record<string, FoulTypeStyle> = {
  block: {
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-500',
    label: 'Block',
  },
  charge: {
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-500',
    label: 'Charge',
  },
  illegal_screen: {
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-500',
    label: 'Illegal Screen',
  },
  shooting_foul: {
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-500',
    label: 'Shooting Foul',
  },
  holding: {
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-500',
    label: 'Holding',
  },
  pushing: {
    color: 'text-pink-700',
    bgColor: 'bg-pink-100',
    borderColor: 'border-pink-500',
    label: 'Pushing',
  },
  default: {
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-500',
    label: 'Other',
  },
};

export function getFoulTypeStyle(foulType?: string): FoulTypeStyle {
  if (!foulType) return FOUL_TYPE_STYLES.default;
  return FOUL_TYPE_STYLES[foulType] || FOUL_TYPE_STYLES.default;
}

export function getEventTypeColor(eventType: string): string {
  const colors: Record<string, string> = {
    candidate_foul: 'bg-red-500',
    referee_mechanics: 'bg-yellow-500',
    crew_rotation: 'bg-green-500',
    clip_generated: 'bg-blue-500',
  };
  return colors[eventType] || 'bg-gray-500';
}

export function getEventTypeLabel(eventType: string): string {
  const labels: Record<string, string> = {
    candidate_foul: 'Candidate Foul',
    referee_mechanics: 'Ref Mechanics',
    crew_rotation: 'Crew Rotation',
    clip_generated: 'Clip Generated',
  };
  return labels[eventType] || eventType;
}
