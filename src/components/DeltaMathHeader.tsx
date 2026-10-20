import React from 'react';
import { Monitor, Calculator, Camera, Bookmark, ExternalLink } from 'lucide-react';

interface DeltaMathHeaderProps {
  activeTab: 'tab-sync' | 'solver';
  setActiveTab: (tab: 'tab-sync' | 'solver') => void;
  onOpenBookmarklet: () => void;
  onOpenScreenshot: () => void;
}

export const DeltaMathHeader: React.FC<DeltaMathHeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenBookmarklet,
  onOpenScreenshot,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 shadow-lg text-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center font-bold text-lg text-white shadow-md shadow-sky-950/40">
            Δ
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              DeltaSolve
              <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                Chromebook Assistant
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Live Tab Sync & Linewize-Safe Bookmarklet
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
            <span>Problem Workspace</span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenScreenshot}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
            title="Upload or Paste Screenshot"
          >
            <Camera className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Screenshot</span>
          </button>

          <button
            type="button"
            onClick={onOpenBookmarklet}
            className="px-3 py-1.5 rounded-lg bg-sky-950/70 border border-sky-500/40 text-sky-300 hover:bg-sky-900/60 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
          >
            <Bookmark className="w-3.5 h-3.5 text-sky-400" />
            <span>Bookmarklet</span>
          </button>
        </div>
      </div>
    </header>
  );
};
