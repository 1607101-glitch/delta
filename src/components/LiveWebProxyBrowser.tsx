import React, { useState, useEffect, useRef } from 'react';
import {
  captureAndPreprocessFrame,
  computeFrameHash32,
  hasFrameChanged,
} from '../utils/screenCapture';
import {
  calculateMathProblem,
  MathCalculatorResult,
} from '../utils/mathCalculator';
import { MathRenderer } from './MathRenderer';
import { createWorker } from 'tesseract.js';
import {
  Monitor,
  Check,
  Copy,
  AlertCircle,
  StopCircle,
  ExternalLink,
  Pause,
  Scan,
  Zap,
  Loader2,
  ChevronDown,
  ChevronUp,
  Cpu,
} from 'lucide-react';

interface LiveWebProxyBrowserProps {
  onApplyResult?: (result: MathCalculatorResult) => void;
}

export const LiveWebProxyBrowser: React.FC<LiveWebProxyBrowserProps> = ({ onApplyResult }) => {
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isLinked, setIsLinked] = useState(false);
  const [isAutoScanning, setIsAutoScanning] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoCopyEnabled, setAutoCopyEnabled] = useState(true);
  const [statusText, setStatusText] = useState('Connect DeltaMath tab to start');
  const [solveDurationMs, setSolveDurationMs] = useState<number | null>(null);

  // Active solution & detected text
  const [result, setResult] = useState<MathCalculatorResult | null>(null);
  const [rawCleanedText, setRawCleanedText] = useState<string>('');
  const [showDebug, setShowDebug] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Video and worker refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const tesseractWorkerRef = useRef<any>(null);
  const lastProcessedHashRef = useRef<number>(0);
  const isOcrRunningRef = useRef<boolean>(false);

  // 1. Maintain video stream attachment to permanently mounted <video>
  useEffect(() => {
    if (videoRef.current && screenStream) {
      videoRef.current.srcObject = screenStream;
      videoRef.current.muted = true;
      videoRef.current.play().catch((err) => {
        console.warn('Video playback warning:', err);
      });
    }
  }, [screenStream]);

  // 2. Initialize Tesseract.js Web Worker (100% in-browser)
  useEffect(() => {
    let active = true;
    const initWorker = async () => {
      try {
        const worker = await createWorker('eng');
        if (active) {
          tesseractWorkerRef.current = worker;
        }
      } catch (err) {
        console.warn('Tesseract worker initialization notice:', err);
      }
    };
    initWorker();

    return () => {
      active = false;
      if (tesseractWorkerRef.current) {
        tesseractWorkerRef.current.terminate().catch(() => {});
      }
    };
  }, []);

  // 3. Clean up stream on unmount
  useEffect(() => {
    return () => {
      if (screenStream) {
        screenStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [screenStream]);

  // Screen connection handlers
  const handleStartScreenSync = async () => {
    setErrorNotice(null);
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
      setStatusText('Screen sync active. Watching for problem...');

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          setIsLinked(false);
          setScreenStream(null);
          setStatusText('Tab stream ended');
        };
      }
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        setErrorNotice('Screen sharing was cancelled or not permitted.');
      }
    }
  };

  const handleStopScreenSync = () => {
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
      setIsLinked(false);
      setStatusText('Tab stream disconnected');
    }
  };

  // Safe solve routine: Canvas Crop -> Binarization Filter -> OCR -> Math Engine
  const executePipeline = async (forceSolve = false) => {
    const video = videoRef.current;
    if (!video || !isLinked || isOcrRunningRef.current) return;

    if (!video.videoWidth || !video.videoHeight || video.readyState < 2) return;

    isOcrRunningRef.current = true;
    setIsAnalyzing(true);
    const startTime = performance.now();

    try {
      // 1. Dynamic Canvas Crop & High-Contrast Binarization
      const prep = captureAndPreprocessFrame(video);
      if (!prep) {
        return;
      }

      // 2. 32-bit FNV-1a Hash Change-Detection (Auto-Watcher)
      const currentHash = computeFrameHash32(prep.canvas);
      if (!forceSolve && !hasFrameChanged(currentHash, lastProcessedHashRef.current, 5)) {
        return;
      }
      lastProcessedHashRef.current = currentHash;

      // 3. In-Browser Tesseract OCR on Binarized Canvas
      let recognizedText = '';
      if (tesseractWorkerRef.current) {
        const ocrResult = await tesseractWorkerRef.current.recognize(prep.canvas);
        recognizedText = ocrResult?.data?.text || '';
      }

      const trimmed = recognizedText.trim();
      setRawCleanedText(trimmed);

      if (!trimmed || trimmed.length < 3) {
        return;
      }

      // 4. Standalone Internal Math Calculator (mathCalculator.ts)
      const solved = calculateMathProblem(trimmed);
      const elapsed = Math.round(performance.now() - startTime);
      setSolveDurationMs(elapsed);

      if (solved) {
        setResult(solved);
        setStatusText(`Solved in ${elapsed}ms (Offline Standalone)`);
        if (onApplyResult) onApplyResult(solved);

        // Auto-copy to clipboard if enabled
        if (autoCopyEnabled && solved.deltaMathFormatAnswer) {
          try {
            await navigator.clipboard.writeText(solved.deltaMathFormatAnswer);
            setCopiedToast(true);
            setTimeout(() => setCopiedToast(false), 2000);
          } catch {
            // Clipboard auto-copy fallback
          }
        }
      } else {
        setStatusText('Watching for next question...');
      }
    } catch (err: any) {
      console.warn('Pipeline execution notice:', err);
      // Keep UI completely intact; do not unmount or crash
    } finally {
      isOcrRunningRef.current = false;
      setIsAnalyzing(false);
    }
  };

  // Safe wrapper for manual "⚡ Solve Now" button
  const handleSolve = async () => {
    try {
      await executePipeline(true);
    } catch (err) {
      console.warn('handleSolve safe catch:', err);
    }
  };

  // 4. Continuous Auto-Watcher Loop (2000ms setInterval with concurrency guard)
  useEffect(() => {
    if (!isLinked || !isAutoScanning) return;

    const interval = setInterval(() => {
      if (!isOcrRunningRef.current) {
        executePipeline(false);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isLinked, isAutoScanning, autoCopyEnabled]);

  const handleCopyAnswer = () => {
    if (result?.deltaMathFormatAnswer) {
      navigator.clipboard.writeText(result.deltaMathFormatAnswer);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* High-Speed Control Deck & Crash-Proof Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-xl shadow-md">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              isLinked ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
            }`}
          />
          <div>
            <span className="text-sm font-bold text-white flex items-center gap-2">
              DeltaSolve Live Watcher
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                <Cpu className="w-2.5 h-2.5" /> 100% Offline
              </span>
            </span>
            <p className="text-xs text-slate-400">{statusText}</p>
          </div>
        </div>

        {/* Toggles & Controls */}
        <div className="flex items-center gap-2">
          {/* Auto-Solve ON/OFF Toggle */}
          <button
            type="button"
            onClick={() => setIsAutoScanning(!isAutoScanning)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              isAutoScanning
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Auto-scan screen every 2000ms without clicking"
          >
            {isAutoScanning ? (
              <>
                <Scan className="w-3.5 h-3.5 animate-pulse" />
                <span>Auto-Solve: ON</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Auto-Solve: OFF</span>
              </>
            )}
          </button>

          {/* Auto-Copy Toggle */}
          <button
            type="button"
            onClick={() => setAutoCopyEnabled(!autoCopyEnabled)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              autoCopyEnabled
                ? 'bg-sky-600/30 text-sky-200 border border-sky-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Automatically copy solved answer to clipboard"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Auto-Copy: {autoCopyEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {!isLinked ? (
            <button
              type="button"
              onClick={handleStartScreenSync}
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition active:scale-95 shadow cursor-pointer"
            >
              <Monitor className="w-4 h-4" />
              <span>Connect DeltaMath Tab</span>
            </button>
          ) : (
            <>
              {/* Solve Now with Spinner & Loading State */}
              <button
                type="button"
                onClick={handleSolve}
                disabled={isAnalyzing}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>⚡ Solve Now</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleStopScreenSync}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                title="Disconnect Stream"
              >
                <StopCircle className="w-4 h-4" />
              </button>
            </>
          )}

          <a
            href="https://www.deltamath.com/app/student"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Open DeltaMath"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Main Stream Viewport */}
      <div className="relative w-full aspect-video max-h-[520px] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex items-center justify-center">
        {/* Permanently Mounted Video: Never Unmounted on Error */}
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
              <h3 className="text-base font-bold text-white">Live DeltaMath Stream</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Connect your active DeltaMath tab. Our standalone in-browser OCR automatically reads the math problem and solves it every time a new question loads.
              </p>
            </div>
            <button
              type="button"
              onClick={handleStartScreenSync}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 mx-auto cursor-pointer"
            >
              <Monitor className="w-4 h-4" />
              <span>Choose DeltaMath Tab to Sync</span>
            </button>
          </div>
        )}

        {/* PART 3: Persistent Floating Solution Card Overlay in Top-Right Corner */}
        {result && (
          <div className="absolute top-4 right-4 max-w-sm w-full bg-slate-900/95 border-2 border-sky-500/60 rounded-xl p-4 shadow-2xl backdrop-blur-md text-xs space-y-2.5 z-20">
            {/* Card Header: "DeltaSolve Engine • Standalone" */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-sky-400 text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                DeltaSolve Engine • Standalone
              </span>

              {/* Click-to-Copy Button with 2s Green Checkmark confirmation */}
              <button
                type="button"
                onClick={handleCopyAnswer}
                className="px-2.5 py-1 bg-sky-600/30 hover:bg-sky-600/50 text-sky-200 border border-sky-500/30 rounded font-semibold text-xs flex items-center gap-1 transition cursor-pointer"
              >
                {copiedToast ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Answer Display: Large 24px mono text (e.g. 8, -4) */}
            <div className="p-3 bg-slate-950 rounded-lg text-center border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-semibold">
                DeltaMath Answer:
              </div>
              <div className="font-mono text-2xl font-black text-white break-all select-all tracking-wider text-emerald-400">
                {result.deltaMathFormatAnswer}
              </div>
            </div>

            {result.displayLatexAnswer && (
              <div className="text-center pt-0.5">
                <MathRenderer latex={result.displayLatexAnswer} className="text-base text-sky-300" />
              </div>
            )}

            <div className="text-[11px] text-slate-300 flex items-center justify-between pt-1">
              <span className="text-emerald-400 font-medium">
                {autoCopyEnabled ? '✓ Auto-copied to clipboard' : 'Click Copy to paste'}
              </span>
              <span className="text-slate-400 font-mono">
                {solveDurationMs ? `${solveDurationMs}ms` : ''}
              </span>
            </div>

            {/* Debug View (Collapsed by default): Shows exact cleaned text read by OCR */}
            <div className="border-t border-slate-800/80 pt-2">
              <button
                type="button"
                onClick={() => setShowDebug(!showDebug)}
                className="w-full flex items-center justify-between text-[11px] text-slate-400 hover:text-slate-200 font-medium py-0.5"
              >
                <span>OCR Debug View</span>
                {showDebug ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showDebug && (
                <div className="mt-1.5 p-2 bg-slate-950 rounded text-[11px] font-mono text-slate-300 border border-slate-800 max-h-24 overflow-y-auto whitespace-pre-wrap">
                  {rawCleanedText || result.rawTextCleaned || result.parsedProblem || 'No raw text available'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {errorNotice && (
        <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* Step Breakdown */}
      {result && result.steps && result.steps.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <h4 className="font-bold text-slate-300 uppercase tracking-wider">
              Step-by-Step Mathematical Proof:
            </h4>
            <span className="text-slate-400 font-mono text-[11px]">{result.topic}</span>
          </div>
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
