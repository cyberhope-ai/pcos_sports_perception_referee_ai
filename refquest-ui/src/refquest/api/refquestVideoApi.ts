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
