/**
 * Phase 12.0: Settings View
 *
 * Application settings and configuration
 */

import { Save, Server, Database, Video, Bell, Shield, Activity, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function SettingsView() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">Configure RefQuest application settings</p>
      </div>

      <div className="space-y-6">
        {/* System Diagnostics Link (Phase 13.3) */}
        <Link
          to="/refquest/settings/diagnostics"
          className="block bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-cyan-500/50 transition-colors group"
        >
          <div className="px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-medium group-hover:text-cyan-400 transition-colors">System Diagnostics</h3>
                <p className="text-sm text-slate-500">Validate GPU, CUDA, FFmpeg, YOLO, and other dependencies</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
          </div>
        </Link>

        {/* API Configuration */}
        <SettingsSection
          title="API Configuration"
          description="Backend connection settings"
          icon={<Server className="w-5 h-5" />}
        >
          <SettingsField
            label="Backend URL"
            type="text"
            defaultValue="http://localhost:8088"
            placeholder="http://localhost:8088"
          />
          <SettingsField
            label="WebSocket URL"
            type="text"
            defaultValue="ws://127.0.0.1:7890"
            placeholder="ws://127.0.0.1:7890"
          />
          <SettingsToggle
            label="Auto-reconnect"
            description="Automatically reconnect on connection loss"
            defaultChecked={true}
          />
        </SettingsSection>

        {/* Database */}
        <SettingsSection
          title="Database"
          description="PostgreSQL connection settings"
          icon={<Database className="w-5 h-5" />}
        >
          <SettingsField
            label="Database URL"
            type="text"
            defaultValue="postgresql://localhost:5432/refquest_ai"
            placeholder="postgresql://localhost:5432/refquest_ai"
          />
          <SettingsToggle
            label="Connection Pooling"
            description="Enable database connection pooling"
            defaultChecked={true}
          />
        </SettingsSection>

        {/* Video Processing */}
        <SettingsSection
          title="Video Processing"
          description="Detection and analysis settings"
          icon={<Video className="w-5 h-5" />}
        >
          <SettingsField
            label="Max Video Size (MB)"
            type="number"
            defaultValue="500"
          />
          <SettingsField
            label="Clip Padding Before (seconds)"
            type="number"
            defaultValue="3"
          />
          <SettingsField
            label="Clip Padding After (seconds)"
            type="number"
            defaultValue="5"
          />
          <SettingsToggle
            label="GPU Acceleration"
            description="Use CUDA for video processing"
            defaultChecked={true}
          />
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection
          title="Notifications"
          description="Alert and notification preferences"
          icon={<Bell className="w-5 h-5" />}
        >
          <SettingsToggle
            label="Committee Alerts"
            description="Notify when committees require attention"
            defaultChecked={true}
          />
          <SettingsToggle
            label="Override Requests"
            description="Notify on pending human overrides"
            defaultChecked={true}
          />
          <SettingsToggle
            label="Processing Complete"
            description="Notify when video processing completes"
            defaultChecked={false}
          />
        </SettingsSection>

        {/* Security */}
        <SettingsSection
          title="Security"
          description="Authentication and access control"
          icon={<Shield className="w-5 h-5" />}
        >
          <SettingsToggle
            label="Require Authentication"
            description="Require login for all operations"
            defaultChecked={false}
          />
          <SettingsToggle
            label="Audit Logging"
            description="Log all user actions for audit"
            defaultChecked={true}
          />
        </SettingsSection>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-slate-800">
          <button className="flex items-center gap-2 px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors">
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsSection({ title, description, icon, children }: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
          {icon}
        </div>
        <div>
          <h3 className="text-white font-medium">{title}</h3>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <div className="p-5 space-y-4">
        {children}
      </div>
    </div>
  );
}

function SettingsField({ label, type, defaultValue, placeholder }: {
  label: string;
  type: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm text-slate-400 mb-1.5">{label}</label>
      <input
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
      />
    </div>
  );
}

function SettingsToggle({ label, description, defaultChecked }: {
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-white">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          defaultChecked={defaultChecked}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
      </label>
    </div>
  );
}
