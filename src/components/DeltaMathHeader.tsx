import React from 'react';
import { Monitor, Calculator, Camera } from 'lucide-react';

interface DeltaMathHeaderProps {
  activeTab: 'tab-sync' | 'solver';
  setActiveTab: (tab: 'tab-sync' | 'solver') => void;
  onOpenScreenshot: () => void;
}

export const DeltaMathHeader: React.FC<DeltaMathHeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenScreenshot,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 shadow-md text-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center font-bold text-lg text-white shadow-md shadow-sky-950/40">
            Δ
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              DeltaSolve
              <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                100% Standalone
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Live Tab Watcher & Automated Solver
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('tab-sync')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'tab-sync'
                ? 'bg-sky-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Live Tab Sync</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('solver')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'solver'
                ? 'bg-sky-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Manual Solver</span>
          </button>
        </div>

        {/* Screenshot OCR Action */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenScreenshot}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 border border-slate-700"
            title="Upload or Paste Image Screenshot"
          >
            <Camera className="w-3.5 h-3.5 text-sky-400" />
            <span>Paste Screenshot</span>
          </button>
        </div>
      </div>
    </header>
  );
};
