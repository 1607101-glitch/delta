/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DeltaMathHeader } from './components/DeltaMathHeader';
import { LiveWebProxyBrowser } from './components/LiveWebProxyBrowser';
import { SolverWorkspace } from './components/SolverWorkspace';
import { ScreenshotSolverModal } from './components/ScreenshotSolverModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'tab-sync' | 'solver'>('tab-sync');
  const [screenshotModalOpen, setScreenshotModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Header */}
      <DeltaMathHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenScreenshot={() => setScreenshotModalOpen(true)}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'tab-sync' ? (
          <LiveWebProxyBrowser />
        ) : (
          <SolverWorkspace />
        )}
      </main>

      {/* Screenshot OCR Modal */}
      <ScreenshotSolverModal
        isOpen={screenshotModalOpen}
        onClose={() => setScreenshotModalOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-3.5 px-6 text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>DeltaSolve Standalone Engine • 100% Offline in Browser</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Press Ctrl+V to paste screenshot</span>
            <span>•</span>
            <span className="text-slate-300">Live Screen Auto-Watcher Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
