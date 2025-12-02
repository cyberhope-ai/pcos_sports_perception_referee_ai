/**
 * Phase 12.1: RefQuest Video API
 *
 * API layer for video, timeline, and clip endpoints
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export interface TimelineEvent {
  id: string;
  game_id: string;
  timestamp: number;
  quarter: number;
  event_type: string;
  description: string;
  confidence: number;
  referee_id?: string;
  players_involved?: string[];
  coordinates?: { x: number; y: number };
}

export interface GameClip {
  id: string;
  game_id: string;
  event_id: string;
  start_time: number;
  end_time: number;
  label: string;
  thumbnail_url?: string;
  clip_url?: string;
}

export interface VideoInfo {
  url: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
}

// Phase 12.9: Multi-angle video support
export interface VideoSource {
  id: string;
  label: string;
  sourceType: string;
  url: string;
}

// Phase 12.9: Extended game event for event list
export interface GameEvent {
  id: string;
  gameId: string;
  eventType: string;
  description?: string;
  period?: number;
  gameTimeSeconds: number;
  actorId?: string;
  x?: number;
  y?: number;
  severity?: string | number;
}

/**
 * Fetch game video URL and metadata
 */
export async function fetchGameVideoURL(gameId: string): Promise<VideoInfo> {
  try {
    const response = await fetch(`${API_BASE}/games/${gameId}/video`);
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('[RefQuestVideoAPI] Using mock video data:', error);
    // Return mock data for development - using a public sample video
    return {
      url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      duration: 596, // ~10 minutes for demo
      width: 1920,
      height: 1080,
      fps: 30,
    };
  }
}

/**
 * Fetch timeline events for a game
 */
