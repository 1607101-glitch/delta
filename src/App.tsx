/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DeltaMathHeader } from './components/DeltaMathHeader';
import { LiveTabSync } from './components/LiveTabSync';
import { SolverWorkspace } from './components/SolverWorkspace';
import { BookmarkletModal } from './components/BookmarkletModal';
import { ScreenshotSolverModal } from './components/ScreenshotSolverModal';
import { SolverResult } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'tab-sync' | 'solver'>('tab-sync');
  const [bookmarkletModalOpen, setBookmarkletModalOpen] = useState(false);
  const [screenshotModalOpen, setScreenshotModalOpen] = useState(false);
  const [activeResult, setActiveResult] = useState<SolverResult | null>(null);

  // If opened with ?problem=... URL parameter from bookmarklet, automatically switch to solver
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('problem')) {
        setActiveTab('solver');
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Navigation Header */}
      <DeltaMathHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenBookmarklet={() => setBookmarkletModalOpen(true)}
        onOpenScreenshot={() => setScreenshotModalOpen(true)}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'tab-sync' ? (
          <LiveTabSync onApplyResult={(res) => setActiveResult(res)} />
        ) : (
          <SolverWorkspace onSolutionSolved={(res) => setActiveResult(res)} />
        )}
      </main>

      {/* Linewize & CSP-Safe Bookmarklet Modal */}
      <BookmarkletModal
        isOpen={bookmarkletModalOpen}
        onClose={() => setBookmarkletModalOpen(false)}
      />

      {/* Screenshot OCR Modal */}
      <ScreenshotSolverModal
        isOpen={screenshotModalOpen}
        onClose={() => setScreenshotModalOpen(false)}
        onApplySolutionToWorkspace={(res) => {
          setActiveResult(res);
          setActiveTab('solver');
        }}
      />

      {/* Simple Clean Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-3.5 px-6 text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>DeltaSolve Engine Active</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Press Ctrl+V anywhere to paste screenshot</span>
            <span>•</span>
            <button
              type="button"
              onClick={() => setBookmarkletModalOpen(true)}
              className="text-sky-400 hover:text-sky-300 font-medium"
            >
              School Bookmarklet Setup
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
