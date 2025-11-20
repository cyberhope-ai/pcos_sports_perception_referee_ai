/**
 * Phase 5A: React Query Hooks
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

  events: ['events'] as const,
  event: (id: string) => ['events', id] as const,
  eventClip: (id: string) => ['events', id, 'clip'] as const,
  eventQSurfaces: (id: string) => ['events', id, 'qsurfaces'] as const,

  clips: ['clips'] as const,
  clip: (id: string) => ['clips', id] as const,

  skillDNA: (actorId: string) => ['skilldna', actorId] as const,
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
// SKILLDNA HOOKS
// ====================

export function useSkillDNA(actorId: string) {
  return useQuery({
    queryKey: queryKeys.skillDNA(actorId),
    queryFn: () => apiClient.get<SkillDNAProfile>(`/skilldna/${actorId}`),
    enabled: !!actorId,
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
