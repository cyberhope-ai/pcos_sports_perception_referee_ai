/**
 * Phase 5A: Referee Profile Page (Placeholder)
 *
 * SkillDNA dashboard for referee performance
 * Full implementation in Phase 5D
 */
import { useParams } from 'react-router-dom';

export function RefereeProfile() {
  const { refereeId } = useParams<{ refereeId: string }>();

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Referee Profile</h1>

        {/* Placeholder for Phase 5D */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Referee: {refereeId}</h2>
          <p className="text-gray-600">
            SkillDNA dashboard with performance metrics, trends, and comparative analysis will be implemented in Phase 5D.
          </p>
        </div>
      </div>
    </div>
  );
}