export async function fetchTimelineEvents(gameId: string): Promise<TimelineEvent[]> {
  try {
    const response = await fetch(`${API_BASE}/games/${gameId}/timeline`);
    if (!response.ok) {
      throw new Error(`Failed to fetch timeline: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('[RefQuestVideoAPI] Using mock timeline data:', error);
    // Return mock timeline events
    return generateMockTimelineEvents(gameId);
  }
}

/**
 * Fetch clips for a game
 */
export async function fetchGameClips(gameId: string): Promise<GameClip[]> {
  try {
    const response = await fetch(`${API_BASE}/games/${gameId}/clips`);
    if (!response.ok) {
      throw new Error(`Failed to fetch clips: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('[RefQuestVideoAPI] Using mock clips data:', error);
    // Return mock clips
    return generateMockClips(gameId);
  }
}

/**
 * Fetch specific event clip
 */
export async function fetchEventClip(eventId: string): Promise<GameClip | null> {
  try {
    const response = await fetch(`${API_BASE}/events/${eventId}/clip`);
    if (!response.ok) {
      throw new Error(`Failed to fetch event clip: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('[RefQuestVideoAPI] Event clip not found:', error);
    return null;
  }
}

// Mock data generators for development
function generateMockTimelineEvents(gameId: string): TimelineEvent[] {
  const eventTypes = ['foul', 'violation', 'timeout', 'substitution', 'jump_ball', 'out_of_bounds'];
  const events: TimelineEvent[] = [];

  // Generate 20-30 events across 48 minutes (2880 seconds)
  const numEvents = 20 + Math.floor(Math.random() * 10);

  for (let i = 0; i < numEvents; i++) {
    const timestamp = Math.floor(Math.random() * 2880);
    const quarter = Math.floor(timestamp / 720) + 1;

    events.push({
      id: `evt-${gameId}-${i}`,
      game_id: gameId,
      timestamp,
      quarter: Math.min(quarter, 4),
      event_type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
      description: `Event ${i + 1} - ${eventTypes[Math.floor(Math.random() * eventTypes.length)]}`,
      confidence: 0.7 + Math.random() * 0.3,
      coordinates: {
        x: Math.random() * 94,
        y: Math.random() * 50,
      },
    });
  }

  return events.sort((a, b) => a.timestamp - b.timestamp);
}

function generateMockClips(gameId: string): GameClip[] {
  const clips: GameClip[] = [];
  const labels = [
    'Block/Charge Decision',
    'Potential Flagrant',
    'Out of Bounds Review',
    'Shot Clock Violation',
    'Goaltending Check',
    'Technical Foul',
  ];

  for (let i = 0; i < 8; i++) {
    const startTime = Math.floor(Math.random() * 2800);
    clips.push({
      id: `clip-${gameId}-${i}`,
      game_id: gameId,
      event_id: `evt-${gameId}-${i}`,
      start_time: startTime,
      end_time: startTime + 10 + Math.floor(Math.random() * 20),
      label: labels[i % labels.length],
    });
  }

  return clips.sort((a, b) => a.start_time - b.start_time);
}

// ============================================================================
// Phase 12.9: Multi-Angle Video Support
// ============================================================================

/**
 * Fetch available video sources (angles) for a game
 */
export async function fetchGameVideoSources(gameId: string): Promise<VideoSource[]> {
  try {
    const response = await fetch(`${API_BASE}/games/${gameId}/video-sources`);
    if (!response.ok) {
      throw new Error(`Failed to fetch video sources: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('[RefQuestVideoAPI] Using mock video sources:', error);
    // Return mock multi-angle sources for development
    return [
      {
        id: 'main',
        label: 'Main',
        sourceType: 'broadcast',
        url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      },
      {
        id: 'baseline',
        label: 'Baseline',
        sourceType: 'camera',
        url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      },
      {
        id: 'sideline',
        label: 'Sideline',
        sourceType: 'camera',
        url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      },
    ];
  }
}

// ============================================================================
// Phase 12.9: Event CRUD Operations
// ============================================================================

/**
 * Fetch all events for a game (converted from timeline events)
 */
export async function fetchGameEvents(gameId: string): Promise<GameEvent[]> {
  try {
    const response = await fetch(`${API_BASE}/games/${gameId}/events`);
    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('[RefQuestVideoAPI] Using mock events:', error);
    // Convert mock timeline events to GameEvent format
    const timelineEvents = generateMockTimelineEvents(gameId);
    return timelineEvents.map(e => ({
      id: e.id,
      gameId: e.game_id,
      eventType: e.event_type,
      description: e.description,
      period: e.quarter,
      gameTimeSeconds: e.timestamp,
      x: e.coordinates?.x,
      y: e.coordinates?.y,
      severity: e.confidence > 0.9 ? 'high' : e.confidence > 0.7 ? 'medium' : 'low',
    }));
  }
}

/**
 * Update an event
 * TODO: Implement backend endpoint
 */
export async function updateEvent(
  eventId: string,
  patch: Partial<GameEvent>
): Promise<GameEvent | null> {
  try {
    const response = await fetch(`${API_BASE}/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!response.ok) {
      throw new Error(`Failed to update event: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('[RefQuestVideoAPI] Event update failed (mock):', error);
    // Return mock updated event for frontend state management
    return { id: eventId, gameId: '', gameTimeSeconds: 0, eventType: '', ...patch };
  }
}

/**
 * Delete an event
 * TODO: Implement backend endpoint
 */
export async function deleteEvent(eventId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/events/${eventId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete event: ${response.status}`);
    }
    return true;
  } catch (error) {
    console.warn('[RefQuestVideoAPI] Event delete failed (mock):', error);
    // Return success for frontend state management
    return true;
  }
}

// ============================================================================
// Phase 12.9: Clip Operations
// ============================================================================

/**
 * Create a new clip from existing clip or manually
 * TODO: Implement backend endpoint
 */
export async function createClip(
  gameId: string,
  clipData: {
    startTime: number;
    endTime: number;
    label?: string;
    eventId?: string;
    baseClipId?: string;
  }
): Promise<GameClip | null> {
  try {
    const response = await fetch(`${API_BASE}/games/${gameId}/clips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clipData),
    });
    if (!response.ok) {
      throw new Error(`Failed to create clip: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('[RefQuestVideoAPI] Clip creation failed (mock):', error);
    // Return mock clip for frontend state management
    const newId = `clip-${gameId}-${Date.now()}`;
    return {
      id: newId,
      game_id: gameId,
      event_id: clipData.eventId || '',
      start_time: clipData.startTime,
      end_time: clipData.endTime,
      label: clipData.label || 'New Clip',
    };
  }
}

/**
 * Update an existing clip
 * TODO: Implement backend endpoint
 */
export async function updateClip(
  clipId: string,
  patch: Partial<GameClip>
): Promise<GameClip | null> {
  try {
    const response = await fetch(`${API_BASE}/clips/${clipId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!response.ok) {
      throw new Error(`Failed to update clip: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('[RefQuestVideoAPI] Clip update failed (mock):', error);
    return { id: clipId, game_id: '', event_id: '', start_time: 0, end_time: 0, label: '', ...patch };
  }
}
