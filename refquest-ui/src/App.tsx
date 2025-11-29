/**
 * Phase 12.0: Main App Component
 *
 * Sets up React Router and React Query provider
 * Includes legacy routes and new RefQuest routes
 */
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/layout/AppLayout';
import { Home } from './pages/Home';
import { GameDashboard } from './pages/GameDashboard';
import { EventDetail } from './pages/EventDetail';
import { RefereeProfile } from './pages/RefereeProfile';

// RefQuest routes (Phase 12.0)
import { refquestRoutes } from './refquest/routes';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000, // 30 seconds
    },
  },
});

// Router configuration with legacy and RefQuest routes
const router = createBrowserRouter([
  // Legacy routes (preserved for backward compatibility)
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'game/:gameId', element: <GameDashboard /> },
      { path: 'event/:eventId', element: <EventDetail /> },
      { path: 'ref/:refereeId', element: <RefereeProfile /> },
      { path: 'player/:playerId', element: <div className="p-6">Player Profile (Phase 5D)</div> },
      { path: 'crew/:crewId', element: <div className="p-6">Crew Profile (Phase 5D)</div> },
    ],
  },
  // RefQuest routes (Phase 12.0)
  refquestRoutes,
]);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;
