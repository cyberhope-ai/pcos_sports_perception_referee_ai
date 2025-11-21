/**
 * Phase 5D: CrewSkillCard Component
 */
import type { CrewSkillProfile } from '../../types';
import { MetricBadge } from './MetricBadge';
import { SkillMetricGraph } from './SkillMetricGraph';
import { Users, Award, TrendingUp } from 'lucide-react';

interface CrewSkillCardProps {
  profile: CrewSkillProfile;
}

export function CrewSkillCard({ profile }: CrewSkillCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Crew SkillDNA Profile</h2>
            <p className="text-purple-100 text-sm mt-1">{profile.games_count} games officiated</p>
          </div>
          <Users className="w-12 h-12 opacity-80" />
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Crew Performance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <MetricBadge
            label="Rotation Quality"
            value={profile.avg_rotation_quality * 100}
            icon={<TrendingUp className="w-4 h-4" />}
          />
          <MetricBadge
            label="Fairness Index"
            value={profile.avg_fairness_index * 100}
            icon={<Award className="w-4 h-4" />}
          />
          <MetricBadge
            label="Consistency"
            value={profile.avg_consistency_signal * 100}
            icon={<Users className="w-4 h-4" />}
          />
        </div>

        <div className="space-y-4 mb-6">
          <SkillMetricGraph
            label="Rotation Quality"
            value={profile.avg_rotation_quality * 100}
            description="Average quality of crew rotations"
          />
          <SkillMetricGraph
            label="Fairness Index"
            value={profile.avg_fairness_index * 100}
            description="Balanced and fair officiating across teams"
          />
          <SkillMetricGraph
            label="Consistency Signal"
            value={profile.avg_consistency_signal * 100}
            description="Consistency in decision-making across crew"
          />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="text-xs text-gray-600">Late Rotations</div>
            <div className="text-2xl font-bold text-gray-900">{profile.late_rotation_count}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600">Misaligned Rotations</div>
            <div className="text-2xl font-bold text-gray-900">{profile.misaligned_rotation_count}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CrewSkillCard;
