/**
 * Phase 5A: Main App Component
 *
 * Sets up React Router and React Query provider
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/layout/AppLayout';
import { Home } from './pages/Home';
import { GameDashboard } from './pages/GameDashboard';
import { EventDetail } from './pages/EventDetail';
import { RefereeProfile } from './pages/RefereeProfile';

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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Home />} />
            <Route path="game/:gameId" element={<GameDashboard />} />
            <Route path="event/:eventId" element={<EventDetail />} />
            <Route path="ref/:refereeId" element={<RefereeProfile />} />
            <Route path="player/:playerId" element={<div className="p-6">Player Profile (Phase 5D)</div>} />
            <Route path="crew/:crewId" element={<div className="p-6">Crew Profile (Phase 5D)</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
