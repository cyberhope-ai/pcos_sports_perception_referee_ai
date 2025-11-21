/**
 * Phase 5D: RefereeSkillCard Component
 *
 * Displays comprehensive referee SkillDNA profile
 */
import type { RefereeSkillProfile } from '../../types';
import { MetricBadge } from './MetricBadge';
import { SkillMetricGraph } from './SkillMetricGraph';
import { FoulTypeBarChart } from './FoulTypeBarChart';
import { Eye, MapPin, Target, Award } from 'lucide-react';

interface RefereeSkillCardProps {
  profile: RefereeSkillProfile;
}

export function RefereeSkillCard({ profile }: RefereeSkillCardProps) {
  // Calculate overall performance score
  const overallScore = (
    (profile.avg_mechanics_score +
     profile.avg_visibility_score +
     profile.avg_rotation_quality) / 3
  ) * 100;

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Referee SkillDNA Profile</h2>
            <p className="text-amber-100 text-sm mt-1">
              {profile.games_count} games | {profile.total_events} events analyzed
            </p>
          </div>
          <Award className="w-12 h-12 opacity-80" />
        </div>

        {/* Overall Score Badge */}
        <div className="flex items-center gap-4">
          <MetricBadge
            label="Overall Performance"
            value={overallScore}
            format="percentage"
            size="lg"
            colorThresholds={{ excellent: 85, good: 70, fair: 55 }}
          />
        </div>
      </div>

      {/* Core Metrics Grid */}
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Core Performance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <MetricBadge
            label="Mechanics"
            value={profile.avg_mechanics_score * 100}
            icon={<MapPin className="w-4 h-4" />}
          />
          <MetricBadge
            label="Visibility"
            value={profile.avg_visibility_score * 100}
            icon={<Eye className="w-4 h-4" />}
          />
          <MetricBadge
            label="Rotation Quality"
            value={profile.avg_rotation_quality * 100}
            icon={<Target className="w-4 h-4" />}
          />
        </div>

        {/* Detailed Metrics */}
        <div className="space-y-4 mb-6">
          <SkillMetricGraph
            label="Positioning & Mechanics"
            value={profile.avg_mechanics_score * 100}
            description="Average positioning and mechanics score across all games"
          />
          <SkillMetricGraph
            label="Visibility Efficiency"
            value={profile.avg_visibility_score * 100}
            description="Clear line of sight to play events"
          />
          <SkillMetricGraph
            label="Rotation Efficiency"
            value={profile.avg_rotation_quality * 100}
            description="Correct rotation timing and positioning"
          />
          <SkillMetricGraph
            label="Occlusion Factor"
            value={(1 - profile.occlusion_avg) * 100}
            description="Lower occlusion means better visibility (inverted for display)"
            colorThresholds={{ excellent: 80, good: 65, fair: 50 }}
          />
        </div>

        {/* Foul Distribution */}
        {Object.keys(profile.foul_counts_by_type || {}).length > 0 && (
          <div className="mt-6">
            <FoulTypeBarChart
              foulCounts={profile.foul_counts_by_type}
              title="Foul Types Officiated"
            />
          </div>
        )}

        {/* Additional Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="text-xs text-gray-600">Regional Coverage</div>
            <div className="text-2xl font-bold text-gray-900">
              {((profile.regional_coverage_score || 0) * 100).toFixed(0)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-600">Call Density</div>
            <div className="text-2xl font-bold text-gray-900">
              {(profile.call_density || 0).toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RefereeSkillCard;
