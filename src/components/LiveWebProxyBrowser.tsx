import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Zap,
  Play,
  Square,
  Clock,
  Sparkles,
  Bookmark,
  Globe,
  Monitor,
  Camera,
  Check,
  Copy,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { MathRenderer } from './MathRenderer';

interface LiveWebProxyBrowserProps {
  onOpenBookmarkletModal: () => void;
}

export const LiveWebProxyBrowser: React.FC<LiveWebProxyBrowserProps> = ({
  onOpenBookmarkletModal,
}) => {
  // Connection Mode: 'direct' (no proxy), 'screen-sync' (live tab capture), 'proxy' (reverse proxy gateway)
  const [connectionMode, setConnectionMode] = useState<'direct' | 'screen-sync' | 'proxy'>('direct');
  const [displayUrl, setDisplayUrl] = useState('https://www.deltamath.com/');
  const [currentUrl, setCurrentUrl] = useState('https://www.deltamath.com/');
  const [isLoading, setIsLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);

  // Solving State
  const [solvingMode, setSolvingMode] = useState<'autonomous' | 'humanized'>('humanized');
  const [stealthDelay, setStealthDelay] = useState(3);
  const [isAutoPilot, setIsAutoPilot] = useState(false);
  const [lastSolvedResult, setLastSolvedResult] = useState<any | null>(null);
  const [isAnalyzingScreen, setIsAnalyzingScreen] = useState(false);
  const [solveStreak, setSolveStreak] = useState(0);
  const [copiedAnswer, setCopiedAnswer] = useState(false);

  // Screen Link Video Stream
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScreenLinked, setIsScreenLinked] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Update target URL when switching connection mode
  useEffect(() => {
    setIsLoading(true);
    setIframeError(false);
    if (connectionMode === 'direct') {
      setCurrentUrl('https://www.deltamath.com/');
      setDisplayUrl('https://www.deltamath.com/');
    } else if (connectionMode === 'proxy') {
      setCurrentUrl('/api/deltamath-proxy/');
      setDisplayUrl('https://www.deltamath.com/');
    }
  }, [connectionMode]);

  // Clean up screen stream on unmount
  useEffect(() => {
    return () => {
      if (screenStream) {
        screenStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [screenStream]);

  // Quick navigation
  const navigateTo = (url: string) => {
    setIsLoading(true);
    setIframeError(false);
    setDisplayUrl(url);

    if (connectionMode === 'proxy') {
      if (url.startsWith('https://www.deltamath.com')) {
        const sub = url.replace('https://www.deltamath.com', '');
        setCurrentUrl(`/api/deltamath-proxy${sub || '/'}`);
      } else {
        setCurrentUrl(`/api/deltamath-proxy?url=${encodeURIComponent(url)}`);
      }
    } else {
      setCurrentUrl(url);
    }
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let url = displayUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    navigateTo(url);
  };

  // Start Screen Capture Link (Bypasses all iframe framing limits)
  const handleStartScreenSync = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as any,
        audio: false,
      });

      setScreenStream(stream);
      setIsScreenLinked(true);
      setConnectionMode('screen-sync');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      stream.getVideoTracks()[0].onended = () => {
        setIsScreenLinked(false);
        setScreenStream(null);
      };
    } catch (err) {
      console.warn('Screen link cancelled or not granted:', err);
    }
  };

  // Capture current screen frame and auto-solve with Gemini
  const handleCaptureAndSolve = async () => {
    if (!videoRef.current || !isScreenLinked) {
      // If screen is not linked, open prompt or fallback to direct solve
      handleStartScreenSync();
      return;
    }

    setIsAnalyzingScreen(true);
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');

        const res = await fetch('/api/solve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: dataUrl,
            mimeType: 'image/png',
            instructions: 'Live DeltaMath problem on student screen. Extract problem, compute exact answer and step-by-step solution.',
          }),
        });

        const data = await res.json();
        if (data.success && data.data) {
          setLastSolvedResult(data.data);
          setSolveStreak((prev) => prev + 1);

          // Copy answer automatically for instant paste into DeltaMath
          if (data.data.deltaMathFormatAnswer) {
            navigator.clipboard.writeText(data.data.deltaMathFormatAnswer);
            setCopiedAnswer(true);
            setTimeout(() => setCopiedAnswer(false), 2000);
          }
        }
      }
    } catch (err) {
      console.error('Screen solve error:', err);
    } finally {
      setIsAnalyzingScreen(false);
    }
  };

  // Open Direct DeltaMath Window
  const handleOpenDirectWindow = () => {
    window.open('https://www.deltamath.com/app/student', '_blank');
  };

  const copyAnswer = () => {
    if (lastSolvedResult?.deltaMathFormatAnswer) {
      navigator.clipboard.writeText(lastSolvedResult.deltaMathFormatAnswer);
      setCopiedAnswer(true);
      setTimeout(() => setCopiedAnswer(false), 1500);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[650px] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Top Browser Bar & Mode Selector */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Navigation & Mode Switches */}
        <div className="flex items-center gap-2">
          {/* Connection Mode Switcher */}
          <div className="flex items-center bg-slate-950 border border-slate-800 p-0.5 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setConnectionMode('direct')}
              className={`px-2.5 py-1 rounded-md font-semibold transition flex items-center gap-1.5 ${
                connectionMode === 'direct'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Connect to deltamath.com directly without reverse proxy"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Direct (No Proxy)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setConnectionMode('screen-sync');
                if (!isScreenLinked) handleStartScreenSync();
              }}
              className={`px-2.5 py-1 rounded-md font-semibold transition flex items-center gap-1.5 ${
                connectionMode === 'screen-sync'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Attach live DeltaMath tab video stream (works 100% without iframe restrictions)"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Live Tab Link</span>
            </button>

            <button
              type="button"
              onClick={() => setConnectionMode('proxy')}
              className={`px-2.5 py-1 rounded-md font-semibold transition flex items-center gap-1.5 ${
                connectionMode === 'proxy'
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Use reverse proxy gateway"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Proxy Gateway</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              setIframeError(false);
              if (iframeRef.current) iframeRef.current.src = currentUrl;
            }}
            className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition ${
              isLoading ? 'animate-spin text-sky-400' : ''
            }`}
            title="Reload"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Address Bar */}
        <form onSubmit={handleAddressSubmit} className="flex-1 max-w-md hidden sm:flex items-center">
          <div className="w-full relative flex items-center">
            <span className="absolute left-3 text-slate-500">
              <Globe className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              value={displayUrl}
              onChange={(e) => setDisplayUrl(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
              placeholder="https://www.deltamath.com/..."
            />
          </div>
        </form>

        {/* Quick External Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenDirectWindow}
            className="px-2.5 py-1.5 rounded-lg bg-sky-950 border border-sky-600/40 hover:bg-sky-900/60 text-sky-300 text-xs font-semibold flex items-center gap-1.5 transition"
            title="Open real DeltaMath in separate window"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open DeltaMath Window</span>
          </button>

          <button
            type="button"
            onClick={onOpenBookmarkletModal}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
            title="1-Click Bookmarklet for your real browser"
          >
            <Bookmark className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">Bookmarklet</span>
          </button>
        </div>
      </div>

      {/* DeltaBot Live Solving Strip */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-300">Mode:</span>
            <div className="flex items-center bg-slate-950 border border-slate-800 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setSolvingMode('humanized')}
                className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  solvingMode === 'humanized' ? 'bg-sky-600 text-white' : 'text-slate-400'
                }`}
              >
                Humanized
              </button>
              <button
                type="button"
                onClick={() => setSolvingMode('autonomous')}
                className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  solvingMode === 'autonomous' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                }`}
              >
                Auto
              </button>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-slate-400 pl-2 border-l border-slate-800">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>Stealth Delay:</span>
            <input
              type="range"
              min="0"
              max="6"
              step="0.5"
              value={stealthDelay}
              onChange={(e) => setStealthDelay(parseFloat(e.target.value))}
              className="w-16 accent-sky-500 cursor-pointer"
            />
            <span className="font-mono text-sky-300 font-bold">{stealthDelay}s</span>
          </div>
        </div>

        {/* Live Answer Banner & Solve Trigger */}
        <div className="flex items-center gap-2">
          {lastSolvedResult && (
            <div className="flex items-center gap-2 bg-sky-950/80 border border-sky-500/50 px-3 py-1 rounded-lg">
              <span className="text-slate-400 text-[11px]">Answer:</span>
              <span className="font-mono font-bold text-sky-300 text-sm select-all">
                {lastSolvedResult.deltaMathFormatAnswer}
              </span>
              <button
                type="button"
                onClick={copyAnswer}
                className="text-xs text-sky-400 hover:text-white flex items-center gap-1 pl-1"
              >
                {copiedAnswer ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          )}

          {connectionMode === 'screen-sync' ? (
            <button
              type="button"
              onClick={handleCaptureAndSolve}
              disabled={isAnalyzingScreen}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 transition active:scale-95 shadow-md disabled:opacity-50 cursor-pointer"
            >
              {isAnalyzingScreen ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Reading Problem...</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5" />
                  <span>Auto-Solve Live Screen</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (connectionMode === 'direct') {
                  // Direct mode: switch to screen sync or open direct solver
                  handleStartScreenSync();
                } else {
                  // Proxy mode
                  if (iframeRef.current?.contentWindow) {
                    iframeRef.current.contentWindow.postMessage(
                      { target: 'deltabot-injected', command: 'trigger_solve' },
                      '*'
                    );
                  }
                }
              }}
              className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center gap-1.5 transition active:scale-95 shadow-md cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Auto-Solve On Page</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Viewport */}
      <div className="relative flex-1 w-full bg-slate-900 overflow-hidden flex flex-col">
        {/* If Mode is Live Screen Link */}
        {connectionMode === 'screen-sync' ? (
          <div className="relative flex-1 w-full bg-black flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
            />

            {!isScreenLinked && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-950/90 text-center">
                <Monitor className="w-14 h-14 text-emerald-400 mb-3" />
                <h3 className="text-lg font-bold text-white">Live DeltaMath Tab Link</h3>
                <p className="text-xs text-slate-300 max-w-md mt-1 mb-4 leading-relaxed">
                  Share your active DeltaMath tab to stream it directly into the app. DeltaBot will read questions in real time with Gemini Vision and auto-solve them with zero iframe or login blocking.
                </p>
                <button
                  type="button"
                  onClick={handleStartScreenSync}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
                >
                  <Monitor className="w-4 h-4" />
                  <span>Choose DeltaMath Tab to Sync</span>
                </button>
              </div>
            )}

            {/* Floating Solution Overlay in Screen Link */}
            {lastSolvedResult && (
              <div className="absolute top-4 right-4 z-20 max-w-sm w-full bg-slate-900/95 border border-sky-500/50 rounded-xl p-4 shadow-2xl backdrop-blur-md text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 uppercase tracking-wider text-[10px]">
                    DeltaBot Live Solution:
                  </span>
                  <button
                    type="button"
                    onClick={() => setLastSolvedResult(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg font-mono text-base font-bold text-sky-300 break-all select-all border border-slate-800">
                  {lastSolvedResult.deltaMathFormatAnswer}
                </div>
                {lastSolvedResult.displayLatexAnswer && (
                  <div className="text-center pt-1">
                    <MathRenderer latex={lastSolvedResult.displayLatexAnswer} className="text-sm text-sky-200" />
                  </div>
                )}
                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                  <span>Auto-copied to clipboard!</span>
                  <span className="text-emerald-400 font-semibold">Press Ctrl+V to paste</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Iframe View (Direct or Proxy) */
          <div className="relative flex-1 w-full bg-slate-900">
            {isLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xs">
                <Sparkles className="w-8 h-8 text-sky-400 animate-spin mb-3" />
                <div className="text-sm font-semibold text-slate-200">
                  {connectionMode === 'direct'
                    ? 'Loading https://www.deltamath.com directly...'
                    : 'Connecting via reverse proxy gateway...'}
                </div>
              </div>
            )}

            {/* Embedded Iframe WITHOUT sandbox restrictions so DeltaMath can load naturally */}
            <iframe
              ref={iframeRef}
              src={currentUrl}
              onLoad={() => {
                setIsLoading(false);
              }}
              onError={() => {
                setIsLoading(false);
                setIframeError(true);
              }}
              className="w-full h-full border-none bg-white"
              title="DeltaMath Viewport"
            />

            {/* Fallback Banner for DeltaMath X-Frame-Options blocking */}
            {connectionMode === 'direct' && (
              <div className="absolute bottom-4 left-4 right-4 z-20 p-3 bg-slate-950/95 border border-sky-500/40 rounded-xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 text-slate-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    If your browser displays a connection error inside the frame (due to DeltaMath's security headers), switch to <strong>Live Tab Link</strong> or open the <strong>Direct Window</strong>.
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleStartScreenSync}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg flex items-center gap-1.5 shadow"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Switch to Live Tab Link</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenDirectWindow}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg flex items-center gap-1.5 shadow"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Real Window</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="bg-slate-950 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-2 truncate">
          <span className={`w-2 h-2 rounded-full ${isScreenLinked ? 'bg-emerald-400 animate-pulse' : 'bg-sky-400'}`} />
          <span>
            {connectionMode === 'screen-sync'
              ? isScreenLinked ? 'Live Screen Link Connected' : 'Screen Link Ready'
              : connectionMode === 'direct'
              ? 'Direct Connection Mode: https://www.deltamath.com/'
              : 'Proxy Gateway Connected'}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span>Problems Solved: <strong className="text-emerald-400 font-mono">{solveStreak}</strong></span>
          <span>•</span>
          <span>Mode: <strong className="text-sky-300 uppercase">{solvingMode}</strong></span>
        </div>
      </div>
    </div>
  );
};
