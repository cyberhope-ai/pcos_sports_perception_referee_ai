/**
 * Phase 5C: Referee QSurface View Component
 *
 * Displays referee-specific event analysis including:
 * - Positioning and mechanics scores
 * - Visibility and decision quality metrics
 * - Color-coded performance indicators
 */
import type { QSurface, RefereeQSurface } from '../../types';
import { getPersonaColors, getPersonaBgLightClass, getPersonaBorderClass } from '../../utils/persona-colors';
import { Eye, MapPin, CheckCircle, AlertTriangle } from 'lucide-react';

interface RefereeViewProps {
  qsurface: QSurface | RefereeQSurface;
}

export function RefereeView({ qsurface }: RefereeViewProps) {
  const colors = getPersonaColors('referee');
  const metadata = qsurface.metadata || {};

  // Extract scores with defaults
  const positioningScore = metadata.positioning_score || qsurface.scores?.positioning_score || 0;
  const visibilityScore = metadata.visibility_score || qsurface.scores?.visibility_score || 0;
  const mechanicsScore = metadata.mechanics_adherence || qsurface.scores?.mechanics_adherence || 0;
  const decisionQuality = metadata.decision_quality || qsurface.scores?.decision_quality || 0;
  const communicationScore = metadata.communication_effectiveness || qsurface.scores?.communication_effectiveness || 0;

  // Color coding based on score thresholds
  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#10b981'; // green-500
    if (score >= 75) return '#3b82f6'; // blue-500
    if (score >= 60) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  };

  const getScoreIcon = (score: number) => {
    if (score >= 75) return <CheckCircle className="w-5 h-5 text-green-600" />;
    return <AlertTriangle className="w-5 h-5 text-amber-600" />;
  };

  return (
    <div className={`p-6 rounded-lg border-2 ${getPersonaBorderClass('referee')} ${getPersonaBgLightClass('referee')}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold" style={{ color: colors.primary }}>
            Referee Analysis
          </h3>
          <div className="flex items-center gap-2">
            {getScoreIcon((positioningScore + visibilityScore + mechanicsScore) / 3)}
            <span className="text-sm text-gray-600">
              Overall: {((positioningScore + visibilityScore + mechanicsScore) / 3).toFixed(1)}%
            </span>
          </div>
        </div>
        {qsurface.interpretation && (
          <p className="text-sm text-gray-700 italic">{qsurface.interpretation}</p>
        )}
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {/* Positioning Score */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-gray-600" />
            <div className="text-xs font-medium text-gray-600">Positioning</div>
          </div>
          <div className="text-2xl font-bold" style={{ color: getScoreColor(positioningScore) }}>
            {positioningScore.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {positioningScore >= 85 ? 'Excellent' : positioningScore >= 70 ? 'Good' : 'Needs Improvement'}
          </div>
        </div>

        {/* Visibility Score */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-gray-600" />
            <div className="text-xs font-medium text-gray-600">Visibility</div>
          </div>
          <div className="text-2xl font-bold" style={{ color: getScoreColor(visibilityScore) }}>
            {visibilityScore.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {visibilityScore >= 85 ? 'Clear View' : visibilityScore >= 70 ? 'Adequate' : 'Obstructed'}
          </div>
        </div>

        {/* Mechanics Score */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-gray-600" />
            <div className="text-xs font-medium text-gray-600">Mechanics</div>
          </div>
          <div className="text-2xl font-bold" style={{ color: getScoreColor(mechanicsScore) }}>
            {mechanicsScore.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {mechanicsScore >= 85 ? 'Excellent' : mechanicsScore >= 70 ? 'Good' : 'Below Standard'}
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Additional Metrics</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-center p-3 bg-white rounded-lg">
            <div className="text-gray-600 text-xs">Decision Quality</div>
            <div className="font-semibold mt-1" style={{ color: getScoreColor(decisionQuality) }}>
              {decisionQuality.toFixed(1)}%
            </div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg">
            <div className="text-gray-600 text-xs">Communication</div>
            <div className="font-semibold mt-1" style={{ color: getScoreColor(communicationScore) }}>
              {communicationScore.toFixed(1)}%
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
            <span className="font-medium">Persona:</span> {qsurface.persona_id || 'Referee'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RefereeView;
