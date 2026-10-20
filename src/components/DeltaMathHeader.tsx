import React from 'react';
import { StudentSession } from '../types';
import { Bot, Camera, Sparkles, UserCheck, Clock, Award, ShieldAlert, Globe, Bookmark } from 'lucide-react';

interface DeltaMathHeaderProps {
  session: StudentSession;
  onOpenLogin: () => void;
  onOpenScreenshot: () => void;
  score: number;
  maxScore: number;
  penalty: number;
  elapsedSeconds: number;
  isAutoBotActive: boolean;
  onToggleAutoBot: () => void;
  activeTab: 'live-proxy' | 'assignment' | 'custom-solver' | 'generator';
  setActiveTab: (tab: 'live-proxy' | 'assignment' | 'custom-solver' | 'generator') => void;
  onOpenBookmarklet?: () => void;
}

export const DeltaMathHeader: React.FC<DeltaMathHeaderProps> = ({
  session,
  onOpenLogin,
  onOpenScreenshot,
  score,
  maxScore,
  penalty,
  elapsedSeconds,
  isAutoBotActive,
  onToggleAutoBot,
  activeTab,
  setActiveTab,
  onOpenBookmarklet,
}) => {
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 border-b border-blue-700/60 shadow-lg text-white">
      {/* Top Banner Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Course */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('live-proxy')}>
            <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center font-bold text-lg text-white shadow-md shadow-sky-950/40 border border-sky-300/30">
              Δ
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                DeltaMath
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-sky-400/20 text-sky-200 border border-sky-400/40">
                  Live Web Proxy
                </span>
              </span>
              <p className="text-[11px] text-blue-200 truncate max-w-[220px] sm:max-w-none">
                {session.isLoggedIn ? `${session.schoolName} • ${session.period}` : 'Live Website & Automated Solver'}
              </p>
            </div>
          </div>
        </div>

        {/* Real-time DeltaMath Statistics Bar */}
        <div className="flex items-center gap-2 sm:gap-4 bg-blue-950/70 border border-blue-600/40 px-3.5 py-1.5 rounded-xl shadow-inner">
          <div className="flex items-center gap-1.5 text-xs text-blue-200">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Score:</span>
            <span className="font-bold text-white font-mono text-sm">
              {score}/{maxScore}
            </span>
          </div>

          <div className="h-4 w-px bg-blue-700/50" />

          <div className="flex items-center gap-1.5 text-xs text-blue-200">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Penalty:</span>
            <span className="font-bold text-rose-300 font-mono text-sm">
              -{penalty}
            </span>
          </div>

          <div className="h-4 w-px bg-blue-700/50 hidden sm:block" />

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-blue-200">
            <Clock className="w-3.5 h-3.5 text-sky-300" />
            <span className="font-mono text-slate-100">{formatTime(elapsedSeconds)}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {onOpenBookmarklet && (
            <button
              type="button"
              onClick={onOpenBookmarklet}
              className="px-2.5 py-1.5 rounded-lg bg-sky-950/70 border border-sky-500/40 text-sky-200 hover:bg-sky-900/60 text-xs font-medium flex items-center gap-1.5 transition active:scale-95 shadow-sm"
              title="1-Click DeltaBot Bookmarklet for External Tabs"
            >
              <Bookmark className="w-3.5 h-3.5 text-sky-300" />
              <span className="hidden sm:inline">Bookmarklet Bridge</span>
            </button>
          )}

          {/* Quick Screenshot OCR Trigger */}
          <button
            type="button"
            onClick={onOpenScreenshot}
            className="px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-400/40 text-xs font-medium flex items-center gap-1.5 transition active:scale-95 shadow-sm"
            title="Paste or Upload DeltaMath Screenshot"
          >
            <Camera className="w-3.5 h-3.5 text-sky-300" />
            <span className="hidden sm:inline">Paste Screenshot</span>
          </button>

          {/* DeltaBot Auto-Pilot Toggle */}
          <button
            type="button"
            onClick={onToggleAutoBot}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-md active:scale-95 border ${
              isAutoBotActive
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400 animate-pulse'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-600'
            }`}
          >
            <Bot className={`w-4 h-4 ${isAutoBotActive ? 'text-emerald-200' : 'text-sky-400'}`} />
            <span>{isAutoBotActive ? 'Auto-Pilot: ON' : 'DeltaBot'}</span>
          </button>

          {/* Student Login / Profile Button */}
          <button
            type="button"
            onClick={onOpenLogin}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg bg-blue-950/60 hover:bg-blue-900/60 border border-blue-600/40 text-xs font-medium text-slate-200 transition"
          >
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px]">
              {session.studentName ? session.studentName[0].toUpperCase() : 'J'}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-xs font-medium text-slate-100 leading-none">
                {session.isLoggedIn ? session.studentName.split(' ')[0] : 'In-App Login'}
              </div>
              <div className="text-[10px] text-blue-300 leading-none mt-0.5">
                {session.isLoggedIn ? 'Connected' : 'Sign In'}
              </div>
            </div>
            {session.isLoggedIn && <UserCheck className="w-3 h-3 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 border-t border-blue-700/40 text-xs font-medium overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('live-proxy')}
          className={`py-2 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
            activeTab === 'live-proxy'
              ? 'border-sky-400 text-white font-semibold'
              : 'border-transparent text-blue-200 hover:text-white'
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-sky-400" />
          Live DeltaMath Web Proxy
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('assignment')}
          className={`py-2 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
            activeTab === 'assignment'
              ? 'border-sky-400 text-white font-semibold'
              : 'border-transparent text-blue-200 hover:text-white'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          Offline Practice Modules
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('custom-solver')}
          className={`py-2 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
            activeTab === 'custom-solver'
              ? 'border-sky-400 text-white font-semibold'
              : 'border-transparent text-blue-200 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          Universal Problem Solver
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('generator')}
          className={`py-2 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
            activeTab === 'generator'
              ? 'border-sky-400 text-white font-semibold'
              : 'border-transparent text-blue-200 hover:text-white'
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-sky-300" />
          AI Curriculum Generator
        </button>
      </div>
    </header>
  );
};
