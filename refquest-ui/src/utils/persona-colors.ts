/**
 * Phase 5C: Persona Color System
 *
 * Defines persona-specific colors for QSurface views
 * Based on PCOS QSurface Display Standards
 */

export const PERSONA_COLORS = {
  referee: {
    primary: 'rgb(245, 158, 11)', // amber-500
    light: 'rgb(254, 243, 199)', // amber-100
    dark: 'rgb(180, 83, 9)', // amber-700
    text: 'rgb(146, 64, 14)', // amber-800
  },
  coach: {
    primary: 'rgb(59, 130, 246)', // blue-500
    light: 'rgb(219, 234, 254)', // blue-100
    dark: 'rgb(29, 78, 216)', // blue-700
    text: 'rgb(30, 64, 175)', // blue-800
  },
  player: {
    primary: 'rgb(34, 197, 94)', // green-500
    light: 'rgb(220, 252, 231)', // green-100
    dark: 'rgb(21, 128, 61)', // green-700
    text: 'rgb(22, 101, 52)', // green-800
  },
  league: {
    primary: 'rgb(168, 85, 247)', // purple-500
    light: 'rgb(243, 232, 255)', // purple-100
    dark: 'rgb(126, 34, 206)', // purple-700
    text: 'rgb(107, 33, 168)', // purple-800
  },
} as const;

export type PersonaKey = keyof typeof PERSONA_COLORS;

export function getPersonaColors(persona: PersonaKey) {
  return PERSONA_COLORS[persona];
}

export function getPersonaTextClass(persona: PersonaKey): string {
  const classes: Record<PersonaKey, string> = {
    referee: 'text-amber-800',
    coach: 'text-blue-800',
    player: 'text-green-800',
    league: 'text-purple-800',
  };
  return classes[persona];
}

export function getPersonaBgClass(persona: PersonaKey): string {
  const classes: Record<PersonaKey, string> = {
    referee: 'bg-amber-500',
    coach: 'bg-blue-500',
    player: 'bg-green-500',
    league: 'bg-purple-500',
  };
  return classes[persona];
}

export function getPersonaBgLightClass(persona: PersonaKey): string {
  const classes: Record<PersonaKey, string> = {
    referee: 'bg-amber-100',
    coach: 'bg-blue-100',
    player: 'bg-green-100',
    league: 'bg-purple-100',
  };
  return classes[persona];
}

export function getPersonaBorderClass(persona: PersonaKey): string {
  const classes: Record<PersonaKey, string> = {
    referee: 'border-amber-500',
    coach: 'border-blue-500',
    player: 'border-green-500',
    league: 'border-purple-500',
  };
  return classes[persona];
}
