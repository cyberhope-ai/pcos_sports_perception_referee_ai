/**
 * Phase 13.2: PCOS Event Router
 *
 * Routes inbound MCP events to appropriate handlers and stores.
 * Connects PCOS MCP Kernel events to RefQuest UI state.
 */

import {
  subscribeToMcpEvents,
  connectToMcpKernel,
  ENABLE_PCOS_EVENT_LOG,
} from './pcosEventBus';

// ============================================================================
// Types
// ============================================================================

export interface McpEventPayload {
  type: string;
  [key: string]: unknown;
}

export type EventHandler = (event: McpEventPayload) => void;

// ============================================================================
// Event Handler Registry
// ============================================================================

const eventHandlers: Map<string, Set<EventHandler>> = new Map();

/**
 * Register a handler for a specific event type prefix
 */
export function registerEventHandler(
  typePrefix: string,
  handler: EventHandler
): () => void {
  if (!eventHandlers.has(typePrefix)) {
    eventHandlers.set(typePrefix, new Set());
  }
  eventHandlers.get(typePrefix)!.add(handler);

  return () => {
    eventHandlers.get(typePrefix)?.delete(handler);
  };
}

/**
 * Route an event to appropriate handlers
 */
function routeEvent(event: McpEventPayload): void {
  const eventType = event.type;
  if (!eventType) return;

  // Match handlers by prefix
  eventHandlers.forEach((handlers, prefix) => {
    if (eventType.startsWith(prefix)) {
      handlers.forEach((handler) => {
        try {
          handler(event);
        } catch (error) {
          console.error(`[PCOS/Router] Handler error for ${prefix}:`, error);
        }
      });
    }
  });
}

// ============================================================================
// Default Event Handlers
// ============================================================================

/**
 * Handle COMMITTEE_EVENT from MCP Kernel
 */
function handleCommitteeEvent(event: McpEventPayload): void {
  if (ENABLE_PCOS_EVENT_LOG) {
    console.log('%c[PCOS/Router] Committee Event:', 'color: #a855f7;', event);
  }

  // Extract committee data (prefixed with _ to indicate planned for future use)
  const { case_id: _case_id, event_id: _event_id, status: _status, round_index: _round_index } = event as {
    case_id?: string;
    event_id?: string;
    status?: string;
    round_index?: number;
  };

  // TODO: Update committee store when implemented
  // useCommitteeStore.getState().updateCase({ ... });
}

/**
 * Handle COMMITTEE_ROUND from MCP Kernel
 */
function handleCommitteeRound(event: McpEventPayload): void {
  if (ENABLE_PCOS_EVENT_LOG) {
    console.log('%c[PCOS/Router] Committee Round:', 'color: #a855f7;', event);
  }

  // Extract round data (prefixed with _ to indicate planned for future use)
  const { round_id: _round_id, case_id: _case_id, round_index: _round_index, messages: _messages, status: _status } = event as {
    round_id?: string;
    case_id?: string;
    round_index?: number;
    messages?: unknown[];
    status?: string;
  };

  // TODO: Update committee store with new round/messages
}

/**
 * Handle QSURFACE from MCP Kernel
 */
function handleQSurface(event: McpEventPayload): void {
  if (ENABLE_PCOS_EVENT_LOG) {
    console.log('%c[PCOS/Router] QSurface:', 'color: #f59e0b;', event);
  }

  // Extract QSurface data (prefixed with _ to indicate planned for future use)
  const { event_id: _event_id, perspective: _perspective, scores: _scores, interpretation: _interpretation } = event as {
    event_id?: string;
    perspective?: string;
    scores?: Record<string, number>;
    interpretation?: string;
  };

  // TODO: Update event reasoning store
  // useEventReasoningStore.getState().addQSurface({ ... });
}

/**
 * Handle SKILL_SNAPSHOT from MCP Kernel
 */
