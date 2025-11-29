/**
 * Phase 12.3: Referee Skill Dashboard
 *
 * Full-page dashboard showing referee skill profile, history, strengths/growth areas,
 * and TwinFlow alignment summary - now connected to the SkillDNA store
 */

import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  User,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Target,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  Loader2,
  Zap,
  Eye,
  RotateCcw,
  BarChart3,
} from 'lucide-react';
import { useSkillDNAStore } from '../../state/useSkillDNAStore';
import { getTopSkills, getGrowthAreas, type SkillScore } from '../../api/refquestSkillApi';
import { mockRefereeSkillDNA } from '../../mock/data';

export function RefSkillDashboard() {
  const { refId } = useParams<{ refId: string }>();
  const {
    refProfile,
    loadingProfile,
    errorProfile,
    refHistory,
    loadingHistory,
    loadRefProfile,
    loadRefHistory,
  } = useSkillDNAStore();

  // Load profile and history on mount
  useEffect(() => {
    if (refId) {
      loadRefProfile(refId);
      loadRefHistory(refId);
    }
  }, [refId, loadRefProfile, loadRefHistory]);

  if (loadingProfile) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
          <span className="text-slate-400">Loading referee profile...</span>
        </div>
      </div>
    );
  }

  if (errorProfile || !refProfile) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-red-400">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3" />
          <p>{errorProfile || 'Failed to load referee profile'}</p>
          <Link to="/refquest" className="text-cyan-400 text-sm mt-2 hover:underline">
            Return to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const strengths = getTopSkills(refProfile.skills, 3);
  const growthAreas = getGrowthAreas(refProfile.skills, 3);

  return (
    <div className="h-full flex flex-col overflow-auto bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center gap-4 mb-4">
          <Link
            to="/refquest"
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-4 flex-1">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{refProfile.name}</h1>
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded">{refProfile.leagueLevel}</span>
                <span>{refProfile.yearsExperience} years experience</span>
                <span>{refProfile.gamesOfficiated} games</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Last updated</p>
            <p className="text-xs text-slate-600">
              {new Date(refProfile.lastUpdated).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Overall Score */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="text-4xl font-bold text-white">
              {(refProfile.overallScore * 100).toFixed(0)}
            </div>
            <div className="text-sm text-slate-400">
              <div>Overall</div>
              <div>Score</div>
            </div>
          </div>
          <div className="h-12 w-px bg-slate-700" />
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-cyan-400" />
            <div>
              <div className="text-lg font-semibold text-white">
                {(refProfile.twinAlignment * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-slate-400">Twin Alignment</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Stats Overview - Legacy support */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Mechanics Score"
            value={(mockRefereeSkillDNA.avg_mechanics_score * 100).toFixed(0) + '%'}
            icon={<Target className="w-5 h-5" />}
            color="cyan"
            trend={+2.1}
          />
          <StatCard
            label="Visibility Score"
            value={(mockRefereeSkillDNA.avg_visibility_score * 100).toFixed(0) + '%'}
            icon={<Eye className="w-5 h-5" />}
            color="green"
            trend={+1.5}
          />
          <StatCard
            label="Rotation Quality"
            value={(mockRefereeSkillDNA.avg_rotation_quality * 100).toFixed(0) + '%'}
            icon={<RotateCcw className="w-5 h-5" />}
            color="purple"
            trend={-0.8}
          />
          <StatCard
            label="Position Score"
            value={(mockRefereeSkillDNA.avg_position_score * 100).toFixed(0) + '%'}
            icon={<BarChart3 className="w-5 h-5" />}
            color="orange"
            trend={+3.2}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Skill Chart + Recent Games */}
          <div className="lg:col-span-2 space-y-6">
            {/* Skill Breakdown */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-cyan-400" />
                Skill Breakdown
              </h2>
              <div className="space-y-4">
                {refProfile.skills.map((skill) => (
                  <SkillBar key={skill.key} skill={skill} />
                ))}
              </div>
            </div>

            {/* Recent Games */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-400" />
                Recent Games
              </h2>
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {refHistory.slice(0, 5).map((entry, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <div>
                        <div className="text-sm text-white">{entry.opponent}</div>
                        <div className="text-xs text-slate-500">{entry.date}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          {entry.twinAgreed ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-yellow-400" />
                          )}
                          <span className="text-xs text-slate-400">
                            {entry.twinAgreed ? 'Twin Aligned' : 'Twin Diverged'}
                          </span>
                        </div>
                        <div className={`text-sm font-medium ${
                          entry.overallDelta >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {entry.overallDelta >= 0 ? '+' : ''}
                          {(entry.overallDelta * 100).toFixed(1)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Strengths, Growth, Twin */}
          <div className="space-y-6">
            {/* Strengths */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-green-400" />
                Strengths
              </h2>
              <div className="space-y-3">
                {strengths.map((skill) => (
                  <div key={skill.key} className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">{skill.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-green-400">
                        {(skill.score * 100).toFixed(0)}
                      </span>
                      <TrendIcon trend={skill.trend} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Growth Areas */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-400" />
                Growth Areas
              </h2>
              <div className="space-y-3">
                {growthAreas.map((skill) => (
                  <div key={skill.key} className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">{skill.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-orange-400">
                        {(skill.score * 100).toFixed(0)}
                      </span>
                      <TrendIcon trend={skill.trend} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TwinFlow Summary */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-cyan-400" />
                TwinFlow Summary
              </h2>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Alignment Rate</span>
                  <span className="text-sm font-medium text-cyan-400">
                    {(refProfile.twinAlignment * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-green-500 rounded-full"
                    style={{ width: `${refProfile.twinAlignment * 100}%` }}
                  />
                </div>
              </div>
              <div className="text-xs text-slate-500 mb-3">
                Recent disagreements to review:
              </div>
              <div className="space-y-2">
                {refHistory
                  .filter(h => !h.twinAgreed)
                  .slice(0, 3)
                  .map((entry, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs"
                    >
                      <div className="text-yellow-400 font-medium">{entry.opponent}</div>
                      <div className="text-slate-400">{entry.date} - {entry.eventCount} events</div>
                    </div>
                  ))}
                {refHistory.filter(h => !h.twinAgreed).length === 0 && (
                  <div className="p-2 bg-green-500/10 border border-green-500/30 rounded text-xs text-green-400">
                    All recent calls aligned with AI Twin!
                  </div>
                )}
              </div>
            </div>

            {/* AI Recommendations */}
            <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <h4 className="text-sm font-medium text-cyan-400 mb-2">AI Recommendations</h4>
              <ul className="space-y-1 text-sm text-slate-400">
                <li>Focus on rotation timing in fast breaks</li>
                <li>Practice block/charge positioning</li>
                <li>Review high-pressure scenarios</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, trend }: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  trend?: number;
}) {
  const colorClasses = {
    cyan: 'text-cyan-400 bg-cyan-500/10',
    green: 'text-green-400 bg-green-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
    orange: 'text-orange-400 bg-orange-500/10',
  };
  const classes = colorClasses[color as keyof typeof colorClasses];

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${classes}`}>
          {icon}
        </div>
        {trend !== undefined && (
          <span className={`text-xs flex items-center gap-0.5 ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            <TrendingUp className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}

function SkillBar({ skill }: { skill: SkillScore }) {
  const percentage = skill.score * 100;
  const barColor = percentage >= 80 ? 'bg-green-500' : percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-slate-300">{skill.label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{percentage.toFixed(0)}</span>
          <TrendIcon trend={skill.trend} />
        </div>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  if (trend === 'up') {
    return <TrendingUp className="w-4 h-4 text-green-400" />;
  }
  if (trend === 'down') {
    return <TrendingDown className="w-4 h-4 text-red-400" />;
  }
  return <Minus className="w-4 h-4 text-slate-500" />;
}
