import React, { useState } from 'react';
import { X, Bookmark, Copy, Check, ExternalLink, ShieldCheck, Zap } from 'lucide-react';

interface BookmarkletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BookmarkletModal: React.FC<BookmarkletModalProps> = ({ isOpen, onClose }) => {
  const [copiedType, setCopiedType] = useState<'copy' | 'open' | null>(null);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  // 100% self-contained inline bookmarklet: ZERO external network fetches or script tags (Linewize & CSP safe)
  const copyProblemBookmarklet = `javascript:(function(){try{var s=['.problem-content','.problem','#problem','.problem-body','.question-body','.practice-problem','[class*="problem"]','main'];var t='';for(var i=0;i<s.length;i++){var el=document.querySelector(s[i]);if(el&&el.innerText&&el.innerText.trim().length>10){t=el.innerText.trim();break;}}if(!t){t=window.getSelection().toString().trim()||document.body.innerText.slice(0,350);}if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t);}else{var a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();document.execCommand('copy');document.body.removeChild(a);}var o=document.getElementById('deltasolve-toast');if(o)o.remove();var d=document.createElement('div');d.id='deltasolve-toast';d.style.cssText='position:fixed;top:20px;right:20px;z-index:9999999;background:#0284c7;color:#fff;padding:12px 18px;border-radius:10px;font-family:sans-serif;font-size:14px;box-shadow:0 10px 25px rgba(0,0,0,0.35);font-weight:600;display:flex;align-items:center;gap:8px;transition:opacity 0.3s;';d.innerHTML='&#10003; DeltaMath problem copied! Switch to DeltaSolve or press Ctrl+V.';document.body.appendChild(d);setTimeout(function(){d.style.opacity='0';setTimeout(function(){d.remove();},300);},3000);}catch(e){alert('DeltaSolve: '+e.message);}})();`;

  const openInAppBookmarklet = `javascript:(function(){try{var s=['.problem-content','.problem','#problem','.problem-body','.question-body','.practice-problem','[class*="problem"]','main'];var t='';for(var i=0;i<s.length;i++){var el=document.querySelector(s[i]);if(el&&el.innerText&&el.innerText.trim().length>10){t=el.innerText.trim();break;}}if(!t){t=window.getSelection().toString().trim()||document.body.innerText.slice(0,350);}window.open('${currentOrigin}/?problem='+encodeURIComponent(t),'_blank');}catch(e){alert('DeltaSolve: '+e.message);}})();`;

  const handleCopy = (code: string, type: 'copy' | 'open') => {
    navigator.clipboard.writeText(code);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-5 text-white flex items-center justify-between border-b border-blue-700/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-400/30">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold">Linewize & CSP-Safe DeltaMath Bookmarklets</h3>
              <p className="text-xs text-blue-200">
                100% self-contained JavaScript • Zero external network requests
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
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs">
            <strong>School Chromebook Verified:</strong> Unlike traditional extensions or remote scripts, these bookmarklets run purely inside your browser memory without loading external scripts, preventing DeltaMath Content Security Policy (CSP) and Linewize blocks.
          </div>

          {/* Option 1: Copy problem to clipboard */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-sky-400" />
                1. "Copy Question" Bookmarklet (Recommended)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Copies DOM text to clipboard</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Clicking this bookmarklet on DeltaMath extracts the question text/math and shows a toast. Then switch to this tab or press <kbd className="px-1 rounded bg-slate-800 text-sky-300">Ctrl+V</kbd>.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleCopy(copyProblemBookmarklet, 'copy')}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg flex items-center gap-1.5 transition"
              >
                {copiedType === 'copy' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Bookmarklet Code</span>
                  </>
                )}
              </button>
              <a
                href={copyProblemBookmarklet}
                onClick={(e) => {
                  e.preventDefault();
                  alert('Drag this button to your Bookmarks Toolbar in Chrome!');
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg border border-slate-700 cursor-grab"
              >
                ★ Drag to Bookmarks
              </a>
            </div>
          </div>

          {/* Option 2: Direct Open in DeltaSolve */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                2. "Solve in DeltaSolve" Bookmarklet
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Opens solver with ?problem=...</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Extracts the question and opens a new tab in this solver with the problem auto-populated and solved immediately.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleCopy(openInAppBookmarklet, 'open')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
              >
                {copiedType === 'open' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
              <a
                href={openInAppBookmarklet}
                onClick={(e) => {
                  e.preventDefault();
                  alert('Drag this button to your Bookmarks Toolbar in Chrome!');
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg border border-slate-700 cursor-grab"
              >
                ★ Drag to Bookmarks
              </a>
            </div>
          </div>

          <div className="pt-1 text-[11px] text-slate-400">
            <strong>How to add in Chrome:</strong> Press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-200">Ctrl + Shift + O</kbd> to open Bookmarks, click <em>Add new bookmark</em>, and paste the code into the URL field.
          </div>
        </div>
      </div>
    </div>
  );
};
