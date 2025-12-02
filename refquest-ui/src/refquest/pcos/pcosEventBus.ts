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

// MCP Kernel WebSocket endpoint (Phase 13.2)
const MCP_WS_URL = 'ws://127.0.0.1:7890/telemetry';
const MCP_RECONNECT_INTERVAL = 5000; // 5 seconds

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
    // Phase 12.9: Video events
    VIDEO: {
      ANGLE_CHANGED: 'OFFICIATING.VIDEO.ANGLE_CHANGED',
      CLIP_SELECTED: 'OFFICIATING.VIDEO.CLIP_SELECTED',
      CLIP_CREATED: 'OFFICIATING.VIDEO.CLIP_CREATED',
      CLIP_TRIMMED: 'OFFICIATING.VIDEO.CLIP_TRIMMED',
      PLAYBACK_POSITION_CHANGED: 'OFFICIATING.VIDEO.PLAYBACK_POSITION_CHANGED',
    },
    // Phase 12.9: Event management
    EVENT: {
      DELETED: 'OFFICIATING.EVENT.DELETED',
      UPDATED: 'OFFICIATING.EVENT.UPDATED',
      NOTE_ADDED: 'OFFICIATING.EVENT.NOTE_ADDED',
    },
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
  // Phase 13.3: System Events
  SYSTEM: {
    VALIDATION_STARTED: 'SYSTEM.VALIDATION.STARTED',
    VALIDATION_COMPLETED: 'SYSTEM.VALIDATION.COMPLETED',
    VALIDATION_FAILED: 'SYSTEM.VALIDATION.FAILED',
    DEPENDENCY_WARNING: 'SYSTEM.DEPENDENCY.WARNING',
    DEPENDENCY_ERROR: 'SYSTEM.DEPENDENCY.ERROR',
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

// ============================================================================
// Phase 13.2: MCP Kernel WebSocket Integration
// ============================================================================

/**
 * MCP WebSocket connection state
 */
export interface McpConnectionState {
  connected: boolean;
  url: string;
  reconnectAttempts: number;
  lastMessage: Date | null;
}

let mcpSocket: WebSocket | null = null;
let mcpReconnectTimer: ReturnType<typeof setTimeout> | null = null;
let mcpConnectionState: McpConnectionState = {
  connected: false,
  url: MCP_WS_URL,
  reconnectAttempts: 0,
  lastMessage: null,
};

// Listeners for inbound MCP events
const mcpInboundListeners: Set<(event: Record<string, unknown>) => void> = new Set();

/**
 * Connect to MCP Kernel WebSocket
 * Receives events from the PCOS MCP Kernel for:
 * - COMMITTEE_EVENT, COMMITTEE_ROUND
 * - QSURFACE, SYNC_RECORD, SKILL_SNAPSHOT
 * - AGENT_STATUS, FLEET_SNAPSHOT
 */
export function connectToMcpKernel(): void {
  if (mcpSocket && mcpSocket.readyState === WebSocket.OPEN) {
    console.log('[PCOS/MCP] Already connected');
    return;
  }

  try {
    console.log(`[PCOS/MCP] Connecting to ${MCP_WS_URL}...`);
    mcpSocket = new WebSocket(MCP_WS_URL);

    mcpSocket.onopen = () => {
      console.log('%c[PCOS/MCP] Connected to MCP Kernel', 'color: #22c55e; font-weight: bold;');
      mcpConnectionState = {
        ...mcpConnectionState,
        connected: true,
        reconnectAttempts: 0,
      };

      // Clear reconnect timer if set
      if (mcpReconnectTimer) {
        clearTimeout(mcpReconnectTimer);
        mcpReconnectTimer = null;
      }
    };

    mcpSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        mcpConnectionState.lastMessage = new Date();

        if (ENABLE_PCOS_EVENT_LOG) {
          console.log(
            '%c[PCOS/MCP] Inbound:',
            'color: #f59e0b; font-weight: bold;',
            data.type || 'UNKNOWN',
            data
          );
        }

        // Notify all MCP listeners
        mcpInboundListeners.forEach((listener) => {
          try {
            listener(data);
          } catch (error) {
            console.error('[PCOS/MCP] Listener error:', error);
          }
        });

        // Also publish as local PCOS event for unified handling
        if (data.type) {
          const localEvent = buildEvent(
            `MCP.${data.type}`,
            { mcpPayload: data },
            { type: 'SYSTEM' }
          );
          publishEvent(localEvent);
        }
      } catch (error) {
        console.error('[PCOS/MCP] Failed to parse message:', error);
      }
    };

    mcpSocket.onerror = (error) => {
      console.error('[PCOS/MCP] WebSocket error:', error);
    };

    mcpSocket.onclose = (event) => {
      console.log(`[PCOS/MCP] Disconnected (code: ${event.code})`);
      mcpConnectionState.connected = false;
      mcpSocket = null;

      // Auto-reconnect
      scheduleReconnect();
    };
  } catch (error) {
    console.error('[PCOS/MCP] Failed to connect:', error);
    scheduleReconnect();
  }
}

