/**
 * Phase 5A-5D: React Query Hooks
 *
 * Custom hooks for data fetching using @tanstack/react-query
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type {
  Game,
  Event,
  Clip,
  QSurface,
  SkillDNAProfile,
  RefereeSkillProfile,
  PlayerSkillProfile,
  CrewSkillProfile,
  GameOfficiatingSummary,
} from '../types';

// ====================
// QUERY KEYS
// ====================

export const queryKeys = {
  games: ['games'] as const,
  game: (id: string) => ['games', id] as const,
  gameTimeline: (id: string) => ['games', id, 'timeline'] as const,
  gameClips: (id: string) => ['games', id, 'clips'] as const,
  gameEvents: (id: string) => ['games', id, 'events'] as const,
  gameOfficiatingSummary: (id: string) => ['games', id, 'officiating-summary'] as const,

  events: ['events'] as const,
  event: (id: string) => ['events', id] as const,
  eventClip: (id: string) => ['events', id, 'clip'] as const,
  eventQSurfaces: (id: string) => ['events', id, 'qsurfaces'] as const,

  clips: ['clips'] as const,
  clip: (id: string) => ['clips', id] as const,

  skillDNA: (actorId: string) => ['skilldna', actorId] as const,
  refereeSkillDNA: (refId: string) => ['skilldna', 'referee', refId] as const,
  playerSkillDNA: (playerId: string) => ['skilldna', 'player', playerId] as const,
  crewSkillDNA: (crewId: string) => ['skilldna', 'crew', crewId] as const,
};

// ====================
// GAME HOOKS
// ====================

export function useGame(gameId: string) {
  return useQuery({
    queryKey: queryKeys.game(gameId),
    queryFn: () => apiClient.get<Game>(`/games/${gameId}`),
    enabled: !!gameId,
  });
}

export function useGameClips(gameId: string, filters?: { event_type?: string; limit?: number }) {
  return useQuery({
    queryKey: [...queryKeys.gameClips(gameId), filters],
    queryFn: () => apiClient.get<Clip[]>(`/games/${gameId}/clips`, filters),
    enabled: !!gameId,
  });
}

export function useGameEvents(gameId: string, filters?: { event_type?: string }) {
  return useQuery({
    queryKey: [...queryKeys.gameEvents(gameId), filters],
    queryFn: () => apiClient.get<Event[]>(`/games/${gameId}/events`, filters),
    enabled: !!gameId,
  });
}

export function useGameTimeline(gameId: string) {
  return useQuery({
    queryKey: queryKeys.gameTimeline(gameId),
    queryFn: () => apiClient.get<import('../types').TimelineResponse>(`/games/${gameId}/timeline`),
    enabled: !!gameId,
  });
}

// ====================
// EVENT HOOKS
// ====================

export function useEvent(eventId: string) {
  return useQuery({
    queryKey: queryKeys.event(eventId),
    queryFn: () => apiClient.get<Event>(`/events/${eventId}`),
    enabled: !!eventId,
  });
}

export function useEventClip(eventId: string) {
  return useQuery({
    queryKey: queryKeys.eventClip(eventId),
    queryFn: () => apiClient.get<Clip>(`/events/${eventId}/clip`),
    enabled: !!eventId,
  });
}

export function useEventQSurfaces(eventId: string) {
  return useQuery({
    queryKey: queryKeys.eventQSurfaces(eventId),
    queryFn: () => apiClient.get<QSurface[]>(`/events/${eventId}/qsurfaces`),
    enabled: !!eventId,
  });
}

// ====================
// SKILLDNA HOOKS (Phase 5D)
// ====================

/**
 * Legacy hook - use specific hooks below instead
 */
export function useSkillDNA(actorId: string) {
  return useQuery({
    queryKey: queryKeys.skillDNA(actorId),
    queryFn: () => apiClient.get<SkillDNAProfile>(`/skilldna/${actorId}`),
    enabled: !!actorId,
  });
}

/**
 * Fetch referee SkillDNA profile
 * GET /api/v1/refs/{ref_id}/skilldna
 */
export function useRefereeSkillDNA(refId: string) {
  return useQuery({
    queryKey: queryKeys.refereeSkillDNA(refId),
    queryFn: () => apiClient.get<RefereeSkillProfile>(`/refs/${refId}/skilldna`),
    enabled: !!refId,
  });
}

/**
 * Fetch player SkillDNA profile
 * GET /api/v1/players/{player_id}/skilldna
 */
export function usePlayerSkillDNA(playerId: string) {
  return useQuery({
    queryKey: queryKeys.playerSkillDNA(playerId),
    queryFn: () => apiClient.get<PlayerSkillProfile>(`/players/${playerId}/skilldna`),
    enabled: !!playerId,
  });
}

/**
 * Fetch crew SkillDNA profile
 * GET /api/v1/crews/{crew_id}/skilldna
 */
export function useCrewSkillDNA(crewId: string) {
  return useQuery({
    queryKey: queryKeys.crewSkillDNA(crewId),
    queryFn: () => apiClient.get<CrewSkillProfile>(`/crews/${crewId}/skilldna`),
    enabled: !!crewId,
  });
}

/**
 * Fetch game officiating summary
 * GET /api/v1/games/{game_id}/officiating_summary
 */
export function useGameOfficiatingSummary(gameId: string) {
  return useQuery({
    queryKey: queryKeys.gameOfficiatingSummary(gameId),
    queryFn: () => apiClient.get<GameOfficiatingSummary>(`/games/${gameId}/officiating_summary`),
    enabled: !!gameId,
  });
}

// ====================
// MUTATION HOOKS (for future use)
// ====================

export function useUploadGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) =>
      apiClient.post<Game>('/games/upload', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.games });
    },
  });
}
