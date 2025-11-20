/**
 * Phase 5C: Coach QSurface View Component
 *
 * Displays coach-specific event analysis including:
 * - Team discipline and performance metrics
 * - Player-level performance data
 * - Tactical insights and recommendations
 */
import type { QSurface, CoachQSurface } from '../../types';
import { getPersonaColors, getPersonaBgLightClass, getPersonaBorderClass } from '../../utils/persona-colors';
import { Users, TrendingUp, Shield, AlertCircle } from 'lucide-react';

interface CoachViewProps {
  qsurface: QSurface | CoachQSurface;
}

export function CoachView({ qsurface }: CoachViewProps) {
  const colors = getPersonaColors('coach');
  const metadata = qsurface.metadata || {};

  // Extract scores with defaults
  const teamDiscipline = metadata.team_discipline || qsurface.scores?.team_discipline || 0;
  const playerPerformance = metadata.player_performance || {};
  const tacticalInsights = metadata.tactical_insights || [];

  // Calculate average player performance
  const avgPlayerPerformance = Object.keys(playerPerformance).length > 0
    ? Object.values(playerPerformance as Record<string, number>).reduce((a: number, b: number) => a + b, 0) / Object.keys(playerPerformance).length
    : 0;

  const getScoreColor = (score: number): string => {
    if (score >= 85) return '#10b981'; // green-500
    if (score >= 70) return '#3b82f6'; // blue-500
    if (score >= 55) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  };

  const getDisciplineLabel = (score: number): string => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Attention';
  };

  return (
    <div className={`p-6 rounded-lg border-2 ${getPersonaBorderClass('coach')} ${getPersonaBgLightClass('coach')}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: colors.primary }}>
            <Users className="w-5 h-5" />
            Coach Analysis
          </h3>
          <div className="text-sm text-gray-600">
            Team Discipline: <span className="font-semibold" style={{ color: getScoreColor(teamDiscipline) }}>
              {teamDiscipline.toFixed(1)}%
            </span>
          </div>
        </div>
        {qsurface.interpretation && (
          <p className="text-sm text-gray-700 italic">{qsurface.interpretation}</p>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Team Discipline */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-gray-600" />
            <div className="text-xs font-medium text-gray-600">Team Discipline</div>
          </div>
          <div className="text-2xl font-bold" style={{ color: getScoreColor(teamDiscipline) }}>
            {teamDiscipline.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {getDisciplineLabel(teamDiscipline)}
          </div>
        </div>

        {/* Average Player Performance */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-gray-600" />
            <div className="text-xs font-medium text-gray-600">Avg Player Performance</div>
          </div>
          <div className="text-2xl font-bold" style={{ color: getScoreColor(avgPlayerPerformance) }}>
            {avgPlayerPerformance.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {Object.keys(playerPerformance).length} players tracked
          </div>
        </div>
      </div>

      {/* Player Performance Breakdown */}
      {Object.keys(playerPerformance).length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Individual Player Performance
          </h4>
          <div className="space-y-2">
            {Object.entries(playerPerformance as Record<string, number>).map(([player, score]) => (
              <div key={player} className="bg-white p-3 rounded-lg flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{player}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${score}%`,
                        backgroundColor: getScoreColor(score),
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-12 text-right" style={{ color: getScoreColor(score) }}>
                    {score.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tactical Insights */}
      {tacticalInsights.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Tactical Insights
          </h4>
          <ul className="space-y-2">
            {tacticalInsights.map((insight: string, index: number) => (
              <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Event Details */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div>
            <span className="font-medium">Event ID:</span> {qsurface.event_id.substring(0, 8)}...
          </div>
          <div>
            <span className="font-medium">Persona:</span> {qsurface.persona_id || 'Coach'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CoachView;
