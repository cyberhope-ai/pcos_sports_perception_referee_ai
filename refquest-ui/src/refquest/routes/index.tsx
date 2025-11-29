/**
 * Phase 12.0: RefQuest Routes Configuration
 *
 * All routes for the RefQuest application shell
 */

import type { RouteObject } from 'react-router-dom';

// Layout
import { RefQuestLayout } from '../layout/RefQuestLayout';

// Game views
import { GameListView } from '../components/games/GameListView';

// Review workspace
import { ReviewWorkspace } from '../components/review/ReviewWorkspace';

// Ingestion
import { IngestionPanel } from '../components/ingestion/IngestionPanel';

// Committees
import { CommitteeListView } from '../components/committees/CommitteeListView';
import { CommitteeRoom } from '../components/committees/CommitteeRoom';

// Teaching packages
import { TeachingPackageList } from '../components/teaching/TeachingPackageList';
import { TeachingPackageEditor } from '../components/teaching/TeachingPackageEditor';

// SkillDNA / TwinFlow
import { RefSkillDashboard } from '../components/skilldna/RefSkillDashboard';

// Control room
import { ControlRoomView } from '../components/control/ControlRoomView';
import { SettingsView } from '../components/control/SettingsView';

/**
 * RefQuest route definitions
 *
 * Routes:
 * - /refquest                          → GameListView (home)
 * - /refquest/game/:gameId/review      → ReviewWorkspace
 * - /refquest/ingestion                → IngestionPanel
 * - /refquest/committees               → CommitteeListView
 * - /refquest/committees/:committeeId  → CommitteeRoom
 * - /refquest/teaching                 → TeachingPackageList
 * - /refquest/teaching/:packageId      → TeachingPackageEditor
 * - /refquest/referees/:refId          → RefSkillDashboard
 * - /refquest/control-room             → ControlRoomView
 * - /refquest/settings                 → SettingsView
 */
export const refquestRoutes: RouteObject = {
  path: 'refquest',
  element: <RefQuestLayout />,
  children: [
    // Home - Games list
    {
      index: true,
      element: <GameListView />,
    },
    // Game review workspace
    {
      path: 'game/:gameId/review',
      element: <ReviewWorkspace />,
    },
    // Video ingestion
    {
      path: 'ingestion',
      element: <IngestionPanel />,
    },
    // Committees
    {
      path: 'committees',
      element: <CommitteeListView />,
    },
    {
      path: 'committees/:committeeId',
      element: <CommitteeRoom />,
    },
    // Teaching packages
    {
      path: 'teaching',
      element: <TeachingPackageList />,
    },
    {
      path: 'teaching/:packageId',
      element: <TeachingPackageEditor />,
    },
    // Referee profiles / SkillDNA
    {
      path: 'referees/:refId',
      element: <RefSkillDashboard />,
    },
    // Control room
    {
      path: 'control-room',
      element: <ControlRoomView />,
    },
    // Settings
    {
      path: 'settings',
      element: <SettingsView />,
    },
  ],
};

export default refquestRoutes;
