/**
 * Phase 12.0: Teaching Package Editor
 *
 * Editor for creating and modifying teaching packages
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, Save, Play, Plus, Trash2, GripVertical, HelpCircle } from 'lucide-react';
import { mockTeachingPackages } from '../../mock/data';

export function TeachingPackageEditor() {
  const { packageId } = useParams<{ packageId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'clips' | 'quiz'>('clips');

  const pkg = mockTeachingPackages.find(p => p.id === packageId);

  if (!pkg) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-500">Package not found</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/refquest/teaching')}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">{pkg.title}</h1>
              <p className="text-sm text-slate-400">{pkg.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2 py-1 rounded-full ${
              pkg.status === 'published' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
            }`}>
              {pkg.status}
            </span>
            <button className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors">
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('clips')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'clips'
              ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Play className="w-4 h-4" />
          Clips ({pkg.clips.length})
        </button>
        <button
          onClick={() => setActiveTab('quiz')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'quiz'
              ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          Quiz ({pkg.quiz_questions.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'clips' ? (
          <ClipSelector clips={pkg.clips} />
        ) : (
          <QuizBuilder questions={pkg.quiz_questions} />
        )}
      </div>
    </div>
  );
}

function ClipSelector({ clips }: { clips: typeof mockTeachingPackages[0]['clips'] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Teaching Clips</h3>
        <button className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Add Clip
        </button>
      </div>

      {clips.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/30 rounded-xl border border-dashed border-slate-700">
          <Play className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <p className="text-slate-500">No clips added yet</p>
          <p className="text-sm text-slate-600 mt-1">Select clips from game events</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clips.map((clip, index) => (
            <div
              key={clip.id}
              className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 group"
            >
              <div className="flex items-start gap-4">
                <div className="p-2 text-slate-600 cursor-grab hover:text-slate-400">
                  <GripVertical className="w-4 h-4" />
                </div>

                {/* Thumbnail */}
                <div className="w-32 h-20 bg-slate-800 rounded flex-shrink-0 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="w-8 h-8 text-slate-600" />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-slate-500">Clip {index + 1}</span>
                    {clip.correct_call && (
                      <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-400 rounded">
                        {clip.correct_call}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white mb-2">{clip.annotation}</p>
                  <div className="flex flex-wrap gap-1">
                    {clip.key_points.map((point, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded">
                        {point}
                      </span>
                    ))}
                  </div>
                  {clip.rule_reference && (
                    <p className="text-xs text-slate-500 mt-2">{clip.rule_reference}</p>
                  )}
                </div>

                {/* Actions */}
                <button className="p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuizBuilder({ questions }: { questions: typeof mockTeachingPackages[0]['quiz_questions'] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Quiz Questions</h3>
        <button className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Add Question
        </button>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/30 rounded-xl border border-dashed border-slate-700">
          <HelpCircle className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <p className="text-slate-500">No questions added yet</p>
          <p className="text-sm text-slate-600 mt-1">Create quiz questions to test knowledge</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <div
              key={question.id}
              className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 group"
            >
              <div className="flex items-start gap-4">
                <div className="p-2 text-slate-600 cursor-grab hover:text-slate-400">
                  <GripVertical className="w-4 h-4" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded">
                      Q{index + 1}
                    </span>
                  </div>
                  <p className="text-white font-medium mb-3">{question.question}</p>

                  <div className="space-y-2">
                    {question.options.map((option, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                          i === question.correct_answer
                            ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                            : 'bg-slate-800/50 text-slate-400'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs">
                          {String.fromCharCode(65 + i)}
                        </span>
                        {option}
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 p-3 bg-slate-800/30 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Explanation:</p>
                    <p className="text-sm text-slate-400">{question.explanation}</p>
                  </div>
                </div>

                <button className="p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
