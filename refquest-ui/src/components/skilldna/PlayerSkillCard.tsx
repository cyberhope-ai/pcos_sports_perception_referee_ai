/**
 * Phase 5D: PlayerSkillCard Component
 */
import type { PlayerSkillProfile } from '../../types';
import { MetricBadge } from './MetricBadge';
import { SkillMetricGraph } from './SkillMetricGraph';
import { FoulTypeBarChart } from './FoulTypeBarChart';
import { User, Shield, AlertTriangle } from 'lucide-react';

interface PlayerSkillCardProps {
  profile: PlayerSkillProfile;
}

export function PlayerSkillCard({ profile }: PlayerSkillCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Player SkillDNA Profile</h2>
            <p className="text-green-100 text-sm mt-1">
              {profile.games_count} games | {profile.total_fouls} total fouls
            </p>
          </div>
          <User className="w-12 h-12 opacity-80" />
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <MetricBadge
            label="Decision Quality"
            value={profile.avg_decision_quality_score * 100}
            icon={<User className="w-4 h-4" />}
          />
          <MetricBadge
            label="Defensive Discipline"
            value={profile.defensive_discipline * 100}
            icon={<Shield className="w-4 h-4" />}
          />
          <MetricBadge
            label="Risk Index"
            value={(1 - profile.risk_index) * 100}
            icon={<AlertTriangle className="w-4 h-4" />}
            colorThresholds={{ excellent: 75, good: 60, fair: 45 }}
          />
        </div>

        <div className="space-y-4 mb-6">
          <SkillMetricGraph
            label="Decision Quality"
            value={profile.avg_decision_quality_score * 100}
            description="Average decision-making quality across games"
          />
          <SkillMetricGraph
            label="Defensive Discipline"
            value={profile.defensive_discipline * 100}
            description="Ability to defend without committing fouls"
          />
        </div>

        {Object.keys(profile.foul_counts_by_type || {}).length > 0 && (
          <div className="mt-6">
            <FoulTypeBarChart
              foulCounts={profile.foul_counts_by_type}
              title="Foul Tendencies"
            />
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="text-xs text-gray-600">Fouls per 100 Frames</div>
            <div className="text-2xl font-bold text-gray-900">
              {profile.fouls_per_100_frames.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-600">Total Fouls</div>
            <div className="text-2xl font-bold text-gray-900">{profile.total_fouls}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerSkillCard;
