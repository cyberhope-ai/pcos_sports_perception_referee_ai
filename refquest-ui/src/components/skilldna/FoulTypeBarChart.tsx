/**
 * Phase 5D: FoulTypeBarChart Component
 *
 * Displays foul distribution by type as a horizontal bar chart
 */
import { BarChart3 } from 'lucide-react';

interface FoulTypeBarChartProps {
  foulCounts: Record<string, number>;
  title?: string;
}

export function FoulTypeBarChart({ foulCounts, title = 'Foul Distribution' }: FoulTypeBarChartProps) {
  const entries = Object.entries(foulCounts);
  const totalFouls = entries.reduce((sum, [, count]) => sum + count, 0);

  if (totalFouls === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          {title}
        </h4>
        <p className="text-sm text-gray-500 text-center py-4">No fouls recorded</p>
      </div>
    );
  }

  // Sort by count descending
  const sortedEntries = entries.sort(([, a], [, b]) => b - a);

  // Color palette for different foul types
  const colors = [
    'bg-blue-500',
    'bg-amber-500',
    'bg-green-500',
    'bg-red-500',
    'bg-purple-500',
    'bg-pink-500',
  ];

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <BarChart3 className="w-4 h-4" />
        {title}
      </h4>

      <div className="space-y-3">
        {sortedEntries.map(([type, count], index) => {
          const percentage = (count / totalFouls) * 100;
          const colorClass = colors[index % colors.length];

          return (
            <div key={type} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-gray-700 capitalize">
                  {type.replace(/_/g, ' ')}
                </span>
                <span className="text-gray-600">
                  {count} ({percentage.toFixed(0)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`${colorClass} h-2 rounded-full transition-all`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Total Fouls</span>
          <span className="font-semibold text-gray-900">{totalFouls}</span>
        </div>
      </div>
    </div>
  );
}

export default FoulTypeBarChart;
