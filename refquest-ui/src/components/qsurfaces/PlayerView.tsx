/**
 * Phase 5C: Player QSurface View Component
 *
 * Displays player-specific event analysis including:
 * - Individual performance metrics
 * - Foul involvement details
 * - Game impact assessment
 */
import type { QSurface, PlayerQSurface } from '../../types';
import { getPersonaColors, getPersonaBgLightClass, getPersonaBorderClass } from '../../utils/persona-colors';
import { User, Activity, Target, AlertTriangle } from 'lucide-react';

interface PlayerViewProps {
  qsurface: QSurface | PlayerQSurface;
}

export function PlayerView({ qsurface }: PlayerViewProps) {
  const colors = getPersonaColors('player');
  const metadata = qsurface.metadata || {};

  // Extract scores with defaults
  const individualPerformance = metadata.individual_performance || qsurface.scores?.individual_performance || 0;
  const foulInvolvement = metadata.foul_involvement || 'None';
  const gameImpact = metadata.game_impact || qsurface.scores?.game_impact || 0;

  const getScoreColor = (score: number): string => {
    if (score >= 85) return '#10b981'; // green-500
    if (score >= 70) return '#3b82f6'; // blue-500
    if (score >= 55) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  };

  const getPerformanceLabel = (score: number): string => {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 55) return 'Average';
    return 'Below Average';
  };

  const getImpactLevel = (score: number): string => {
    if (score >= 80) return 'High Impact';
    if (score >= 60) return 'Moderate Impact';
    if (score >= 40) return 'Low Impact';
    return 'Minimal Impact';
  };

  const getFoulInvolvementColor = (involvement: string): string => {
    const involvementLower = involvement.toLowerCase();
    if (involvementLower.includes('committed') || involvementLower.includes('primary')) return '#ef4444'; // red
    if (involvementLower.includes('drawn') || involvementLower.includes('victim')) return '#3b82f6'; // blue
    if (involvementLower.includes('witness') || involvementLower.includes('nearby')) return '#f59e0b'; // amber
    return '#6b7280'; // gray
  };

  return (
    <div className={`p-6 rounded-lg border-2 ${getPersonaBorderClass('player')} ${getPersonaBgLightClass('player')}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: colors.primary }}>
            <User className="w-5 h-5" />
            Player Analysis
          </h3>
          <div className="text-sm text-gray-600">
            Performance: <span className="font-semibold" style={{ color: getScoreColor(individualPerformance) }}>
              {individualPerformance.toFixed(1)}%
            </span>
          </div>
        </div>
        {qsurface.interpretation && (
          <p className="text-sm text-gray-700 italic">{qsurface.interpretation}</p>
        )}
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Individual Performance */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-gray-600" />
            <div className="text-xs font-medium text-gray-600">Performance</div>
          </div>
          <div className="text-2xl font-bold" style={{ color: getScoreColor(individualPerformance) }}>
            {individualPerformance.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {getPerformanceLabel(individualPerformance)}
          </div>
        </div>

        {/* Game Impact */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-gray-600" />
            <div className="text-xs font-medium text-gray-600">Game Impact</div>
          </div>
          <div className="text-2xl font-bold" style={{ color: getScoreColor(gameImpact) }}>
            {gameImpact.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {getImpactLevel(gameImpact)}
          </div>
        </div>
      </div>

      {/* Foul Involvement */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-gray-600" />
          <h4 className="text-sm font-semibold text-gray-700">Foul Involvement</h4>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Role in Event:</span>
          <span
            className="text-sm font-semibold px-3 py-1 rounded-full"
            style={{
              color: getFoulInvolvementColor(foulInvolvement),
              backgroundColor: `${getFoulInvolvementColor(foulInvolvement)}15`
            }}
          >
            {foulInvolvement}
          </span>
        </div>
        {typeof foulInvolvement === 'string' && foulInvolvement.toLowerCase().includes('committed') && (
          <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
            Player committed the foul in this event
          </div>
        )}
        {typeof foulInvolvement === 'string' && foulInvolvement.toLowerCase().includes('drawn') && (
          <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
            Foul was committed against this player
          </div>
        )}
      </div>

      {/* Performance Breakdown */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Performance Analysis</h4>
        <div className="space-y-3">
          {/* Performance Bar */}
          <div>
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Individual Performance</span>
              <span className="font-semibold">{individualPerformance.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${individualPerformance}%`,
                  backgroundColor: getScoreColor(individualPerformance),
                }}
              />
            </div>
          </div>

          {/* Game Impact Bar */}
          <div>
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Game Impact</span>
              <span className="font-semibold">{gameImpact.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${gameImpact}%`,
                  backgroundColor: getScoreColor(gameImpact),
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Event Details */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div>
            <span className="font-medium">Event ID:</span> {qsurface.event_id.substring(0, 8)}...
          </div>
          <div>
            <span className="font-medium">Persona:</span> {qsurface.persona_id || 'Player'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerView;
