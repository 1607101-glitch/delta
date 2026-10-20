import React, { useState, useEffect, useRef } from 'react';
import { SolverResult } from '../types';
import { MathRenderer } from './MathRenderer';
import {
  Monitor,
  Camera,
  Sparkles,
  Check,
  Copy,
  AlertCircle,
  StopCircle,
  ExternalLink,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';

interface LiveTabSyncProps {
  onApplyResult?: (result: SolverResult) => void;
}

export const LiveTabSync: React.FC<LiveTabSyncProps> = ({ onApplyResult }) => {
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isLinked, setIsLinked] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<SolverResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);

  // Dedicated video ref that stays PERMANENTLY mounted in the DOM
  const videoRef = useRef<HTMLVideoElement>(null);

  // Requirement: Listen to screenStream. As soon as a stream is active, attach to videoRef, mute, and play.
  useEffect(() => {
    if (videoRef.current && screenStream) {
      videoRef.current.srcObject = screenStream;
      videoRef.current.muted = true;
      videoRef.current.play().catch((err) => {
        console.warn('Video playback warning:', err);
      });
    }
  }, [screenStream]);

  // Clean up media tracks on unmount
  useEffect(() => {
    return () => {
      if (screenStream) {
        screenStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [screenStream]);

  // Start Screen Capture
  const handleStartScreenSync = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
          cursor: 'always',
        } as any,
        audio: false,
      });

      setScreenStream(stream);
      setIsLinked(true);

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          setIsLinked(false);
          setScreenStream(null);
        };
      }
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        setError('Screen sharing was cancelled or not permitted.');
      }
    }
  };

  const handleStopScreenSync = () => {
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
      setIsLinked(false);
    }
  };

  // Capture canvas frame from live video dimensions & solve
  const handleCaptureAndSolve = async () => {
    const video = videoRef.current;
    if (!video || !screenStream) {
      await handleStartScreenSync();
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Could not initialize canvas context.');
      ctx.drawImage(video, 0, 0, width, height);

      const base64Data = canvas.toDataURL('image/png');

      const res = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: 'image/png',
          instructions: 'Live DeltaMath problem from student tab. Extract problem, calculate answer and step-by-step solution.',
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to solve problem from screen.');
      }

      setResult(json.data);
      if (onApplyResult) onApplyResult(json.data);

      // Auto-copy answer to clipboard for immediate Ctrl+V on DeltaMath
      if (json.data.deltaMathFormatAnswer) {
        try {
          await navigator.clipboard.writeText(json.data.deltaMathFormatAnswer);
          setCopiedToast(true);
          setTimeout(() => setCopiedToast(false), 3000);
        } catch {
          // Clipboard fallback
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error capturing and solving screen.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyAnswer = () => {
    if (result?.deltaMathFormatAnswer) {
      navigator.clipboard.writeText(result.deltaMathFormatAnswer);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-3 h-3 rounded-full ${
              isLinked ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
            }`}
          />
          <span className="text-sm font-semibold text-white">
            {isLinked ? 'DeltaMath Tab Connected' : 'Live Tab Sync'}
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline">
            {isLinked ? 'Streaming screen live' : 'Bypasses iframe blocks & Linewize filters'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!isLinked ? (
            <button
              type="button"
              onClick={handleStartScreenSync}
              className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition active:scale-95 shadow cursor-pointer"
            >
              <Monitor className="w-4 h-4" />
              <span>Connect DeltaMath Tab</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCaptureAndSolve}
                disabled={isAnalyzing}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition active:scale-95 shadow-lg shadow-emerald-950/40 disabled:opacity-50 cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Problem...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>Auto-Solve Active Question</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleStopScreenSync}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                title="Disconnect Tab Stream"
              >
                <StopCircle className="w-4 h-4" />
              </button>
            </>
          )}

          <a
            href="https://www.deltamath.com/app/student"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition"
          >
            <span>Open DeltaMath</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Main Stream Viewport */}
      <div className="relative w-full aspect-video max-h-[520px] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex items-center justify-center">
        {/* PERMANENTLY MOUNTED VIDEO ELEMENT - Never conditionally removed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-contain ${!isLinked ? 'hidden' : 'block'}`}
        />

        {/* Placeholder state when not linked */}
        {!isLinked && (
          <div className="p-8 text-center max-w-md space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center mx-auto">
              <Monitor className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Stream Your Real DeltaMath Tab</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Connect your active DeltaMath browser tab to solve problems live. Works on school Chromebooks with zero iframe errors or firewall blocking.
              </p>
            </div>
            <button
              type="button"
              onClick={handleStartScreenSync}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 mx-auto cursor-pointer"
            >
              <Monitor className="w-4 h-4" />
              <span>Select DeltaMath Tab to Sync</span>
            </button>
          </div>
        )}

        {/* Live Answer Overlay Card */}
        {result && (
          <div className="absolute bottom-4 right-4 max-w-md w-full bg-slate-900/95 border-2 border-sky-500/60 rounded-xl p-4 shadow-2xl backdrop-blur-md text-xs space-y-2.5 animate-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400 uppercase tracking-wider text-[10px]">
                Solved Answer:
              </span>
              <button
                type="button"
                onClick={handleCopyAnswer}
                className="text-xs font-semibold text-sky-400 hover:text-white flex items-center gap-1"
              >
                {copiedToast ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Answer</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg font-mono text-lg font-black text-white break-all select-all border border-slate-800">
              {result.deltaMathFormatAnswer}
            </div>

            {result.displayLatexAnswer && (
              <div className="text-center pt-0.5">
                <MathRenderer latex={result.displayLatexAnswer} className="text-base text-sky-300" />
              </div>
            )}

            <div className="text-[11px] text-slate-300 flex items-center justify-between border-t border-slate-800 pt-2">
              <span className="text-emerald-400 font-medium">✓ Auto-copied to clipboard</span>
              <span className="text-slate-400">Press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-sky-300 font-mono text-[10px]">Ctrl+V</kbd> on DeltaMath</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step by step solution drawer if result is present */}
      {result && result.steps && result.steps.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Step-by-Step Explanation:
          </h4>
          <div className="space-y-2">
            {result.steps.map((st, i) => (
              <div key={i} className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 text-xs space-y-1">
                <div className="font-semibold text-sky-400">
                  Step {st.stepNumber || i + 1}: {st.title}
                </div>
                <p className="text-slate-300">{st.content}</p>
                {st.mathLatex && (
                  <div className="pt-1 text-center bg-slate-900/60 p-2 rounded">
                    <MathRenderer latex={st.mathLatex} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
