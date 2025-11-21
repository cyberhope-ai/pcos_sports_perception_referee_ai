/**
 * Phase 5D: MetricBadge Component
 *
 * Displays a single metric value with color-coded indicator
 */
import { cn } from '../../utils/cn';

interface MetricBadgeProps {
  label: string;
  value: number;
  format?: 'percentage' | 'decimal' | 'integer';
  colorThresholds?: {
    excellent: number;  // >= excellent = green
    good: number;       // >= good = blue
    fair: number;       // >= fair = amber
    // < fair = red
  };
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export function MetricBadge({
  label,
  value,
  format = 'percentage',
  colorThresholds = {
    excellent: 90,
    good: 75,
    fair: 60,
  },
  size = 'md',
  icon,
}: MetricBadgeProps) {
  // Format the value based on type
  const formattedValue = (() => {
    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'decimal':
        return value.toFixed(2);
      case 'integer':
        return Math.round(value).toString();
      default:
        return value.toString();
    }
  })();

  // Determine color based on thresholds
  const getColor = () => {
    if (value >= colorThresholds.excellent) return 'text-green-700 bg-green-50 border-green-200';
    if (value >= colorThresholds.good) return 'text-blue-700 bg-blue-50 border-blue-200';
    if (value >= colorThresholds.fair) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-red-700 bg-red-50 border-red-200';
  };

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border font-semibold',
        getColor(),
        sizeClasses[size]
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <div className="flex flex-col">
        <span className="text-xs opacity-75 font-normal">{label}</span>
        <span className="font-bold">{formattedValue}</span>
      </div>
    </div>
  );
}

export default MetricBadge;
