import React, { useState } from 'react';
import { SolverResult } from '../types';
import { DeltaKeypad } from './DeltaKeypad';
import { MathRenderer } from './MathRenderer';
import {
  Sparkles,
  Zap,
  Check,
  Copy,
  AlertCircle,
  HelpCircle,
  Calculator,
  BookOpen,
} from 'lucide-react';

interface SolverWorkspaceProps {
  onSolutionSolved?: (res: SolverResult) => void;
}

export const SolverWorkspace: React.FC<SolverWorkspaceProps> = ({ onSolutionSolved }) => {
  const [problemInput, setProblemInput] = useState('Solve for x: 5(2x - 4) + 3 = 2(3x + 7) - 1');
  const [topic, setTopic] = useState('Algebra 1 - Multi-Step Equations');
  const [isSolving, setIsSolving] = useState(false);
  const [result, setResult] = useState<SolverResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showKeypad, setShowKeypad] = useState(true);

  const presets = [
    {
      label: 'Quadratic by Factoring',
      topic: 'Factoring Quadratics',
      text: 'Solve for all values of x in simplest form: 3x^2 + 14x - 5 = 0',
    },
    {
      label: 'System of Linear Equations',
      topic: 'Systems of Equations',
      text: 'Solve the system of equations: 4x + 3y = 25 and -2x + 5y = 7',
    },
    {
      label: 'Logarithmic Equation',
      topic: 'Logarithms',
      text: 'Solve for x: log_2(4x - 8) = 5',
    },
    {
      label: 'Derivative (Calculus)',
      topic: 'AP Calculus',
      text: 'Find the derivative f\'(x) of f(x) = (2x^3 - 5x)^4 and evaluate at x = 1',
    },
    {
      label: 'Right Triangle Trig',
      topic: 'Trigonometry',
      text: 'In right triangle ABC, angle C = 90 deg, AB = 13, BC = 5. Find angle A to nearest tenth of a degree.',
    },
  ];

  const handleInsertSymbol = (sym: string) => {
    setProblemInput((prev) => prev + sym);
  };

  const handleClear = () => {
    setProblemInput('');
  };

  const handleBackspace = () => {
    setProblemInput((prev) => prev.slice(0, -1));
  };

  const handleSolve = async () => {
    if (!problemInput.trim()) return;

    setIsSolving(true);
    setError(null);

    try {
      const res = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemText: problemInput,
          topic,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to solve problem.');
      }
      setResult(data.data);
      if (onSolutionSolved) {
        onSolutionSolved(data.data);
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while solving.');
    } finally {
      setIsSolving(false);
    }
  };

  const copyAnswer = () => {
    if (result?.deltaMathFormatAnswer) {
      navigator.clipboard.writeText(result.deltaMathFormatAnswer);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hero Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              DeltaMath Universal Problem Solver
            </h2>
            <p className="text-xs text-slate-400">
              Paste or type any math problem to generate the exact DeltaMath input & step-by-step proofs
            </p>
          </div>
        </div>

        {/* Quick presets */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            Quick Presets:
          </span>
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setProblemInput(p.text);
                setTopic(p.topic);
              }}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80 hover:text-sky-300 transition"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Math Problem Statement or Equation:
          </label>
          <textarea
            value={problemInput}
            onChange={(e) => setProblemInput(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition shadow-inner resize-y"
            placeholder="Type equation or paste problem from DeltaMath..."
          />
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Topic Filter:</span>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-sky-500"
            >
              <option>Algebra 1 - Multi-Step Equations</option>
              <option>Factoring Quadratics</option>
              <option>Quadratic Formula</option>
              <option>Systems of Equations</option>
              <option>Graphing Parabolas & Lines</option>
              <option>Logarithms & Exponentials</option>
              <option>Trigonometry</option>
              <option>Geometry</option>
              <option>AP Calculus (Derivatives/Integrals)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowKeypad(!showKeypad)}
            className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1"
          >
            {showKeypad ? 'Hide Symbol Pad' : 'Show Symbol Pad'}
          </button>
        </div>

        {/* Delta Keypad */}
        {showKeypad && (
          <DeltaKeypad
            onInsert={handleInsertSymbol}
            onClear={handleClear}
            onBackspace={handleBackspace}
          />
        )}

        <button
          type="button"
          onClick={handleSolve}
          disabled={isSolving || !problemInput.trim()}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-sky-900/40 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
        >
          {isSolving ? (
            <>
              <Sparkles className="w-5 h-5 animate-spin text-sky-200" />
              <span>Solving with DeltaMath Step Engine...</span>
            </>
          ) : (
            <>
              <Zap className="w-5 h-5 text-amber-300" />
              <span>Auto-Solve & Generate DeltaMath Formatting</span>
            </>
          )}
        </button>

        {error && (
          <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Solution Display */}
      {result && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in">
          {/* Top Result Banner */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                Verified DeltaMath Solution
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">
                {result.topic || 'Solved Expression'}
              </h3>
            </div>
            <button
              type="button"
              onClick={copyAnswer}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600/30 border border-sky-500/50 text-sky-200 hover:bg-sky-600/50 flex items-center gap-1.5 transition active:scale-95 shadow-sm"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Exact DeltaMath Input</span>
                </>
              )}
            </button>
          </div>

          {/* Exact Answer Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/80 to-slate-900 border-2 border-sky-500/50 shadow-inner flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                DeltaMath Format (Exact Input):
              </span>
              <div className="text-2xl font-mono font-black text-white mt-1 select-all tracking-wide">
                {result.deltaMathFormatAnswer}
              </div>
            </div>

            {result.displayLatexAnswer && (
              <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-6">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Mathematical Notation:
                </span>
                <div className="mt-1">
                  <MathRenderer latex={result.displayLatexAnswer} className="text-xl text-sky-300" />
                </div>
              </div>
            )}
          </div>

          {/* Input formatting advice */}
          {result.deltaMathInputTip && (
            <div className="p-3 bg-sky-950/40 border border-sky-800/40 rounded-xl text-xs text-sky-300 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 shrink-0 text-sky-400" />
              <div>
                <strong>How to type into DeltaMath:</strong> {result.deltaMathInputTip}
              </div>
            </div>
          )}

          {/* Common Mistakes */}
          {result.commonMistakes && result.commonMistakes.length > 0 && (
            <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl text-xs text-amber-300 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-amber-400">
                <AlertCircle className="w-3.5 h-3.5" />
                Watch Out For DeltaMath Traps:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-slate-300 pl-1">
                {result.commonMistakes.map((mistake, idx) => (
                  <li key={idx}>{mistake}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Step-by-Step Breakdown */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              DeltaMath Step-by-Step Solution Breakdown:
            </h4>
            <div className="space-y-3">
              {result.steps?.map((step, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-400">
                      Step {step.stepNumber || idx + 1}: {step.title}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {step.content}
                  </p>
                  {step.mathLatex && (
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 text-center overflow-x-auto">
                      <MathRenderer latex={step.mathLatex} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
