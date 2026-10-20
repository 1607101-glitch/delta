import React, { useState, useEffect } from 'react';
import { DeltaMathAssignment, DeltaMathProblem, SolverResult } from '../types';
import { MathRenderer } from './MathRenderer';
import { InteractiveGrapher } from './InteractiveGrapher';
import { DeltaKeypad } from './DeltaKeypad';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  XCircle,
  Zap,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Bot,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

interface AssignmentWorkspaceProps {
  assignments: DeltaMathAssignment[];
  currentAssignmentIndex: number;
  setCurrentAssignmentIndex: (idx: number) => void;
  currentProblemIndex: number;
  setCurrentProblemIndex: (idx: number) => void;
  userAnswer: string;
  setUserAnswer: (ans: string) => void;
  onSubmitAnswer: () => void;
  onAutoSolveCurrent: () => void;
  isAutoSolving: boolean;
  activeResult: SolverResult | null;
  submissionState: 'unsubmitted' | 'correct' | 'incorrect';
  penaltyCount: number;
  score: number;
  targetScore: number;
  showSolutionStep: boolean;
  setShowSolutionStep: (val: boolean) => void;
}

export const AssignmentWorkspace: React.FC<AssignmentWorkspaceProps> = ({
  assignments,
  currentAssignmentIndex,
  setCurrentAssignmentIndex,
  currentProblemIndex,
  setCurrentProblemIndex,
  userAnswer,
  setUserAnswer,
  onSubmitAnswer,
  onAutoSolveCurrent,
  isAutoSolving,
  activeResult,
  submissionState,
  penaltyCount,
  score,
  targetScore,
  showSolutionStep,
  setShowSolutionStep,
}) => {
  const [showKeypad, setShowKeypad] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  const activeAssignment = assignments[currentAssignmentIndex] || assignments[0];
  const activeProblem: DeltaMathProblem | undefined =
    activeAssignment.problems[currentProblemIndex] || activeAssignment.problems[0];

  // Trigger celebration confetti on correct
  useEffect(() => {
    if (submissionState === 'correct') {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    }
  }, [submissionState]);

  if (!activeProblem) {
    return <div className="p-8 text-center text-slate-400">No problems available in this module.</div>;
  }

  const handleInsertSymbol = (sym: string) => {
    setUserAnswer(userAnswer + sym);
  };

  const handleClear = () => {
    setUserAnswer('');
  };

  const handleBackspace = () => {
    setUserAnswer(userAnswer.slice(0, -1));
  };

  const handleNextProblem = () => {
    if (currentProblemIndex < activeAssignment.problems.length - 1) {
      setCurrentProblemIndex(currentProblemIndex + 1);
    } else {
      setCurrentProblemIndex(0);
    }
  };

  const handlePrevProblem = () => {
    if (currentProblemIndex > 0) {
      setCurrentProblemIndex(currentProblemIndex - 1);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Assignment Navigation Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-600/20 text-sky-400 border border-blue-500/30">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
                {activeAssignment.course}
              </span>
              <span className="text-[10px] text-slate-500">•</span>
              <span className="text-[10px] text-slate-400">Teacher: {activeAssignment.teacher}</span>
            </div>
            {/* Assignment Dropdown */}
            <select
              value={currentAssignmentIndex}
              onChange={(e) => {
                setCurrentAssignmentIndex(parseInt(e.target.value, 10));
                setCurrentProblemIndex(0);
              }}
              className="bg-transparent font-bold text-base text-white focus:outline-none cursor-pointer hover:text-sky-300 transition"
            >
              {assignments.map((asg, idx) => (
                <option key={asg.id} value={idx} className="bg-slate-900 text-slate-100">
                  {asg.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Progress Bar & Counter */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-semibold text-slate-200">
              Problem {currentProblemIndex + 1} of {activeAssignment.problems.length}
            </div>
            <div className="text-[10px] text-slate-400">Goal: {targetScore} complete</div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevProblem}
              disabled={currentProblemIndex === 0}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition"
              title="Previous Problem"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextProblem}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Next Problem"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Problem Workspace Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* DeltaMath Classic Problem Header */}
        <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              {activeProblem.topic}
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
              {activeProblem.gradeLevel}
            </span>
          </div>

          {/* Quick Auto-Solve Problem Button */}
          <button
            type="button"
            onClick={onAutoSolveCurrent}
            disabled={isAutoSolving}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-sky-950/50 flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isAutoSolving ? (
              <>
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>DeltaBot Thinking...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Auto-Solve This</span>
              </>
            )}
          </button>
        </div>

        {/* Problem Statement Body */}
        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <p className="text-base text-slate-200 font-medium leading-relaxed">
              {activeProblem.prompt}
            </p>

            {/* LaTeX Mathematical Formula */}
            {activeProblem.promptLatex && (
              <div className="py-4 px-6 rounded-xl bg-slate-950/80 border border-slate-800/80 text-center shadow-inner overflow-x-auto">
                <MathRenderer latex={activeProblem.promptLatex} className="text-2xl text-sky-300 font-medium" />
              </div>
            )}

            {/* Instructions */}
            <div className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              <span>{activeProblem.instructions}</span>
            </div>
          </div>

          {/* Interactive Grapher if Graph Problem */}
          {activeProblem.inputType === 'graph' && (
            <div className="py-2">
              <InteractiveGrapher
                graphData={activeProblem.graphData}
                onAnswerChange={(ans) => setUserAnswer(ans)}
                isAutoSolved={Boolean(activeResult)}
              />
            </div>
          )}

          {/* Submission Feedback Banner */}
          {submissionState === 'correct' && (
            <div className="p-4 rounded-xl bg-emerald-950/70 border-2 border-emerald-500 text-emerald-200 flex items-center justify-between animate-in zoom-in-95">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-emerald-100">Correct! Full Credit Awarded</h4>
                  <p className="text-xs text-emerald-300">
                    +1.00 added to your DeltaMath score.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleNextProblem}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow transition flex items-center gap-1.5"
              >
                <span>Next Problem</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {submissionState === 'incorrect' && (
            <div className="p-4 rounded-xl bg-rose-950/70 border-2 border-rose-600 text-rose-200 space-y-2 animate-in shake">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm text-rose-100">Incorrect Answer</h4>
                    <p className="text-xs text-rose-300">
                      DeltaMath penalty applied: -{activeAssignment.penaltyPerMistake} pts
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSolutionStep(true)}
                  className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-900 text-xs font-semibold rounded-lg border border-rose-700 text-rose-200"
                >
                  View Full Solution
                </button>
              </div>
            </div>
          )}

          {/* DeltaMath Input Section */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Your Answer:
              </label>
              <button
                type="button"
                onClick={() => setShowKeypad(!showKeypad)}
                className="text-xs text-sky-400 hover:text-sky-300 font-medium"
              >
                {showKeypad ? 'Hide Math Keypad' : 'Show Math Keypad (√, ÷, ^)'}
              </button>
            </div>

            {showKeypad && (
              <DeltaKeypad
                onInsert={handleInsertSymbol}
                onClear={handleClear}
                onBackspace={handleBackspace}
              />
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onSubmitAnswer();
                    }
                  }}
                  disabled={submissionState === 'correct'}
                  placeholder={activeProblem.inputPlaceholder || 'Type answer...'}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-base focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition shadow-inner disabled:opacity-60"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onSubmitAnswer}
                  disabled={!userAnswer.trim() || submissionState === 'correct'}
                  className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-950/50 transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  Submit Answer
                </button>

                <button
                  type="button"
                  onClick={() => setShowSolutionStep(!showSolutionStep)}
                  className="px-3.5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
                  title="Show DeltaMath Solution Steps"
                >
                  {showSolutionStep ? 'Hide Steps' : 'Solution'}
                </button>
              </div>
            </div>
          </div>

          {/* Step-by-Step DeltaMath Explanations Box */}
          {showSolutionStep && (
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                    Official DeltaMath Solution Guide
                  </span>
                </div>
                <div className="font-mono text-xs text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                  Target: {activeProblem.deltaMathFormatAnswer}
                </div>
              </div>

              <div className="space-y-3">
                {activeProblem.solutionSteps.map((step, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/80 space-y-1.5">
                    <div className="text-xs font-bold text-sky-300">
                      Step {step.stepNumber}: {step.title}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {step.content}
                    </p>
                    {step.mathLatex && (
                      <div className="p-2.5 rounded bg-slate-950 text-center overflow-x-auto">
                        <MathRenderer latex={step.mathLatex} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
