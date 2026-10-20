import React, { useState, useEffect } from 'react';
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
  ClipboardPaste,
} from 'lucide-react';

interface SolverWorkspaceProps {
  onSolutionSolved?: (res: SolverResult) => void;
}

export const SolverWorkspace: React.FC<SolverWorkspaceProps> = ({ onSolutionSolved }) => {
  const [problemInput, setProblemInput] = useState('');
  const [topic, setTopic] = useState('Algebra 1 - Multi-Step Equations');
  const [isSolving, setIsSolving] = useState(false);
  const [result, setResult] = useState<SolverResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);

  // Check URL query parameter ?problem=... on mount (for Bookmarklet integration)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const probParam = params.get('problem');
      if (probParam && probParam.trim()) {
        setProblemInput(probParam.trim());
        executeSolve(probParam.trim());
      }
    }
  }, []);

  // Listen for Ctrl+V image or text paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // If user pasted an image screenshot
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
              const reader = new FileReader();
              reader.onload = (event) => {
                const base64 = event.target?.result as string;
                executeSolveImage(base64);
              };
              reader.readAsDataURL(blob);
              return;
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const executeSolveImage = async (base64Image: string) => {
    setIsSolving(true);
    setError(null);
    try {
      const res = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Image,
          mimeType: 'image/png',
          instructions: 'Pasted DeltaMath screenshot. Extract problem and solve with exact DeltaMath syntax.',
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to solve screenshot.');
      setResult(data.data);
      if (data.data.parsedProblem) setProblemInput(data.data.parsedProblem);
      if (onSolutionSolved) onSolutionSolved(data.data);

      if (data.data.deltaMathFormatAnswer) {
        navigator.clipboard.writeText(data.data.deltaMathFormatAnswer);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err: any) {
      setError(err.message || 'Error solving pasted image.');
    } finally {
      setIsSolving(false);
    }
  };

  const executeSolve = async (textToSolve?: string) => {
    const text = textToSolve || problemInput;
    if (!text.trim()) return;

    setIsSolving(true);
    setError(null);

    try {
      const res = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemText: text,
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

      if (data.data.deltaMathFormatAnswer) {
        navigator.clipboard.writeText(data.data.deltaMathFormatAnswer);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while solving.');
    } finally {
      setIsSolving(false);
    }
  };

  const presets = [
    {
      label: 'Quadratic Equation',
      text: 'Solve for x in simplest form: 2x^2 + 7x - 15 = 0',
    },
    {
      label: 'Factoring Trinomials',
      text: 'Factor completely: x^2 - 5x - 24',
    },
    {
      label: 'Linear System',
      text: 'Solve the system of equations for (x, y): 3x + 2y = 16 and 5x - 2y = 16',
    },
    {
      label: 'Logarithmic Eq',
      text: 'Solve for x: log_3(2x + 7) = 4',
    },
  ];

  const handleInsertSymbol = (sym: string) => {
    setProblemInput((prev) => prev + sym);
  };

  const copyAnswer = () => {
    if (result?.deltaMathFormatAnswer) {
      navigator.clipboard.writeText(result.deltaMathFormatAnswer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setProblemInput(text.trim());
        executeSolve(text.trim());
      }
    } catch {
      // Clipboard permission denied or manual paste required
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Input Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-sky-400" />
            <span>DeltaMath Problem Text / Formula:</span>
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition"
              title="Paste text from clipboard"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Paste Clipboard</span>
            </button>
            <button
              type="button"
              onClick={() => setShowKeypad(!showKeypad)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              {showKeypad ? 'Hide Keypad' : 'Show Keypad (√, ÷, ^)'}
            </button>
          </div>
        </div>

        <textarea
          value={problemInput}
          onChange={(e) => setProblemInput(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono text-sm focus:outline-none focus:border-sky-500 transition shadow-inner resize-y"
          placeholder="Paste problem text or press Ctrl+V with screenshot from DeltaMath..."
        />

        {/* Quick Presets */}
        <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
          <span className="text-slate-400 font-medium">Quick Examples:</span>
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setProblemInput(p.text);
                executeSolve(p.text);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-sky-300 border border-slate-700/80 transition"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Keypad */}
        {showKeypad && (
          <DeltaKeypad
            onInsert={handleInsertSymbol}
            onClear={() => setProblemInput('')}
            onBackspace={() => setProblemInput((p) => p.slice(0, -1))}
          />
        )}

        <button
          type="button"
          onClick={() => executeSolve()}
          disabled={isSolving || !problemInput.trim()}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-sky-900/40 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
        >
          {isSolving ? (
            <>
              <Sparkles className="w-5 h-5 animate-spin text-sky-200" />
              <span>Computing Exact DeltaMath Answer...</span>
            </>
          ) : (
            <>
              <Zap className="w-5 h-5 text-amber-300" />
              <span>Solve Problem & Copy Answer</span>
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
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Calculated Solution
              </span>
              <h3 className="text-base font-bold text-white mt-0.5">
                {result.topic || 'DeltaMath Problem'}
              </h3>
            </div>
            <button
              type="button"
              onClick={copyAnswer}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600/30 border border-sky-500/50 text-sky-200 hover:bg-sky-600/50 flex items-center gap-1.5 transition active:scale-95"
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
          <div className="p-5 rounded-2xl bg-slate-950 border-2 border-sky-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                DeltaMath Format:
              </span>
              <div className="text-2xl font-mono font-black text-white mt-1 select-all tracking-wide">
                {result.deltaMathFormatAnswer}
              </div>
            </div>

            {result.displayLatexAnswer && (
              <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-6">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Math Notation:
                </span>
                <div className="mt-1">
                  <MathRenderer latex={result.displayLatexAnswer} className="text-xl text-sky-300" />
                </div>
              </div>
            )}
          </div>

          {result.deltaMathInputTip && (
            <div className="p-3 bg-sky-950/40 border border-sky-800/40 rounded-xl text-xs text-sky-300 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 shrink-0 text-sky-400" />
              <div>
                <strong>Typing tip:</strong> {result.deltaMathInputTip}
              </div>
            </div>
          )}

          {/* Steps */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Step-by-Step Breakdown:
            </h4>
            <div className="space-y-2">
              {result.steps?.map((step, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5"
                >
                  <div className="text-xs font-bold text-sky-400">
                    Step {step.stepNumber || idx + 1}: {step.title}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {step.content}
                  </p>
                  {step.mathLatex && (
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center overflow-x-auto">
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
