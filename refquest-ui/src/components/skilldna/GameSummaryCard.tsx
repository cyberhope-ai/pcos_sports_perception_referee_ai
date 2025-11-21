/**
 * Phase 5D: GameSummaryCard Component
 */
import type { GameOfficiatingSummary } from '../../types';
import { MetricBadge } from './MetricBadge';
import { SkillMetricGraph } from './SkillMetricGraph';
import { Trophy, BarChart3 } from 'lucide-react';

interface GameSummaryCardProps {
  summary: GameOfficiatingSummary;
}

export function GameSummaryCard({ summary }: GameSummaryCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Game Officiating Summary</h2>
            <p className="text-indigo-100 text-sm mt-1">{summary.events_count} events analyzed</p>
          </div>
          <Trophy className="w-12 h-12 opacity-80" />
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">League-Level Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <MetricBadge
            label="Fairness Index"
            value={summary.fairness_index_avg * 100}
            icon={<Trophy className="w-4 h-4" />}
          />
          <MetricBadge
            label="Consistency"
            value={summary.consistency_signal_avg * 100}
            icon={<BarChart3 className="w-4 h-4" />}
          />
        </div>

        <div className="space-y-4 mb-6">
          <SkillMetricGraph
            label="Fairness Index"
            value={summary.fairness_index_avg * 100}
            description="Overall fairness of officiating"
          />
          <SkillMetricGraph
            label="Consistency Signal"
            value={summary.consistency_signal_avg * 100}
            description="Consistency across all calls"
          />
          <SkillMetricGraph
            label="Regional Coverage Quality"
            value={summary.regional_coverage_quality * 100}
            description="Court coverage by officiating crew"
          />
          <SkillMetricGraph
            label="Visibility"
            value={(1 - summary.occlusion_frequency) * 100}
            description="Clear visibility (low occlusion)"
          />
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="text-xs text-gray-600">Candidate Fouls</div>
            <div className="text-2xl font-bold text-gray-900">{summary.candidate_foul_count}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600">Ref Mechanics</div>
            <div className="text-2xl font-bold text-gray-900">{summary.ref_mechanics_count || 0}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600">Crew Rotations</div>
            <div className="text-2xl font-bold text-gray-900">{summary.crew_rotation_count || 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameSummaryCard;
