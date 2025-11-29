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

// Types
export * from './types';

// Mock data (for development)
export * from './mock/data';
