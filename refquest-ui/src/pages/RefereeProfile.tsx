/**
 * Phase 5D: Referee Profile Page
 *
 * SkillDNA dashboard for referee performance metrics
 */
import { useParams } from 'react-router-dom';
import { useRefereeSkillDNA } from '../api/hooks';
import { RefereeSkillCard } from '../components/skilldna/RefereeSkillCard';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function RefereeProfile() {
  const { refereeId } = useParams<{ refereeId: string }>();
  const { data: profile, isLoading, error } = useRefereeSkillDNA(refereeId || '');

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading referee profile...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !profile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Profile</h2>
          <p className="text-gray-600 mb-4">
            {error?.message || 'Failed to load referee SkillDNA profile'}
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Referee SkillDNA Profile</h1>
          <p className="mt-2 text-gray-600">
            Comprehensive performance analysis for referee {refereeId?.substring(0, 8)}
          </p>
        </div>

        {/* Referee SkillDNA Card */}
        <RefereeSkillCard profile={profile} />
      </div>
    </div>
  );
}
