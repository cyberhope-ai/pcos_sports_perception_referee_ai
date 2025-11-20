/**
 * Phase 5A: Sidebar Navigation Component
 *
 * Left sidebar with navigation links and branding
 */
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Video,
  Activity,
  Users,
  BarChart3,
  Settings,
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Games', href: '/games', icon: Video },
  { name: 'Events', href: '/events', icon: Activity },
  { name: 'Officials', href: '/officials', icon: Users },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <div className="flex flex-col w-64 bg-gray-900 text-white">
      {/* Logo/Branding */}
      <div className="flex items-center h-16 px-6 border-b border-gray-800">
        <Activity className="w-8 h-8 text-primary-500 mr-3" />
        <h1 className="text-xl font-bold">RefQuest AI</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;

          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="text-xs text-gray-500">
          <p>PCOS Sports Perception</p>
          <p className="mt-1">Referee AI v1.0</p>
        </div>
      </div>
    </div>
  );
}
