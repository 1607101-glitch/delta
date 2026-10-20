import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Camera, Sparkles, Check, Copy, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { SolverResult } from '../types';
import { MathRenderer } from './MathRenderer';

interface ScreenshotSolverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySolutionToWorkspace?: (result: SolverResult) => void;
}

export const ScreenshotSolverModal: React.FC<ScreenshotSolverModalProps> = ({
  isOpen,
  onClose,
  onApplySolutionToWorkspace,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSolving, setIsSolving] = useState(false);
  const [result, setResult] = useState<SolverResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listen for Ctrl+V paste anywhere while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              setSelectedImage(event.target?.result as string);
              setResult(null);
              setError(null);
            };
            reader.readAsDataURL(blob);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSolveImage = async () => {
    if (!selectedImage) return;

    setIsSolving(true);
    setError(null);
    try {
      const res = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: selectedImage,
          mimeType: 'image/png',
          instructions: 'DeltaMath screenshot. Extract problem, compute exact answer and step-by-step solution.',
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to analyze screenshot.');
      }
      setResult(data.data);
    } catch (err: any) {
      setError(err.message || 'Error communicating with solver service.');
    } finally {
      setIsSolving(false);
    }
  };

  // Sample screenshots generator (generates authentic DeltaMath screenshot canvas for testing)
  const loadSampleScreenshot = (sampleType: 'algebra' | 'quad' | 'trig') => {
    const canvas = document.createElement('canvas');
    canvas.width = 650;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background DeltaMath layout
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // DeltaMath Header bar
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(0, 0, canvas.width, 48);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('Δ DeltaMath - Student Problem', 20, 30);

    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#93c5fd';
    ctx.fillText('Score: 4/5   Penalty: -0.25', canvas.width - 200, 30);

    // Problem Box
    ctx.fillStyle = '#1e293b';
    ctx.roundRect?.(20, 65, canvas.width - 40, canvas.height - 85, 12);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 15px sans-serif';

    if (sampleType === 'algebra') {
      ctx.fillText('Topic: Solving Linear Equations (Variables Both Sides)', 40, 105);
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText('Solve the following equation for x in simplest form:', 40, 135);
      ctx.font = 'bold 22px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('7(2x - 3) = 4(3x + 1) + 7', 40, 180);
      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Instructions: Enter integer or simplified fraction.', 40, 220);
    } else if (sampleType === 'quad') {
      ctx.fillText('Topic: Factoring Trinomials Completely', 40, 105);
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText('Factor the quadratic expression completely:', 40, 135);
      ctx.font = 'bold 24px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('3x² - 13x - 10', 40, 180);
      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Answer format: (ax + b)(cx + d)', 40, 220);
    } else {
      ctx.fillText('Topic: Right Triangle Trigonometry (Angles)', 40, 105);
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText('Find angle θ to the nearest tenth of a degree given:', 40, 135);
      ctx.font = 'bold 22px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('tan(θ) = 15 / 8', 40, 180);
      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Answer format: Decimal degrees rounded to nearest tenth', 40, 220);
    }

    // Input simulation box
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 250, 240, 40);
    ctx.fillRect(40, 250, 240, 40);
    ctx.fillStyle = '#64748b';
    ctx.font = '14px sans-serif';
    ctx.fillText('Type your answer...', 55, 275);

    const dataUrl = canvas.toDataURL('image/png');
    setSelectedImage(dataUrl);
    setResult(null);
    setError(null);
  };

  const copyAnswer = () => {
    if (result?.deltaMathFormatAnswer) {
      navigator.clipboard.writeText(result.deltaMathFormatAnswer);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between border-b border-blue-700/50">
          <div className="flex items-center gap-2.5">
            <Camera className="w-5 h-5 text-sky-300" />
            <div>
              <h3 className="font-bold text-base leading-tight">Instant Screenshot / Camera OCR</h3>
              <p className="text-xs text-blue-200">
                Paste any DeltaMath problem screenshot (Ctrl+V) or upload
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Preset Samples */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="text-slate-400 font-medium">Or try ready-made DeltaMath screenshot:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => loadSampleScreenshot('algebra')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700"
              >
                Sample 1 (Linear Eq)
              </button>
              <button
                type="button"
                onClick={() => loadSampleScreenshot('quad')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700"
              >
                Sample 2 (Factoring)
              </button>
              <button
                type="button"
                onClick={() => loadSampleScreenshot('trig')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700"
              >
                Sample 3 (Trigonometry)
              </button>
            </div>
          </div>

          {/* Upload / Paste Box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-xl p-5 bg-slate-950/60 hover:bg-slate-950 text-center cursor-pointer transition group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            {selectedImage ? (
              <div className="space-y-3">
                <div className="max-h-56 overflow-hidden rounded-lg border border-slate-700 flex justify-center bg-black/40">
                  <img
                    src={selectedImage}
                    alt="DeltaMath Screenshot"
                    className="max-h-56 object-contain"
                  />
                </div>
                <p className="text-xs text-sky-400 font-medium">
                  Screenshot Loaded • Click to change or press Ctrl+V to paste another
                </p>
              </div>
            ) : (
              <div className="py-6 space-y-2">
                <div className="w-12 h-12 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center mx-auto group-hover:scale-110 transition">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-sm font-semibold text-slate-200">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 font-mono text-xs text-sky-300">Ctrl + V</kbd> to paste screenshot
                </div>
                <p className="text-xs text-slate-400">
                  or drag and drop your DeltaMath screenshot file here (PNG, JPG, WebP)
                </p>
              </div>
            )}
          </div>

          {/* Solve Button */}
          {selectedImage && !result && (
            <button
              type="button"
              onClick={handleSolveImage}
              disabled={isSolving}
              className="w-full py-3 px-4 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-sky-900/40 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              {isSolving ? (
                <>
                  <Sparkles className="w-5 h-5 animate-spin text-sky-200" />
                  <span>Scanning screenshot & computing exact DeltaMath answer...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-amber-300" />
                  <span>Solve Screenshot Automatically</span>
                </>
              )}
            </button>
          )}

          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl">
              {error}
            </div>
          )}

          {/* Solution Result */}
          {result && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3.5 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    Auto-Solved Successfully
                  </span>
                  <h4 className="text-sm font-semibold text-slate-200">{result.topic || 'DeltaMath Problem'}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={copyAnswer}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-sky-600/30 border border-sky-500/50 text-sky-200 hover:bg-sky-600/50 flex items-center gap-1.5 transition"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Answer</span>
                      </>
                    )}
                  </button>

                  {onApplySolutionToWorkspace && (
                    <button
                      type="button"
                      onClick={() => {
                        onApplySolutionToWorkspace(result);
                        onClose();
                      }}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition"
                    >
                      <span>Load to Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Exact DeltaMath Answer Card */}
              <div className="p-3.5 rounded-xl bg-blue-950/60 border-2 border-blue-500/60 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-blue-300">
                    DeltaMath Input String:
                  </div>
                  <div className="text-xl font-mono font-bold text-white tracking-wide mt-0.5 select-all">
                    {result.deltaMathFormatAnswer}
                  </div>
                </div>
                {result.displayLatexAnswer && (
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-blue-300">Rendered Form:</div>
                    <MathRenderer latex={result.displayLatexAnswer} className="text-lg text-sky-300" />
                  </div>
                )}
              </div>

              {result.deltaMathInputTip && (
                <div className="text-xs text-sky-300 bg-sky-950/40 p-2.5 rounded-lg border border-sky-800/40 flex items-center gap-2">
                  <span className="font-bold">Input tip:</span>
                  <span>{result.deltaMathInputTip}</span>
                </div>
              )}

              {/* Step by step */}
              <div className="space-y-2 pt-1">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  DeltaMath Step-by-Step Breakdown:
                </span>
                <div className="space-y-2">
                  {result.steps?.map((step, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
                      <div className="font-semibold text-sky-400">
                        Step {step.stepNumber || idx + 1}: {step.title}
                      </div>
                      <p className="text-slate-300">{step.content}</p>
                      {step.mathLatex && (
                        <div className="pt-1 text-center bg-slate-950/60 p-2 rounded border border-slate-800">
                          <MathRenderer latex={step.mathLatex} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
