/**
 * Phase 12.0: Action History Panel
 *
 * Shows recent actions and decisions for the current game
 */

import { Clock, CheckCircle, XCircle, AlertTriangle, Edit } from 'lucide-react';

interface ActionHistoryPanelProps {
  gameId: string;
}

// Mock action history
const mockActions = [
  { id: 'a1', type: 'call', timestamp: '12:34', description: 'Blocking foul called on #7', status: 'confirmed' },
  { id: 'a2', type: 'override', timestamp: '11:22', description: 'Override: No call → Personal foul', status: 'pending' },
  { id: 'a3', type: 'committee', timestamp: '10:15', description: 'Committee review requested', status: 'in_progress' },
  { id: 'a4', type: 'call', timestamp: '08:45', description: 'Technical foul on coach', status: 'confirmed' },
  { id: 'a5', type: 'call', timestamp: '06:30', description: 'Offensive foul on #23', status: 'confirmed' },
];

const statusIcons = {
  confirmed: CheckCircle,
  pending: AlertTriangle,
  in_progress: Clock,
  rejected: XCircle,
};

const statusColors = {
  confirmed: 'text-green-400',
  pending: 'text-yellow-400',
  in_progress: 'text-blue-400',
  rejected: 'text-red-400',
};

const typeIcons = {
  call: CheckCircle,
  override: Edit,
  committee: AlertTriangle,
};

export function ActionHistoryPanel({ gameId: _gameId }: ActionHistoryPanelProps) {
  return (
    <div className="h-full flex flex-col bg-slate-900/30">
      {/* Header */}
      <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Action History</h3>
        <span className="text-xs text-slate-500">{mockActions.length} actions</span>
      </div>

      {/* Actions List */}
      <div className="flex-1 overflow-auto">
        {mockActions.map((action) => {
          const StatusIcon = statusIcons[action.status as keyof typeof statusIcons];
          const TypeIcon = typeIcons[action.type as keyof typeof typeIcons];
          const statusColor = statusColors[action.status as keyof typeof statusColors];

          return (
            <div
              key={action.id}
              className="px-4 py-2 border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <TypeIcon className="w-3 h-3 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300 truncate">{action.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500">{action.timestamp}</span>
                    <span className={`text-xs flex items-center gap-1 ${statusColor}`}>
                      <StatusIcon className="w-3 h-3" />
                      {action.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
