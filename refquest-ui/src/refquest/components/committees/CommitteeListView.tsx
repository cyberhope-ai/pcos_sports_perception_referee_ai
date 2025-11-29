/**
 * Phase 12.0: Committee List View
 *
 * Shows all active and recent committees
 */

import { useNavigate } from 'react-router-dom';
import { Users, Clock, CheckCircle, AlertTriangle, ChevronRight } from 'lucide-react';
import { mockCommittees } from '../../mock/data';

export function CommitteeListView() {
  const navigate = useNavigate();

  const statusConfig = {
    active: { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Active' },
    deliberating: { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10', label: 'Deliberating' },
    concluded: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Concluded' },
    suspended: { icon: Clock, color: 'text-slate-400', bg: 'bg-slate-500/10', label: 'Suspended' },
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Committees</h1>
        <p className="text-slate-400 mt-1">Multi-agent consensus decision boards</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Active"
          value={mockCommittees.filter(c => c.status === 'active' || c.status === 'deliberating').length}
          color="orange"
        />
        <StatCard
          label="Concluded Today"
          value={mockCommittees.filter(c => c.status === 'concluded').length}
          color="green"
        />
        <StatCard
          label="Avg Consensus"
          value={(mockCommittees.reduce((sum, c) => sum + c.consensus_score, 0) / mockCommittees.length).toFixed(2)}
          color="cyan"
        />
        <StatCard
          label="Total Rounds"
          value={mockCommittees.reduce((sum, c) => sum + c.current_round, 0)}
          color="purple"
        />
      </div>

      {/* Committee List */}
      <div className="space-y-4">
        {mockCommittees.map((committee) => {
          const status = statusConfig[committee.status];
          // StatusIcon available via status.icon if needed

          return (
            <div
              key={committee.id}
              onClick={() => navigate(`/refquest/committees/${committee.id}`)}
              className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-cyan-500/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-lg ${status.bg} flex items-center justify-center`}>
                  <Users className={`w-6 h-6 ${status.color}`} />
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-white font-medium group-hover:text-cyan-400 transition-colors">
                      {committee.name}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                    <span>{committee.participants.length} participants</span>
                    <span>Round {committee.current_round}</span>
                    <span>Type: {committee.type.replace('_', ' ')}</span>
                  </div>
                </div>

                {/* Consensus Score */}
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">
                    {(committee.consensus_score * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-slate-500">Consensus</p>
                </div>

                {/* Arrow */}
                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-cyan-400 transition-colors" />
              </div>

              {/* Participants Preview */}
              <div className="mt-4 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  {committee.participants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 px-2 py-1 bg-slate-800/50 rounded-lg text-xs"
                    >
                      <span className="w-2 h-2 rounded-full" style={{
                        backgroundColor: p.persona === 'flynn' ? '#f97316' :
                          p.persona === 'yori' ? '#22c55e' :
                          p.persona === 'tron' ? '#3b82f6' : '#94a3b8'
                      }} />
                      <span className="text-slate-300">{p.name}</span>
                      <span className="text-slate-500">{p.weight}x</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colorClasses = {
    orange: 'text-orange-400',
    green: 'text-green-400',
    cyan: 'text-cyan-400',
    purple: 'text-purple-400',
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colorClasses[color as keyof typeof colorClasses]}`}>
        {value}
      </p>
    </div>
  );
}
