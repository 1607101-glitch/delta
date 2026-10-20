import React, { useState } from 'react';
import {
  Bot,
  Zap,
  Play,
  Square,
  Settings,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  CheckCheck,
  Copy,
  Sliders,
} from 'lucide-react';
import { SolverResult } from '../types';

interface DeltaBotOverlayProps {
  onAutoSolve: () => void;
  onAutoFill: () => void;
  onAutoSubmit: () => void;
  isSolving: boolean;
  isAutoPilot: boolean;
  onToggleAutoPilot: () => void;
  currentResult: SolverResult | null;
  stealthDelay: number;
  setStealthDelay: (sec: number) => void;
  humanTyping: boolean;
  setHumanTyping: (val: boolean) => void;
}

export const DeltaBotOverlay: React.FC<DeltaBotOverlayProps> = ({
  onAutoSolve,
  onAutoFill,
  onAutoSubmit,
  isSolving,
  isAutoPilot,
  onToggleAutoPilot,
  currentResult,
  stealthDelay,
  setStealthDelay,
  humanTyping,
  setHumanTyping,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [copiedAnswer, setCopiedAnswer] = useState(false);

  const handleCopy = () => {
    if (currentResult?.deltaMathFormatAnswer) {
      navigator.clipboard.writeText(currentResult.deltaMathFormatAnswer);
      setCopiedAnswer(true);
      setTimeout(() => setCopiedAnswer(false), 1500);
    }
  };

  return (
    <div
      className={`fixed bottom-5 right-5 z-40 transition-all duration-300 ease-in-out ${
        isMinimized ? 'w-auto' : 'w-88 sm:w-96'
      }`}
    >
      {isMinimized ? (
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="p-3 bg-gradient-to-r from-sky-600 to-blue-700 text-white rounded-full shadow-2xl hover:scale-105 transition flex items-center gap-2 border-2 border-sky-400 cursor-pointer"
          title="Open DeltaBot Auto-Solver"
        >
          <Bot className="w-6 h-6 animate-pulse text-sky-200" />
          <span className="text-xs font-bold pr-1">DeltaBot</span>
        </button>
      ) : (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl overflow-hidden border-t-2 border-t-sky-500">
          {/* DeltaBot Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-2.5 flex items-center justify-between border-b border-slate-700/80">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/40">
                  <Bot className="w-4 h-4" />
                </div>
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  DeltaBot Auto-Solver
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800">
                    AI v3.8
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Stealth Mode Active</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition ${
                  showSettings ? 'text-sky-400 bg-slate-800' : ''
                }`}
                title="Bot Configuration"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                title="Minimize HUD"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Settings Drawer */}
          {showSettings && (
            <div className="p-3 bg-slate-950 border-b border-slate-800 text-xs space-y-2.5 animate-in slide-in-from-top-2">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-sky-400" />
                  Anti-Cheat Human Delay:
                </span>
                <span className="font-mono text-sky-300 font-bold">{stealthDelay}s</span>
              </div>
              <input
                type="range"
                min="0"
                max="8"
                step="0.5"
                value={stealthDelay}
                onChange={(e) => setStealthDelay(parseFloat(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Instant (0s)</span>
                <span>Realistic (3-4s)</span>
                <span>Safe (8s)</span>
              </div>

              <div className="pt-1 flex items-center justify-between">
                <span className="text-slate-300 text-xs">Simulate Human Typing:</span>
                <button
                  type="button"
                  onClick={() => setHumanTyping(!humanTyping)}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                    humanTyping ? 'bg-sky-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      humanTyping ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Quick Solve Actions */}
          <div className="p-3 space-y-2.5">
            {/* Primary Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onAutoSolve}
                disabled={isSolving}
                className="py-2.5 px-3 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-sky-900/30 flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isSolving ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-sky-200" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>Auto-Solve</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onToggleAutoPilot}
                className={`py-2.5 px-3 font-semibold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer border ${
                  isAutoPilot
                    ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 animate-pulse'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400'
                }`}
              >
                {isAutoPilot ? (
                  <>
                    <Square className="w-3.5 h-3.5" />
                    <span>Stop Auto-Pilot</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Auto-Pilot (Loop)</span>
                  </>
                )}
              </button>
            </div>

            {/* Answer Quick View & Instant Fill */}
            {currentResult && (
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Calculated Solution:
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300"
                  >
                    {copiedAnswer ? (
                      <>
                        <CheckCheck className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-2 rounded-lg bg-sky-950/40 border border-sky-800/40 font-mono text-sm font-bold text-sky-300 select-all truncate">
                  {currentResult.deltaMathFormatAnswer}
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={onAutoFill}
                    className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition flex items-center justify-center gap-1"
                  >
                    <span>1. Auto-Fill Field</span>
                  </button>
                  <button
                    type="button"
                    onClick={onAutoSubmit}
                    className="py-1.5 px-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center justify-center gap-1"
                  >
                    <span>2. Auto-Submit</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
