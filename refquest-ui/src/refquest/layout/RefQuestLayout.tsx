/**
 * Phase 12.5: RefQuest Layout
 *
 * Main layout wrapper for the RefQuest App Shell
 * Includes sidebar navigation, status strip, and PCOS Event Console
 */

import { Outlet } from 'react-router-dom';
import { RefQuestSidebar } from './RefQuestSidebar';
import { MotherShipStatusStrip } from './MotherShipStatusStrip';
import { PcosEventConsole, usePcosConsoleShortcut } from '../pcos/PcosEventConsole';

export function RefQuestLayout() {
  const [isConsoleOpen, toggleConsole] = usePcosConsoleShortcut();

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* MotherShip Status Strip - PCOS MCP Connection Status */}
      <MotherShipStatusStrip />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <RefQuestSidebar />

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* PCOS Event Console - Toggle with Ctrl+Shift+E */}
      <PcosEventConsole isOpen={isConsoleOpen} onClose={toggleConsole} />
    </div>
  );
}
