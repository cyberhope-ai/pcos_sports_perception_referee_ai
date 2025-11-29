/**
 * Phase 12.0: RefQuest Sidebar Navigation
 *
 * Main navigation sidebar for the RefQuest App Shell
 */

import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Video,
  Upload,
  Users,
  BookOpen,
  User,
  Settings,
  Gavel,
  Activity,
  ChevronRight,
  Zap,
} from 'lucide-react';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

function NavItem({ to, icon, label, badge }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
          isActive
            ? 'bg-cyan-500/20 text-cyan-400 border-l-2 border-cyan-400'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
        }`
      }
    >
      <span className="w-5 h-5">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="px-1.5 py-0.5 text-xs bg-orange-500/20 text-orange-400 rounded-full">
          {badge}
        </span>
      )}
      <ChevronRight className="w-4 h-4 opacity-50" />
    </NavLink>
  );
}

export function RefQuestSidebar() {
  const location = useLocation();

  // Extract game ID from path if in game context
  const gameMatch = location.pathname.match(/\/refquest\/game\/([^/]+)/);
  const currentGameId = gameMatch ? gameMatch[1] : null;

  return (
    <aside className="w-64 bg-slate-900/50 border-r border-slate-800 flex flex-col">
      {/* Logo/Brand */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Gavel className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">RefQuest</h1>
            <p className="text-xs text-slate-500">AI Officiating Shell</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* Main Navigation */}
        <div className="mb-4">
          <p className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Main
          </p>
          <NavItem to="/refquest" icon={<Home className="w-5 h-5" />} label="Games & Sessions" />
          <NavItem to="/refquest/ingestion" icon={<Upload className="w-5 h-5" />} label="Ingestion" badge={2} />
        </div>

        {/* Game Context Navigation (shown when in game) */}
        {currentGameId && (
          <div className="mb-4">
            <p className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Current Game
            </p>
            <NavItem
              to={`/refquest/game/${currentGameId}/review`}
              icon={<Video className="w-5 h-5" />}
              label="Review Workspace"
            />
          </div>
        )}

        {/* Committees */}
        <div className="mb-4">
          <p className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Committees
          </p>
          <NavItem to="/refquest/committees" icon={<Users className="w-5 h-5" />} label="Committee List" badge={1} />
        </div>

        {/* Teaching & Training */}
        <div className="mb-4">
          <p className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Teaching
          </p>
          <NavItem to="/refquest/teaching" icon={<BookOpen className="w-5 h-5" />} label="Teaching Packages" />
        </div>

        {/* SkillDNA & TwinFlow */}
        <div className="mb-4">
          <p className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
            SkillDNA & TwinFlow
          </p>
          <NavItem to="/refquest/referees/1" icon={<User className="w-5 h-5" />} label="Referee Profiles" />
          <NavItem to="/refquest/referees/demo" icon={<Zap className="w-5 h-5" />} label="AI Twin Demo" />
        </div>

        {/* Control Room */}
        <div className="mb-4">
          <p className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Control
          </p>
          <NavItem to="/refquest/control-room" icon={<Activity className="w-5 h-5" />} label="Control Room" badge={1} />
        </div>
      </nav>

      {/* Settings Footer */}
      <div className="p-3 border-t border-slate-800">
        <NavItem to="/refquest/settings" icon={<Settings className="w-5 h-5" />} label="Settings" />
      </div>

      {/* PCOS Version */}
      <div className="px-4 py-2 border-t border-slate-800 bg-slate-900/30">
        <p className="text-xs text-slate-600 text-center">
          PCOS MCP v1.2 · Phase 12.5
        </p>
      </div>
    </aside>
  );
}