/**
 * Schedule reconnection to MCP Kernel
 */
function scheduleReconnect(): void {
  if (mcpReconnectTimer) {
    return; // Already scheduled
  }

  mcpConnectionState.reconnectAttempts++;
  const delay = Math.min(
    MCP_RECONNECT_INTERVAL * Math.pow(1.5, mcpConnectionState.reconnectAttempts - 1),
    30000 // Max 30 seconds
  );

  console.log(`[PCOS/MCP] Reconnecting in ${delay}ms (attempt ${mcpConnectionState.reconnectAttempts})...`);

  mcpReconnectTimer = setTimeout(() => {
    mcpReconnectTimer = null;
    connectToMcpKernel();
  }, delay);
}

/**
 * Disconnect from MCP Kernel
 */
export function disconnectFromMcpKernel(): void {
  if (mcpReconnectTimer) {
    clearTimeout(mcpReconnectTimer);
    mcpReconnectTimer = null;
  }

  if (mcpSocket) {
    mcpSocket.close();
    mcpSocket = null;
  }

  mcpConnectionState = {
    ...mcpConnectionState,
    connected: false,
    reconnectAttempts: 0,
  };

  console.log('[PCOS/MCP] Disconnected');
}

/**
 * Send event to MCP Kernel via WebSocket
 */
export function sendToMcpKernel(event: Record<string, unknown>): boolean {
  if (!mcpSocket || mcpSocket.readyState !== WebSocket.OPEN) {
    console.warn('[PCOS/MCP] Not connected, cannot send event');
    return false;
  }

  try {
    mcpSocket.send(JSON.stringify(event));
    if (ENABLE_PCOS_EVENT_LOG) {
      console.log(
        '%c[PCOS/MCP] Outbound:',
        'color: #06b6d4; font-weight: bold;',
        event
      );
    }
    return true;
  } catch (error) {
    console.error('[PCOS/MCP] Failed to send:', error);
    return false;
  }
}

/**
 * Subscribe to inbound MCP events
 */
export function subscribeToMcpEvents(
  listener: (event: Record<string, unknown>) => void
): () => void {
  mcpInboundListeners.add(listener);
  return () => {
    mcpInboundListeners.delete(listener);
  };
}

/**
 * Subscribe to specific MCP event types
 */
export function subscribeToMcpEventType(
  typePrefix: string,
  listener: (event: Record<string, unknown>) => void
): () => void {
  const filteredListener = (event: Record<string, unknown>) => {
    const eventType = event.type as string | undefined;
    if (eventType && eventType.startsWith(typePrefix)) {
      listener(event);
    }
  };
  mcpInboundListeners.add(filteredListener);
  return () => {
    mcpInboundListeners.delete(filteredListener);
  };
}

/**
 * Get current MCP connection state
 */
export function getMcpConnectionState(): McpConnectionState {
  return { ...mcpConnectionState };
}

/**
 * Check if connected to MCP Kernel
 */
export function isMcpConnected(): boolean {
  return mcpConnectionState.connected;
}
