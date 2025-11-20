/**
 * Phase 5C: League QSurface View Component
 *
 * Displays league-wide event analysis including:
 * - Consistency and standards compliance scores
 * - System-wide performance metrics
 * - Improvement recommendations
 */
import type { QSurface, LeagueQSurface } from '../../types';
import { getPersonaColors, getPersonaBgLightClass, getPersonaBorderClass } from '../../utils/persona-colors';
import { Award, BarChart3, TrendingUp, AlertCircle } from 'lucide-react';

interface LeagueViewProps {
  qsurface: QSurface | LeagueQSurface;
}

export function LeagueView({ qsurface }: LeagueViewProps) {
  const colors = getPersonaColors('league');
  const metadata = qsurface.metadata || {};

  // Extract scores with defaults
  const consistencyScore = metadata.consistency_score || qsurface.scores?.consistency_score || 0;
  const standardsCompliance = metadata.standards_compliance || qsurface.scores?.standards_compliance || 0;
  const improvementAreas = metadata.improvement_areas || [];

  // Calculate overall league health score
  const overallHealth = (consistencyScore + standardsCompliance) / 2;

  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#10b981'; // green-500
    if (score >= 75) return '#3b82f6'; // blue-500
    if (score >= 60) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  };

  const getHealthLabel = (score: number): string => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Improvement';
  };

  const getComplianceLabel = (score: number): string => {
    if (score >= 95) return 'Full Compliance';
    if (score >= 85) return 'High Compliance';
    if (score >= 70) return 'Moderate Compliance';
    return 'Below Standard';
  };

  return (
    <div className={`p-6 rounded-lg border-2 ${getPersonaBorderClass('league')} ${getPersonaBgLightClass('league')}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: colors.primary }}>
            <Award className="w-5 h-5" />
            League Standards Analysis
          </h3>
          <div className="text-sm text-gray-600">
            Overall Health: <span className="font-semibold" style={{ color: getScoreColor(overallHealth) }}>
              {overallHealth.toFixed(1)}%
            </span>
          </div>
        </div>
        {qsurface.interpretation && (
          <p className="text-sm text-gray-700 italic">{qsurface.interpretation}</p>
        )}
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Consistency Score */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-gray-600" />
            <div className="text-xs font-medium text-gray-600">Consistency</div>
          </div>
          <div className="text-2xl font-bold" style={{ color: getScoreColor(consistencyScore) }}>
            {consistencyScore.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {getHealthLabel(consistencyScore)}
          </div>
        </div>

        {/* Standards Compliance */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-gray-600" />
            <div className="text-xs font-medium text-gray-600">Standards Compliance</div>
          </div>
          <div className="text-2xl font-bold" style={{ color: getScoreColor(standardsCompliance) }}>
            {standardsCompliance.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {getComplianceLabel(standardsCompliance)}
          </div>
        </div>
      </div>

      {/* System Performance Metrics */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          System Performance
        </h4>

        {/* Consistency Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Consistency Across Games</span>
            <span className="font-semibold">{consistencyScore.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all"
              style={{
                width: `${consistencyScore}%`,
                backgroundColor: getScoreColor(consistencyScore),
              }}
            />
          </div>
        </div>

        {/* Standards Compliance Bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Standards Compliance</span>
            <span className="font-semibold">{standardsCompliance.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all"
              style={{
                width: `${standardsCompliance}%`,
                backgroundColor: getScoreColor(standardsCompliance),
              }}
            />
          </div>
        </div>
      </div>

      {/* Improvement Areas */}
      {improvementAreas.length > 0 && (
        <div className="border-t border-gray-200 pt-4 mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Recommended Improvements
          </h4>
          <ul className="space-y-2">
            {improvementAreas.map((area: string, index: number) => (
              <li key={index} className="text-sm text-gray-700 flex items-start gap-2 bg-purple-50 p-2 rounded">
                <span className="text-purple-500 mt-0.5">•</span>
                <span>{area}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* League Health Summary */}
      <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-600 mb-1">Overall League Health</div>
            <div className="text-2xl font-bold" style={{ color: getScoreColor(overallHealth) }}>
              {overallHealth.toFixed(1)}%
            </div>
          </div>
          <div className="text-right">
            <Award className="w-12 h-12 opacity-50" style={{ color: getScoreColor(overallHealth) }} />
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-700">
          {overallHealth >= 90 && 'League standards are being maintained at an excellent level.'}
          {overallHealth >= 75 && overallHealth < 90 && 'League operations are performing well with room for minor improvements.'}
          {overallHealth >= 60 && overallHealth < 75 && 'League performance is fair but requires attention to key areas.'}
          {overallHealth < 60 && 'League performance needs significant improvement to meet standards.'}
        </div>
      </div>

      {/* Event Details */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div>
            <span className="font-medium">Event ID:</span> {qsurface.event_id.substring(0, 8)}...
          </div>
          <div>
            <span className="font-medium">Persona:</span> {qsurface.persona_id || 'League'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LeagueView;
