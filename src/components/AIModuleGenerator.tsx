import React, { useState } from 'react';
import { DeltaMathProblem } from '../types';
import { Sparkles, Plus, Check, Play, BookOpen, Layers } from 'lucide-react';
import { MathRenderer } from './MathRenderer';

interface AIModuleGeneratorProps {
  onAddProblemsToAssignment: (problems: DeltaMathProblem[]) => void;
}

export const AIModuleGenerator: React.FC<AIModuleGeneratorProps> = ({
  onAddProblemsToAssignment,
}) => {
  const [topic, setTopic] = useState('Factoring Trinomials with a > 1');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [count, setCount] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedProblems, setGeneratedProblems] = useState<DeltaMathProblem[]>([]);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const popularTopics = [
    'Solving Quadratic Equations by Completing the Square',
    'Factoring Trinomials with a > 1',
    'Evaluating Logarithms with Change of Base',
    'System of 3 Equations with 3 Variables',
    'Derivatives of Trigonometric Functions (Calculus)',
    'Rational Expressions and Domain Restrictions',
    'Law of Sines and Cosines',
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setAdded(false);

    try {
      const res = await fetch('/api/generate-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: topic,
          difficulty,
          count,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate problems.');
      }

      const formatted: DeltaMathProblem[] = (data.problems || []).map((p: any, i: number) => ({
        id: p.id || `gen-${Date.now()}-${i}`,
        topic: p.topic || topic,
        category: topic,
        gradeLevel: 'Algebra 2',
        prompt: p.prompt,
        promptLatex: p.promptLatex,
        instructions: p.instructions || 'Enter exact answer.',
        deltaMathFormatAnswer: p.deltaMathFormatAnswer,
        displayLatexAnswer: p.displayLatexAnswer,
        solutionSteps: p.solutionSteps || [],
        inputPlaceholder: p.inputPlaceholder || 'Answer',
        inputType: p.inputType || 'single-value',
      }));

      setGeneratedProblems(formatted);
    } catch (err: any) {
      setError(err.message || 'Generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddAll = () => {
    if (generatedProblems.length > 0) {
      onAddProblemsToAssignment(generatedProblems);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              AI DeltaMath Curriculum Generator
            </h2>
            <p className="text-xs text-slate-400">
              Instantly create authentic DeltaMath homework modules & test banks for any topic
            </p>
          </div>
        </div>

        {/* Quick Topics */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-purple-400" />
            Popular Skills:
          </span>
          {popularTopics.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTopic(t)}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:text-purple-300 transition"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Generator Configuration */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Curriculum Skill or Topic
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-purple-500 transition"
              placeholder="e.g. Systems of Quadratic and Linear Equations"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-purple-500"
              >
                <option value="easy">Easy / Level 1</option>
                <option value="medium">Standard / Level 2</option>
                <option value="hard">Honors / Level 3</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Count
              </label>
              <select
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-purple-500"
              >
                <option value={2}>2 Problems</option>
                <option value={3}>3 Problems</option>
                <option value={5}>5 Problems</option>
              </select>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || !topic.trim()}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
        >
          {isGenerating ? (
            <>
              <Sparkles className="w-5 h-5 animate-spin text-purple-200" />
              <span>Generating Authentic DeltaMath Question Bank...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-purple-200" />
              <span>Generate Questions</span>
            </>
          )}
        </button>

        {error && (
          <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl">
            {error}
          </div>
        )}
      </div>

      {/* Generated list */}
      {generatedProblems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-200">
              Generated Questions ({generatedProblems.length}):
            </span>
            <button
              type="button"
              onClick={handleAddAll}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition"
            >
              {added ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Added to Active Assignment!</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Load Questions Into In-App Practice</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-3">
            {generatedProblems.map((prob, idx) => (
              <div
                key={prob.id || idx}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-400">Question {idx + 1}: {prob.topic}</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                    Answer: {prob.deltaMathFormatAnswer}
                  </span>
                </div>
                <p className="text-sm text-slate-200">{prob.prompt}</p>
                {prob.promptLatex && (
                  <div className="p-2.5 bg-slate-950 rounded-lg text-center overflow-x-auto">
                    <MathRenderer latex={prob.promptLatex} className="text-base text-sky-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
