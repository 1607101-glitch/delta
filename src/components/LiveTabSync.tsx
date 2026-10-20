import React, { useState, useEffect, useRef } from 'react';
import { solveMathLocally, LocalSolveResult } from '../utils/mathSolver';
import { MathRenderer } from './MathRenderer';
import { createWorker } from 'tesseract.js';
import {
  Monitor,
  Sparkles,
  Check,
  Copy,
  AlertCircle,
  StopCircle,
  ExternalLink,
  Play,
  Pause,
  Scan,
  Zap,
} from 'lucide-react';

interface LiveTabSyncProps {
  onApplyResult?: (result: LocalSolveResult) => void;
}

export const LiveTabSync: React.FC<LiveTabSyncProps> = ({ onApplyResult }) => {
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isLinked, setIsLinked] = useState(false);
  const [isAutoScanning, setIsAutoScanning] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoCopyEnabled, setAutoCopyEnabled] = useState(true);
  const [statusText, setStatusText] = useState('Connect DeltaMath tab to start');
  const [solveDurationMs, setSolveDurationMs] = useState<number | null>(null);

  // Active solution & detected text
  const [result, setResult] = useState<LocalSolveResult | null>(null);
  const [detectedText, setDetectedText] = useState<string>('');
  const [copiedToast, setCopiedToast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persistent Video Ref
  const videoRef = useRef<HTMLVideoElement>(null);
  const tesseractWorkerRef = useRef<any>(null);
  const lastFrameHashRef = useRef<number>(0);
  const lastSolvedTextRef = useRef<string>('');

  // 1. Maintain stream attachment to permanently mounted videoRef
  useEffect(() => {
    if (videoRef.current && screenStream) {
      videoRef.current.srcObject = screenStream;
      videoRef.current.muted = true;
      videoRef.current.play().catch((err) => {
        console.warn('Video playback warning:', err);
      });
    }
  }, [screenStream]);

  // 2. Initialize Tesseract.js Web Worker (Runs 100% in-browser)
  useEffect(() => {
    let workerActive = true;
    const initWorker = async () => {
      try {
        const worker = await createWorker('eng');
        if (workerActive) {
          tesseractWorkerRef.current = worker;
        }
      } catch (err) {
        console.warn('Tesseract worker init error:', err);
      }
    };
    initWorker();

    return () => {
      workerActive = false;
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
      setStatusText('Watching for next question...');

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
        setError('Screen sharing was cancelled or not permitted.');
      }
    }
  };

  const handleStopScreenSync = () => {
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
      setIsLinked(false);
      setStatusText('Tab stream paused');
    }
  };

  // Fast pixel hash to check if problem area has changed
  const computeFrameSampleHash = (canvas: HTMLCanvasElement): number => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return 0;
    // Sample a 64x64 thumbnail
    const sampleWidth = 64;
    const sampleHeight = 64;
    const imgData = ctx.getImageData(0, 0, sampleWidth, sampleHeight).data;
    let hash = 0;
    for (let i = 0; i < imgData.length; i += 8) {
      hash = ((hash << 5) - hash + imgData[i]) | 0;
    }
    return hash;
  };

  // Core OCR & Math Solve Routine
  const processCurrentFrame = async (forceSolve = false) => {
    const video = videoRef.current;
    if (!video || !isLinked || isProcessing) return;

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return;

    setIsProcessing(true);
    const startTime = performance.now();

    try {
      // 1. Draw video frame to canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, width, height);

      // Fast change detection (skip OCR if frame has not changed, unless forceSolve)
      const currentHash = computeFrameSampleHash(canvas);
      if (!forceSolve && Math.abs(currentHash - lastFrameHashRef.current) < 50) {
        setIsProcessing(false);
        return;
      }
      lastFrameHashRef.current = currentHash;

      // 2. Perform in-browser WebAssembly OCR
      let extractedText = '';
      if (tesseractWorkerRef.current) {
        const ret = await tesseractWorkerRef.current.recognize(canvas);
        extractedText = ret?.data?.text || '';
      }

      const cleanText = extractedText.trim();
      if (!cleanText || cleanText.length < 5) {
        setIsProcessing(false);
        return;
      }

      setDetectedText(cleanText);

      // 3. Solve with local standalone math engine
      const solved = solveMathLocally(cleanText);
      const duration = Math.round(performance.now() - startTime);
      setSolveDurationMs(duration);

      if (solved) {
        setResult(solved);
        lastSolvedTextRef.current = solved.deltaMathFormatAnswer;
        setStatusText(`Solved in ${duration}ms (Offline Standalone)`);
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
      console.warn('Frame processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Continuous Background Watcher Loop (Runs every 2.5s)
  useEffect(() => {
    if (!isLinked || !isAutoScanning) return;

    const interval = setInterval(() => {
      processCurrentFrame(false);
    }, 2500);

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
      {/* High-Speed Control Deck */}
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
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                100% Offline
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
            title="Auto-scan screen every 2 seconds without clicking"
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
              <button
                type="button"
                onClick={() => processCurrentFrame(true)}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Solve Now</span>
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
      <div className="relative w-full aspect-video max-h-[500px] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex items-center justify-center">
        {/* Permanently Mounted Video */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-contain ${!isLinked ? 'hidden' : 'block'}`}
        />

        {/* Placeholder state */}
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

        {/* Minimal High-Speed Solution Card (Overlaid on bottom right) */}
        {result && (
          <div className="absolute bottom-4 right-4 max-w-md w-full bg-slate-900/95 border-2 border-sky-500/60 rounded-xl p-4 shadow-2xl backdrop-blur-md text-xs space-y-2.5 animate-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live DeltaMath Answer:
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
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Answer Display */}
            <div className="p-3 bg-slate-950 rounded-lg font-mono text-xl font-black text-white break-all select-all border border-slate-800 tracking-wide">
              {result.deltaMathFormatAnswer}
            </div>

            {result.displayLatexAnswer && (
              <div className="text-center pt-0.5">
                <MathRenderer latex={result.displayLatexAnswer} className="text-base text-sky-300" />
              </div>
            )}

            <div className="text-[11px] text-slate-300 flex items-center justify-between border-t border-slate-800 pt-2">
              <span className="text-emerald-400 font-medium">
                {autoCopyEnabled ? '✓ Auto-copied to clipboard' : 'Click Copy to paste'}
              </span>
              <span className="text-slate-400 font-mono">
                {solveDurationMs ? `${solveDurationMs}ms` : ''}
              </span>
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

      {/* Detected OCR text debug snippet & Step Breakdown */}
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
