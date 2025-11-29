/**
 * Phase 12.5: PCOS Event Bus
 *
 * Frontend PCOS Event Bus abstraction that emits structured PCOS events
 * from RefQuest UI actions. Currently logs to console and stores in-memory
 * for the debug console. Future: wire to MCP kernel via WebSocket/SSE.
 */

// ============================================================================
// Configuration
// ============================================================================

export const ENABLE_PCOS_EVENT_LOG = true;
const MAX_EVENT_HISTORY = 100;

// ============================================================================
// Types
// ============================================================================

export interface PcosActor {
  type: 'HUMAN' | 'AI' | 'SYSTEM';
  id?: string;
  persona?: string; // e.g., "strict_judge", "flow_advocate"
}

export interface PcosEvent {
  id: string;
  type: string; // e.g., "OFFICIATING.EVENT.SELECTED"
  source: 'RefQuest.UI';
  timestamp: string; // ISO 8601
  actor?: PcosActor;
  context: Record<string, unknown>;
}

// Event type constants for type safety
export const PCOS_EVENT_TYPES = {
  // Officiating Events
  OFFICIATING: {
    EVENT_SELECTED: 'OFFICIATING.EVENT.SELECTED',
    RULING_SUBMITTED: 'OFFICIATING.RULING.SUBMITTED',
    RULING_CONFIRMED: 'OFFICIATING.RULING.CONFIRMED',
    ANNOTATION_ADDED: 'OFFICIATING.ANNOTATION.ADDED',
  },
  // AI Events
  AI: {
    ANALYSIS_REQUESTED: 'AI.ANALYSIS.REQUESTED',
    ANALYSIS_RECEIVED: 'AI.ANALYSIS.RECEIVED',
    INSIGHT_GENERATED: 'AI.INSIGHT.GENERATED',
    RECOMMENDATION_MADE: 'AI.RECOMMENDATION.MADE',
  },
  // Committee Events
  COMMITTEE: {
    CREATED: 'COMMITTEE.CREATED',
    ROUND_STARTED: 'COMMITTEE.ROUND.STARTED',
    ARGUMENT_SUBMITTED: 'COMMITTEE.ARGUMENT.SUBMITTED',
    CONSENSUS_COMPUTED: 'COMMITTEE.CONSENSUS.COMPUTED',
    ACTION_TAKEN: 'COMMITTEE.ACTION.TAKEN',
  },
  // SkillDNA Events
  SKILLDNA: {
    PROFILE_VIEWED: 'SKILLDNA.PROFILE.VIEWED',
    IMPACT_CALCULATED: 'SKILLDNA.IMPACT.CALCULATED',
    TWIN_ACTIVATED: 'SKILLDNA.TWIN.ACTIVATED',
    RECOMMENDATION_VIEWED: 'SKILLDNA.RECOMMENDATION.VIEWED',
  },
  // Ingestion Events
  INGESTION: {
    VIDEO_QUEUED: 'INGESTION.VIDEO.QUEUED',
    VIDEO_STARTED: 'INGESTION.VIDEO.STARTED',
    VIDEO_COMPLETED: 'INGESTION.VIDEO.COMPLETED',
    METADATA_EXTRACTED: 'INGESTION.METADATA.EXTRACTED',
  },
  // Navigation Events
  NAV: {
    VIEW_CHANGED: 'NAV.VIEW.CHANGED',
    FILTER_APPLIED: 'NAV.FILTER.APPLIED',
  },
} as const;

// ============================================================================
// In-Memory Event Store
// ============================================================================

const eventHistory: PcosEvent[] = [];
const eventListeners: Set<(event: PcosEvent) => void> = new Set();

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Generate a unique event ID
 */
function generateEventId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `pcos_${timestamp}_${random}`;
}

/**
 * Build a PCOS event with proper structure
 */
export function buildEvent(
  type: string,
  context: Record<string, unknown>,
  actor?: PcosActor
): PcosEvent {
  return {
    id: generateEventId(),
    type,
    source: 'RefQuest.UI',
    timestamp: new Date().toISOString(),
    actor,
    context,
  };
}

/**
 * Publish a PCOS event to the bus
 * - Logs to console (if enabled)
 * - Stores in memory for debug console
 * - Notifies all listeners
 */
export function publishEvent(event: PcosEvent): void {
  // Store in history (with size limit)
  eventHistory.unshift(event);
  if (eventHistory.length > MAX_EVENT_HISTORY) {
    eventHistory.pop();
  }

  // Log to console if enabled
  if (ENABLE_PCOS_EVENT_LOG) {
    const actorLabel = event.actor
      ? `[${event.actor.type}${event.actor.persona ? `:${event.actor.persona}` : ''}]`
      : '[SYSTEM]';

    console.log(
      `%c[PCOS] ${event.type} ${actorLabel}`,
      'color: #06b6d4; font-weight: bold;',
      event.context
    );
  }

  // Notify listeners
  eventListeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.error('[PCOS] Event listener error:', error);
    }
  });
}

/**
 * Convenience function to build and publish in one step
 */
export function emitPcosEvent(
  type: string,
  context: Record<string, unknown>,
  actor?: PcosActor
): PcosEvent {
  const event = buildEvent(type, context, actor);
  publishEvent(event);
  return event;
}

/**
 * Get recent events from the in-memory store
 */
export function getRecentEvents(limit?: number): PcosEvent[] {
  if (limit && limit > 0) {
    return eventHistory.slice(0, limit);
  }
  return [...eventHistory];
}

/**
 * Get events filtered by type prefix
 */
export function getEventsByType(typePrefix: string, limit?: number): PcosEvent[] {
  const filtered = eventHistory.filter((e) => e.type.startsWith(typePrefix));
  if (limit && limit > 0) {
    return filtered.slice(0, limit);
  }
  return filtered;
}

/**
 * Clear all events from history
 */
export function clearEventHistory(): void {
  eventHistory.length = 0;
}

// ============================================================================
// Subscription API
// ============================================================================

/**
 * Subscribe to PCOS events
 * Returns an unsubscribe function
 */
export function subscribeToEvents(
  listener: (event: PcosEvent) => void
): () => void {
  eventListeners.add(listener);
  return () => {
    eventListeners.delete(listener);
  };
}

/**
 * Subscribe to events of a specific type
 */
export function subscribeToEventType(
  typePrefix: string,
  listener: (event: PcosEvent) => void
): () => void {
  const filteredListener = (event: PcosEvent) => {
    if (event.type.startsWith(typePrefix)) {
      listener(event);
    }
  };
  eventListeners.add(filteredListener);
  return () => {
    eventListeners.delete(filteredListener);
  };
}

// ============================================================================
// Actor Helpers
// ============================================================================

export const HUMAN_ACTOR: PcosActor = { type: 'HUMAN' };
export const SYSTEM_ACTOR: PcosActor = { type: 'SYSTEM' };

export function aiActor(persona?: string): PcosActor {
  return { type: 'AI', persona };
}

export function humanActor(id?: string): PcosActor {
  return { type: 'HUMAN', id };
}
