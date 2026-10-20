/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { DeltaMathHeader } from './components/DeltaMathHeader';
import { AssignmentWorkspace } from './components/AssignmentWorkspace';
import { SolverWorkspace } from './components/SolverWorkspace';
import { AIModuleGenerator } from './components/AIModuleGenerator';
import { DeltaBotOverlay } from './components/DeltaBotOverlay';
import { LoginModal } from './components/LoginModal';
import { ScreenshotSolverModal } from './components/ScreenshotSolverModal';
import { LiveWebProxyBrowser } from './components/LiveWebProxyBrowser';
import { BookmarkletModal } from './components/BookmarkletModal';
import { DEFAULT_ASSIGNMENTS } from './data/defaultAssignments';
import { DeltaMathAssignment, DeltaMathProblem, StudentSession, SolverResult } from './types';
import confetti from 'canvas-confetti';
import { Check, ShieldCheck, Sparkles, ExternalLink, RefreshCw } from 'lucide-react';

const LOCAL_STORAGE_SESSION_KEY = 'deltasolve_student_session';

export default function App() {
  // Session State
  const [session, setSession] = useState<StudentSession>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not load session from localStorage');
    }
    return {
      isLoggedIn: true,
      studentName: 'Jacob Mitchell',
      email: 'jacob221355photos@gmail.com',
      teacherName: 'Mr. Henderson',
      schoolName: 'Lincoln High School',
      period: 'Period 3 (Honors Alg 2)',
      classCode: 'HEND-8842',
      sessionToken: 'dm_tok_active_8892',
    };
  });

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [screenshotModalOpen, setScreenshotModalOpen] = useState(false);
  const [bookmarkletModalOpen, setBookmarkletModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'live-proxy' | 'assignment' | 'custom-solver' | 'generator'>('live-proxy');

  // Assignment & Problem State
  const [assignments, setAssignments] = useState<DeltaMathAssignment[]>(DEFAULT_ASSIGNMENTS);
  const [currentAssignmentIndex, setCurrentAssignmentIndex] = useState(0);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [submissionState, setSubmissionState] = useState<'unsubmitted' | 'correct' | 'incorrect'>('unsubmitted');
  const [score, setScore] = useState(2);
  const [penaltyCount, setPenaltyCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(214);
  const [showSolutionStep, setShowSolutionStep] = useState(false);

  // DeltaBot Auto-Pilot & Solver State
  const [isSolving, setIsSolving] = useState(false);
  const [isAutoPilot, setIsAutoPilot] = useState(false);
  const [stealthDelay, setStealthDelay] = useState(2);
  const [humanTyping, setHumanTyping] = useState(true);
  const [activeResult, setActiveResult] = useState<SolverResult | null>(null);

  const activeAssignment = assignments[currentAssignmentIndex] || assignments[0];
  const activeProblem = activeAssignment.problems[currentProblemIndex] || activeAssignment.problems[0];

  // Save session updates
  const handleUpdateSession = (newSession: StudentSession) => {
    setSession(newSession);
    try {
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(newSession));
    } catch (e) {
      console.warn('Failed to save session');
    }
  };

  // Timer simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Reset inputs when changing problem
  useEffect(() => {
    setUserAnswer('');
    setSubmissionState('unsubmitted');
    setActiveResult(null);
    setShowSolutionStep(false);
  }, [currentAssignmentIndex, currentProblemIndex]);

  // Simulate human keystroke typing
  const simulateTyping = async (targetText: string): Promise<void> => {
    if (!humanTyping) {
      setUserAnswer(targetText);
      return;
    }

    setUserAnswer('');
    for (let i = 0; i <= targetText.length; i++) {
      setUserAnswer(targetText.slice(0, i));
      await new Promise((r) => setTimeout(r, 25 + Math.random() * 35));
    }
  };

  // Auto-Solve Current Problem
  const handleAutoSolveCurrent = async () => {
    if (!activeProblem) return;
    setIsSolving(true);

    try {
      // If problem already has solution steps and exact format
      let resultData: SolverResult;

      if (activeProblem.deltaMathFormatAnswer && activeProblem.solutionSteps?.length) {
        resultData = {
          parsedProblem: activeProblem.prompt,
          topic: activeProblem.topic,
          deltaMathFormatAnswer: activeProblem.deltaMathFormatAnswer,
          displayLatexAnswer: activeProblem.displayLatexAnswer,
          steps: activeProblem.solutionSteps,
          deltaMathInputTip: 'Typed automatically by DeltaBot',
        };
      } else {
        const res = await fetch('/api/solve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problemText: `${activeProblem.prompt} ${activeProblem.promptLatex || ''}`,
            topic: activeProblem.topic,
            instructions: activeProblem.instructions,
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        resultData = data.data;
      }

      setActiveResult(resultData);
      // Auto-type answer into the active field
      await simulateTyping(resultData.deltaMathFormatAnswer);
    } catch (err) {
      console.error('Auto solve error:', err);
    } finally {
      setIsSolving(false);
    }
  };

  // Auto-Fill Answer
  const handleAutoFill = async () => {
    if (activeResult) {
      await simulateTyping(activeResult.deltaMathFormatAnswer);
    } else {
      await handleAutoSolveCurrent();
    }
  };

  // Submit Answer
  const handleSubmitAnswer = () => {
    if (!userAnswer.trim()) return;

    const cleanUser = userAnswer.trim().replace(/\s+/g, '').toLowerCase();
    const cleanTarget = activeProblem.deltaMathFormatAnswer.trim().replace(/\s+/g, '').toLowerCase();

    // Check primary or alternative acceptable forms
    const isCorrect =
      cleanUser === cleanTarget ||
      cleanUser === cleanTarget.replace('x=', '') ||
      (activeProblem.alternativeForms &&
        activeProblem.alternativeForms.some(
          (alt) => alt.trim().replace(/\s+/g, '').toLowerCase() === cleanUser
        ));

    if (isCorrect) {
      setSubmissionState('correct');
      setScore((prev) => Math.min(activeAssignment.requiredScore, prev + 1));
    } else {
      setSubmissionState('incorrect');
      setPenaltyCount((prev) => parseFloat((prev + activeAssignment.penaltyPerMistake).toFixed(2)));
    }
  };

  // Auto-Submit wrapper
  const handleAutoSubmit = async () => {
    if (!userAnswer.trim() && activeResult) {
      await simulateTyping(activeResult.deltaMathFormatAnswer);
    }
    handleSubmitAnswer();
  };

  // Auto-Pilot Autonomous Loop
  useEffect(() => {
    let timeoutId: any;

    if (isAutoPilot) {
      const runAutoPilotCycle = async () => {
        // If target reached
        if (score >= activeAssignment.requiredScore) {
          setIsAutoPilot(false);
          confetti({ particleCount: 100, spread: 80 });
          return;
        }

        // If currently correct, advance to next question
        if (submissionState === 'correct') {
          timeoutId = setTimeout(() => {
            if (currentProblemIndex < activeAssignment.problems.length - 1) {
              setCurrentProblemIndex((prev) => prev + 1);
            } else {
              setCurrentProblemIndex(0);
            }
          }, Math.max(1000, stealthDelay * 1000));
          return;
        }

        // If unsubmitted and no answer, auto-solve
        if (submissionState === 'unsubmitted' && !userAnswer) {
          await handleAutoSolveCurrent();
          // After solving, wait for anti-cheat stealth delay then submit
          timeoutId = setTimeout(() => {
            handleSubmitAnswer();
          }, Math.max(1500, stealthDelay * 1000));
        }
      };

      runAutoPilotCycle();
    }

    return () => clearTimeout(timeoutId);
  }, [
    isAutoPilot,
    submissionState,
    currentProblemIndex,
    score,
    stealthDelay,
    activeAssignment,
    userAnswer,
  ]);

  // Handle adding generated problems
  const handleAddGeneratedProblems = (newProblems: DeltaMathProblem[]) => {
    const updatedAssignments = [...assignments];
    updatedAssignments[currentAssignmentIndex] = {
      ...updatedAssignments[currentAssignmentIndex],
      problems: [...updatedAssignments[currentAssignmentIndex].problems, ...newProblems],
    };
    setAssignments(updatedAssignments);
    setActiveTab('assignment');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Real DeltaMath Navigation Header */}
      <DeltaMathHeader
        session={session}
        onOpenLogin={() => setLoginModalOpen(true)}
        onOpenScreenshot={() => setScreenshotModalOpen(true)}
        onOpenBookmarklet={() => setBookmarkletModalOpen(true)}
        score={score}
        maxScore={activeAssignment.requiredScore}
        penalty={penaltyCount}
        elapsedSeconds={elapsedSeconds}
        isAutoBotActive={isAutoPilot}
        onToggleAutoBot={() => setIsAutoPilot(!isAutoPilot)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Active Tab View */}
        {activeTab === 'live-proxy' && (
          <LiveWebProxyBrowser onOpenBookmarkletModal={() => setBookmarkletModalOpen(true)} />
        )}

        {activeTab === 'assignment' && (
          <AssignmentWorkspace
            assignments={assignments}
            currentAssignmentIndex={currentAssignmentIndex}
            setCurrentAssignmentIndex={setCurrentAssignmentIndex}
            currentProblemIndex={currentProblemIndex}
            setCurrentProblemIndex={setCurrentProblemIndex}
            userAnswer={userAnswer}
            setUserAnswer={setUserAnswer}
            onSubmitAnswer={handleSubmitAnswer}
            onAutoSolveCurrent={handleAutoSolveCurrent}
            isAutoSolving={isSolving}
            activeResult={activeResult}
            submissionState={submissionState}
            penaltyCount={penaltyCount}
            score={score}
            targetScore={activeAssignment.requiredScore}
            showSolutionStep={showSolutionStep}
            setShowSolutionStep={setShowSolutionStep}
          />
        )}

        {activeTab === 'custom-solver' && (
          <SolverWorkspace
            onSolutionSolved={(res) => {
              setActiveResult(res);
            }}
          />
        )}

        {activeTab === 'generator' && (
          <AIModuleGenerator onAddProblemsToAssignment={handleAddGeneratedProblems} />
        )}
      </main>

      {/* Floating DeltaBot HUD (for offline practice & custom solver) */}
      {activeTab !== 'live-proxy' && (
        <DeltaBotOverlay
          onAutoSolve={handleAutoSolveCurrent}
          onAutoFill={handleAutoFill}
          onAutoSubmit={handleAutoSubmit}
          isSolving={isSolving}
          isAutoPilot={isAutoPilot}
          onToggleAutoPilot={() => setIsAutoPilot(!isAutoPilot)}
          currentResult={activeResult}
          stealthDelay={stealthDelay}
          setStealthDelay={setStealthDelay}
          humanTyping={humanTyping}
          setHumanTyping={setHumanTyping}
        />
      )}

      {/* Login & Session Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        session={session}
        onUpdateSession={handleUpdateSession}
      />

      {/* Bookmarklet Modal */}
      <BookmarkletModal
        isOpen={bookmarkletModalOpen}
        onClose={() => setBookmarkletModalOpen(false)}
      />

      {/* Screenshot & OCR Modal */}
      <ScreenshotSolverModal
        isOpen={screenshotModalOpen}
        onClose={() => setScreenshotModalOpen(false)}
        onApplySolutionToWorkspace={(res) => {
          setActiveResult(res);
          setUserAnswer(res.deltaMathFormatAnswer);
          setActiveTab('assignment');
        }}
      />

      {/* Footer Info */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>DeltaSolve Engine Connected • Gemini 3.8 Intelligence Active</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span>Press Ctrl+V anywhere to paste DeltaMath screenshot</span>
            <span>•</span>
            <button
              type="button"
              onClick={() => setLoginModalOpen(true)}
              className="hover:text-sky-400 transition"
            >
              Session: {session.studentName}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
