/**
 * Phase 12.0: MotherShip Status Strip
 *
 * Top status bar showing PCOS MCP connection status
 * and real-time telemetry indicators
 */

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Activity, AlertTriangle, Check } from 'lucide-react';

interface SystemStatus {
  mcp_connected: boolean;
  telemetry_active: boolean;
  committees_active: number;
  pending_overrides: number;
  last_sync: string | null;
}

export function MotherShipStatusStrip() {
  // TODO: Replace with real WebSocket connection to PCOS MCP
  const [status, setStatus] = useState<SystemStatus>({
    mcp_connected: false,
    telemetry_active: false,
    committees_active: 0,
    pending_overrides: 0,
    last_sync: null,
  });

  // Simulate connection status (replace with real WebSocket)
  useEffect(() => {
    // Simulate initial connection
    const timer = setTimeout(() => {
      setStatus({
        mcp_connected: true,
        telemetry_active: true,
        committees_active: 2,
        pending_overrides: 1,
        last_sync: new Date().toISOString(),
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <header className="h-10 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4">
      {/* Left: Connection Status */}
      <div className="flex items-center gap-4">
        {/* MCP Connection */}
        <div className={`flex items-center gap-1.5 text-xs ${
          status.mcp_connected ? 'text-green-400' : 'text-red-400'
        }`}>
          {status.mcp_connected ? (
            <Wifi className="w-3.5 h-3.5" />
          ) : (
            <WifiOff className="w-3.5 h-3.5" />
          )}
          <span>MCP {status.mcp_connected ? 'Connected' : 'Disconnected'}</span>
        </div>

        {/* Telemetry Status */}
        {status.telemetry_active && (
          <div className="flex items-center gap-1.5 text-xs text-cyan-400">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>Telemetry Active</span>
          </div>
        )}

        {/* Last Sync */}
        {status.last_sync && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Check className="w-3.5 h-3.5" />
            <span>Synced {formatTimeAgo(status.last_sync)}</span>
          </div>
        )}
      </div>

      {/* Center: Logo */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-400">PCOS</span>
        <span className="text-xs text-slate-600">·</span>
        <span className="text-xs font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
          MotherShip Dashboard
        </span>
      </div>

      {/* Right: Active Indicators */}
      <div className="flex items-center gap-4">
        {/* Active Committees */}
        {status.committees_active > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-orange-400">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            <span>{status.committees_active} Committee{status.committees_active > 1 ? 's' : ''} Active</span>
          </div>
        )}

        {/* Pending Overrides */}
        {status.pending_overrides > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-yellow-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{status.pending_overrides} Override{status.pending_overrides > 1 ? 's' : ''} Pending</span>
          </div>
        )}

        {/* Telemetry URL */}
        <code className="text-xs text-slate-600 font-mono">
          ws://127.0.0.1:7890
        </code>
      </div>
    </header>
  );
}

function formatTimeAgo(isoString: string): string {
  const now = new Date();
  const then = new Date(isoString);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
