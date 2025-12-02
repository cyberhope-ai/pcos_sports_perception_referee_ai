/**
 * Phase 12.6: Ingestion Panel (Tabbed Container)
 *
 * Main ingestion view with tabs for YouTube, Upload, and Monitor
 * Replaces Phase 12.5 simple upload panel
 */

import { Youtube, Upload, Activity, Link, Cloud } from 'lucide-react';
import { useIngestionStore } from '../../state/useIngestionStore';
import { YoutubeIngestPanel } from './YoutubeIngestPanel';
import { FileUploadPanel } from './FileUploadPanel';
import { UrlIngestPanel } from './UrlIngestPanel';
import { CloudIngestPanel } from './CloudIngestPanel';
import { IngestionMonitorPanel } from './IngestionMonitorPanel';

type IngestionTab = 'youtube' | 'upload' | 'url' | 'cloud' | 'monitor';

interface TabConfig {
  id: IngestionTab;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export function IngestionPanel() {
  const { activeTab, setActiveTab, jobs } = useIngestionStore();

  // Count active jobs for badge
  const activeJobCount = jobs.filter((j) =>
    ['uploading', 'downloading', 'processing', 'processing_skilldna', 'generating_clips'].includes(j.status)
  ).length;

  const tabs: TabConfig[] = [
    {
      id: 'youtube',
      label: 'YouTube',
      icon: <Youtube className="w-4 h-4" />,
    },
    {
      id: 'upload',
      label: 'Local File',
      icon: <Upload className="w-4 h-4" />,
    },
    {
      id: 'url',
      label: 'URL Import',
      icon: <Link className="w-4 h-4" />,
    },
    {
      id: 'cloud',
      label: 'Cloud',
      icon: <Cloud className="w-4 h-4" />,
    },
    {
      id: 'monitor',
      label: 'Monitor',
      icon: <Activity className="w-4 h-4" />,
      badge: activeJobCount > 0 ? activeJobCount : undefined,
    },
  ];

  return (
    <div className="p-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Video Ingestion</h1>
        <p className="text-slate-400 mt-1">
          Import basketball game footage for AI analysis
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-1 bg-slate-900/50 border border-slate-800 rounded-xl mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-white border border-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                activeTab === tab.id
                  ? 'bg-cyan-500/30 text-cyan-300'
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-0">
        {activeTab === 'youtube' && <YoutubeIngestPanel />}
        {activeTab === 'upload' && <FileUploadPanel />}
        {activeTab === 'url' && <UrlIngestPanel />}
        {activeTab === 'cloud' && <CloudIngestPanel />}
        {activeTab === 'monitor' && <IngestionMonitorPanel />}
      </div>
    </div>
  );
}

// Re-export for backwards compatibility if needed
export { YoutubeIngestPanel } from './YoutubeIngestPanel';
export { FileUploadPanel } from './FileUploadPanel';
export { UrlIngestPanel } from './UrlIngestPanel';
export { CloudIngestPanel } from './CloudIngestPanel';
export { IngestionMonitorPanel } from './IngestionMonitorPanel';