function handleSkillSnapshot(event: McpEventPayload): void {
  if (ENABLE_PCOS_EVENT_LOG) {
    console.log('%c[PCOS/Router] Skill Snapshot:', 'color: #22c55e;', event);
  }

  // Extract SkillDNA data (prefixed with _ to indicate planned for future use)
  const { subject_type: _subject_type, subject_id: _subject_id, profile_vector: _profile_vector, delta: _delta } = event as {
    subject_type?: string;
    subject_id?: string;
    profile_vector?: Record<string, unknown>;
    delta?: Record<string, unknown>;
  };

  // TODO: Update SkillDNA store
  // useSkillDNAStore.getState().updateProfile({ ... });
}

/**
 * Handle AGENT_STATUS from MCP Kernel
 */
function handleAgentStatus(event: McpEventPayload): void {
  if (ENABLE_PCOS_EVENT_LOG) {
    console.log('%c[PCOS/Router] Agent Status:', 'color: #06b6d4;', event);
  }

  // Agent status updates (fleet view) - prefixed with _ for future use
  const { agent_id: _agent_id, status: _status, task_id: _task_id, progress: _progress } = event as {
    agent_id?: string;
    status?: string;
    task_id?: string;
    progress?: number;
  };

  // Could be used for a fleet status panel
}

/**
 * Handle SYNC_RECORD from MCP Kernel
 */
function handleSyncRecord(event: McpEventPayload): void {
  if (ENABLE_PCOS_EVENT_LOG) {
    console.log('%c[PCOS/Router] Sync Record:', 'color: #ec4899;', event);
  }

  // StarlightSync memory records
  // Used for cross-service state sync
}

/**
 * Handle FLEET_SNAPSHOT from MCP Kernel
 */
function handleFleetSnapshot(event: McpEventPayload): void {
  if (ENABLE_PCOS_EVENT_LOG) {
    console.log('%c[PCOS/Router] Fleet Snapshot:', 'color: #8b5cf6;', event);
  }

  // Full fleet status snapshot - prefixed with _ for future use
  const { agents: _agents, active_tasks: _active_tasks, total_agents: _total_agents } = event as {
    agents?: unknown[];
    active_tasks?: number;
    total_agents?: number;
  };
}

// ============================================================================
// Router Initialization
// ============================================================================

let isRouterInitialized = false;

/**
 * Initialize the PCOS Event Router
 * - Connects to MCP Kernel WebSocket
 * - Registers default handlers
 * - Starts routing events
 */
export function initPcosEventRouter(): void {
  if (isRouterInitialized) {
    console.log('[PCOS/Router] Already initialized');
    return;
  }

  console.log('[PCOS/Router] Initializing...');

  // Register default handlers
  registerEventHandler('COMMITTEE_EVENT', handleCommitteeEvent);
  registerEventHandler('COMMITTEE_ROUND', handleCommitteeRound);
  registerEventHandler('QSURFACE', handleQSurface);
  registerEventHandler('SKILL_SNAPSHOT', handleSkillSnapshot);
  registerEventHandler('AGENT_STATUS', handleAgentStatus);
  registerEventHandler('SYNC_RECORD', handleSyncRecord);
  registerEventHandler('FLEET_SNAPSHOT', handleFleetSnapshot);

  // Subscribe to all MCP events and route them
  subscribeToMcpEvents((event) => {
    routeEvent(event as McpEventPayload);
  });

  // Connect to MCP Kernel
  connectToMcpKernel();

  isRouterInitialized = true;
  console.log('[PCOS/Router] Initialized successfully');
}

/**
 * Check if router is initialized
 */
export function isRouterReady(): boolean {
  return isRouterInitialized;
}

// ============================================================================
// Convenience Hooks for React Components
// ============================================================================

/**
 * Hook to subscribe to specific event types in React components
 *
 * Usage:
 * ```tsx
 * useEffect(() => {
 *   return subscribeToPcosEventType('COMMITTEE_EVENT', (event) => {
 *     console.log('Committee event received:', event);
 *   });
 * }, []);
 * ```
 */
export function subscribeToPcosEventType(
  typePrefix: string,
  handler: EventHandler
): () => void {
  return registerEventHandler(typePrefix, handler);
}
