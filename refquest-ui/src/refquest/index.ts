/**
 * Phase 12.0: RefQuest Module Index
 *
 * Main export file for all RefQuest components, routes, and types
 */

// Routes
export { refquestRoutes } from './routes';

// Layout components
export { RefQuestLayout } from './layout/RefQuestLayout';
export { RefQuestSidebar } from './layout/RefQuestSidebar';
export { MotherShipStatusStrip } from './layout/MotherShipStatusStrip';

// Game components
export { GameListView } from './components/games/GameListView';

// Review workspace components
export { ReviewWorkspace } from './components/review/ReviewWorkspace';
export { TopBarGameContext } from './components/review/TopBarGameContext';
export { DecisionPanel } from './components/review/DecisionPanel';
export { ActionHistoryPanel } from './components/review/ActionHistoryPanel';

// Phase 12.9: Video capability components
export { ClipGalleryPanel } from './components/review/ClipGalleryPanel';
export { ClipEditorModal } from './components/review/ClipEditorModal';
export { EventListPanel } from './components/review/EventListPanel';
export { CourtMapPanel } from './components/review/CourtMapPanel';

// Ingestion components
export { IngestionPanel } from './components/ingestion/IngestionPanel';

// Committee components
export { CommitteeListView } from './components/committees/CommitteeListView';
export { CommitteeRoom } from './components/committees/CommitteeRoom';

// Teaching components
export { TeachingPackageList } from './components/teaching/TeachingPackageList';
export { TeachingPackageEditor } from './components/teaching/TeachingPackageEditor';

// SkillDNA components
export { RefSkillDashboard } from './components/skilldna/RefSkillDashboard';

// Control room components
export { ControlRoomView } from './components/control/ControlRoomView';
export { SettingsView } from './components/control/SettingsView';
export { SystemDiagnosticsView } from './components/control/SystemDiagnosticsView';

// Types
export * from './types';

// Mock data (for development)
export * from './mock/data';

// PCOS Event Bus (Phase 12.5 + 13.2)
export {
  // Event Bus Core
  emitPcosEvent,
  publishEvent,
  buildEvent,
  subscribeToEvents,
  subscribeToEventType,
  getRecentEvents,
  getEventsByType,
  clearEventHistory,
  PCOS_EVENT_TYPES,
  ENABLE_PCOS_EVENT_LOG,
  // MCP WebSocket (Phase 13.2)
  connectToMcpKernel,
  disconnectFromMcpKernel,
  sendToMcpKernel,
  subscribeToMcpEvents,
  subscribeToMcpEventType,
  getMcpConnectionState,
  isMcpConnected,
  // Actor helpers
  HUMAN_ACTOR,
  SYSTEM_ACTOR,
  aiActor,
  humanActor,
} from './pcos/pcosEventBus';

// PCOS Event Router (Phase 13.2)
export {
  initPcosEventRouter,
  registerEventHandler,
  subscribeToPcosEventType,
  isRouterReady,
} from './pcos/pcosEventRouter';
