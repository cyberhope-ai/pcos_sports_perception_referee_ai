/**
 * Phase 12.0: Control Room View
 *
 * Human override and persona controls
 */

import { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock, Sliders, Eye, Shield } from 'lucide-react';
import { mockOverrides, mockPersonaConfigs } from '../../mock/data';

export function ControlRoomView() {
  const [activeTab, setActiveTab] = useState<'overrides' | 'personas' | 'inspector'>('overrides');

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50">
        <h1 className="text-2xl font-bold text-white">Control Room</h1>
        <p className="text-slate-400 mt-1">Human oversight and system configuration</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <TabButton
          active={activeTab === 'overrides'}
          onClick={() => setActiveTab('overrides')}
          icon={<AlertTriangle className="w-4 h-4" />}
          label="Overrides"
          badge={mockOverrides.filter(o => o.status === 'pending').length}
        />
        <TabButton
          active={activeTab === 'personas'}
          onClick={() => setActiveTab('personas')}
          icon={<Sliders className="w-4 h-4" />}
          label="Persona Controls"
        />
        <TabButton
          active={activeTab === 'inspector'}
          onClick={() => setActiveTab('inspector')}
          icon={<Eye className="w-4 h-4" />}
          label="PCOS Inspector"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'overrides' && <OverrideList />}
        {activeTab === 'personas' && <PersonaControls />}
        {activeTab === 'inspector' && <PcosInspectorPanel />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, badge }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
        active
          ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
      }`}
    >
      {icon}
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="px-1.5 py-0.5 text-xs bg-orange-500/20 text-orange-400 rounded-full">
          {badge}
        </span>
      )}
    </button>
  );
}

function OverrideList() {
  const statusConfig = {
    pending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    approved: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
    rejected: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Human Overrides</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            {mockOverrides.filter(o => o.status === 'pending').length} pending
          </span>
        </div>
      </div>

      {mockOverrides.map((override) => {
        const status = statusConfig[override.status];
        const StatusIcon = status.icon;

        return (
          <div
            key={override.id}
            className="bg-slate-900/50 border border-slate-800 rounded-lg p-4"
          >
            <div className="flex items-start gap-4">
              {/* Status Icon */}
              <div className={`w-10 h-10 rounded-lg ${status.bg} flex items-center justify-center flex-shrink-0`}>
                <StatusIcon className={`w-5 h-5 ${status.color}`} />
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-white font-medium">Override Request</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                      {override.status}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(override.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Original Call</p>
                    <p className="text-sm text-slate-300">{override.original_call}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Override To</p>
                    <p className="text-sm text-orange-400">{override.override_call}</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-800/30 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Reason</p>
                  <p className="text-sm text-slate-400">{override.reason}</p>
                </div>

                {override.status === 'pending' && (
                  <div className="flex gap-2 mt-4">
                    <button className="flex-1 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm transition-colors">
                      Approve
                    </button>
                    <button className="flex-1 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors">
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PersonaControls() {
  const [configs, setConfigs] = useState(mockPersonaConfigs);

  const personaColors = {
    flynn: 'orange',
    yori: 'green',
    tron: 'blue',
    referee: 'purple',
    coach: 'yellow',
    league: 'cyan',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Persona Configuration</h3>
        <button className="px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors">
          Reset to Defaults
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {configs.map((config) => {
          const color = personaColors[config.persona_id as keyof typeof personaColors] || 'slate';

          return (
            <div
              key={config.persona_id}
              className="bg-slate-900/50 border border-slate-800 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: `var(--${color}-500, #64748b)` }}
                  />
                  <span className="text-white font-medium">{config.name}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => {
                      setConfigs(configs.map(c =>
                        c.persona_id === config.persona_id
                          ? { ...c, enabled: e.target.checked }
                          : c
                      ));
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>

              {/* Weight Slider */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Weight</span>
                  <span className="text-slate-400">{config.weight}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={config.weight}
                  onChange={(e) => {
                    setConfigs(configs.map(c =>
                      c.persona_id === config.persona_id
                        ? { ...c, weight: parseFloat(e.target.value) }
                        : c
                    ));
                  }}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Bias Adjustments */}
              {Object.keys(config.bias_adjustments).length > 0 && (
                <div className="pt-3 border-t border-slate-800">
                  <p className="text-xs text-slate-500 mb-2">Bias Adjustments</p>
                  {Object.entries(config.bias_adjustments).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-xs">
                      <span className="text-slate-400 capitalize">{key}</span>
                      <span className={value > 0 ? 'text-green-400' : 'text-red-400'}>
                        {value > 0 ? '+' : ''}{value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PcosInspectorPanel() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">PCOS Inspector</h3>
        <span className="text-xs px-2 py-1 bg-slate-800 text-slate-400 rounded">
          Placeholder
        </span>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center">
        <Shield className="w-16 h-16 mx-auto text-slate-600 mb-4" />
        <h4 className="text-lg font-medium text-white mb-2">PCOS MCP Inspector</h4>
        <p className="text-slate-500 mb-4">
          Real-time system inspection and debugging tools
        </p>
        <p className="text-sm text-slate-600">
          TODO: Connect to PCOS MCP telemetry stream
        </p>

        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-slate-800/30 rounded-lg">
            <p className="text-2xl font-bold text-cyan-400">--</p>
            <p className="text-xs text-slate-500">Active Tasks</p>
          </div>
          <div className="p-3 bg-slate-800/30 rounded-lg">
            <p className="text-2xl font-bold text-green-400">--</p>
            <p className="text-xs text-slate-500">QSurfaces/min</p>
          </div>
          <div className="p-3 bg-slate-800/30 rounded-lg">
            <p className="text-2xl font-bold text-purple-400">--</p>
            <p className="text-xs text-slate-500">Committees</p>
          </div>
        </div>
      </div>
    </div>
  );
}
