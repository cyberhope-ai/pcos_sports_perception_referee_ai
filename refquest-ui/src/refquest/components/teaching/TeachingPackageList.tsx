/**
 * Phase 12.0: Teaching Package List
 *
 * Library of teaching packages and training materials
 */

import { useNavigate } from 'react-router-dom';
import { BookOpen, Play, FileText, Clock, CheckCircle, Edit, Plus, Search } from 'lucide-react';
import { mockTeachingPackages } from '../../mock/data';

export function TeachingPackageList() {
  const navigate = useNavigate();

  const statusConfig = {
    draft: { icon: Edit, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    published: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
    archived: { icon: Clock, color: 'text-slate-400', bg: 'bg-slate-500/10' },
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Teaching Packages</h1>
          <p className="text-slate-400 mt-1">Training materials and educational content</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          New Package
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input
          type="text"
          placeholder="Search packages..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
        />
      </div>

      {/* Package Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockTeachingPackages.map((pkg) => {
          const status = statusConfig[pkg.status];
          const StatusIcon = status.icon;

          return (
            <div
              key={pkg.id}
              onClick={() => navigate(`/refquest/teaching/${pkg.id}`)}
              className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-cyan-500/50 transition-all cursor-pointer group"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-purple-400" />
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${status.bg} ${status.color}`}>
                  <StatusIcon className="w-3 h-3" />
                  {pkg.status}
                </span>
              </div>

              {/* Content */}
              <h3 className="text-white font-medium mb-2 group-hover:text-cyan-400 transition-colors">
                {pkg.title}
              </h3>
              <p className="text-sm text-slate-400 line-clamp-2 mb-4">
                {pkg.description}
              </p>

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Play className="w-3 h-3" />
                  {pkg.clips.length} clips
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {pkg.quiz_questions.length} questions
                </span>
              </div>

              {/* Footer */}
              <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Updated {new Date(pkg.updated_at).toLocaleDateString()}
                </span>
                <span className="text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Open →
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {mockTeachingPackages.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 mx-auto text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No teaching packages yet</h3>
          <p className="text-slate-500 mb-4">Create your first package to get started</p>
          <button className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors">
            Create Package
          </button>
        </div>
      )}
    </div>
  );
}
