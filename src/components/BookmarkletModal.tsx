import React, { useState } from 'react';
import { X, Bookmark, Copy, Check, Sparkles, ExternalLink, HelpCircle } from 'lucide-react';

interface BookmarkletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BookmarkletModal: React.FC<BookmarkletModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const bookmarkletCode = `javascript:(function(){var s=document.createElement('script');s.src='${currentOrigin}/deltabot-injected.js?_='+Date.now();document.body.appendChild(s);})();`;

  const handleCopy = () => {
    navigator.clipboard.writeText(bookmarkletCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-5 text-white flex items-center justify-between border-b border-blue-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-400/30">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">1-Click DeltaBot Bookmarklet</h3>
              <p className="text-xs text-blue-200">
                Run DeltaBot directly on any external deltamath.com browser tab
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

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-slate-300">
          <p className="text-sm text-slate-200">
            If you are already logged into DeltaMath in another browser tab (such as through school Google Chromebook SSO), you can run DeltaBot directly on that page with this bookmarklet.
          </p>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
              Bookmarklet Code:
            </span>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-sky-200 break-all select-all">
              {bookmarkletCode}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={handleCopy}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg flex items-center gap-2 transition cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Copied Bookmarklet!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Bookmarklet Code</span>
                  </>
                )}
              </button>

              <a
                href={bookmarkletCode}
                onClick={(e) => {
                  e.preventDefault();
                  alert('Drag this button to your Bookmarks Toolbar in your browser!');
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg border border-slate-600 transition cursor-grab"
                title="Drag to your bookmarks bar"
              >
                ★ Drag to Bookmarks
              </a>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <h4 className="font-bold text-slate-200 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <HelpCircle className="w-4 h-4 text-sky-400" />
              Quick 30-Second Setup:
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1 leading-relaxed">
              <li>Copy the bookmarklet code above or drag the button to your Bookmarks bar.</li>
              <li>Open your DeltaMath assignment at <code className="text-sky-300">deltamath.com</code>.</li>
              <li>Click the bookmark in your bookmarks bar. The floating DeltaBot HUD will immediately appear on the live page!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
