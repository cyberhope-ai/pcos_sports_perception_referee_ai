/**
 * Phase 5D: SkillMetricGraph Component
 *
 * Displays a single metric as a progress bar with label and value
 */
import { TrendingUp } from 'lucide-react';

interface SkillMetricGraphProps {
  label: string;
  value: number;
  maxValue?: number;
  unit?: string;
  colorThresholds?: {
    excellent: number;
    good: number;
    fair: number;
  };
  description?: string;
}

export function SkillMetricGraph({
  label,
  value,
  maxValue = 100,
  unit = '%',
  colorThresholds = {
    excellent: 90,
    good: 75,
    fair: 60,
  },
  description,
}: SkillMetricGraphProps) {
  const percentage = (value / maxValue) * 100;

  // Determine color based on thresholds
  const getColor = () => {
    if (value >= colorThresholds.excellent) return { bg: 'bg-green-500', text: 'text-green-700' };
    if (value >= colorThresholds.good) return { bg: 'bg-blue-500', text: 'text-blue-700' };
    if (value >= colorThresholds.fair) return { bg: 'bg-amber-500', text: 'text-amber-700' };
    return { bg: 'bg-red-500', text: 'text-red-700' };
  };

  const colors = getColor();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <span className={`text-sm font-bold ${colors.text}`}>
          {value.toFixed(1)}{unit}
        </span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className={`${colors.bg} h-3 rounded-full transition-all duration-300`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {description && (
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      )}
    </div>
  );
}

export default SkillMetricGraph;
