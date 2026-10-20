/**
 * DeltaBot Injected Script
 * Automatically injected into proxied DeltaMath pages.
 * Inspects real DOM elements, scrapes active problems, communicates with the DeltaSolve API,
 * and automates typing and submissions in Autonomous or Humanized mode.
 */

(function () {
  if (window.__DELTABOT_INITIALIZED__) return;
  window.__DELTABOT_INITIALIZED__ = true;

  console.log('[DeltaBot] Injected successfully into page:', window.location.href);

  // Configuration state
  const state = {
    mode: 'humanized', // 'autonomous' | 'humanized' | 'manual'
    stealthDelay: 3000,
    isSolving: false,
    autoPilotRunning: false,
    currentProblemText: '',
    currentAnswer: '',
    streak: 0,
    minimized: false,
  };

  // Helper: notify parent window if embedded in iframe
  function notifyParent(action, payload) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ source: 'deltabot-injected', action, payload }, '*');
    }
  }

  // Scrape problem statement from active DeltaMath DOM
  function detectProblem() {
    // DeltaMath DOM selector heuristics
    const selectors = [
      '.problem-content',
      '.problem',
      '#problem',
      '.problem-body',
      '.question-body',
      '.practice-problem',
      '[class*="problem"]',
      '.math-problem',
      'main',
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText && el.innerText.trim().length > 10) {
        return el.innerText.trim();
      }
    }

    // Fallback: search main or body for math content
    const bodyText = document.body.innerText;
    const lines = bodyText.split('\n').filter(l => l.trim().length > 0);
    const candidate = lines.find(l => /solve|factor|evaluate|find|graph|simplify|equation/i.test(l));
    return candidate || bodyText.slice(0, 300);
  }

  // Find active DeltaMath input elements
  function findInputElement() {
    // Check standard text input, mathquill textarea, or active element
    const inputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type]), textarea, .mathquill-editable textarea'));
    const visible = inputs.find(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && !el.disabled;
    });
    return visible || document.querySelector('input');
  }

  // Find DeltaMath submit button
  function findSubmitButton() {
    const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], [role="button"], a.btn'));
    return buttons.find(b => {
      const t = (b.innerText || b.value || '').toLowerCase();
      return t.includes('submit') || t.includes('check') || t.includes('enter');
    });
  }

  // Call solver backend API
  async function solveProblem(problemText) {
    state.isSolving = true;
    updateWidgetUI();
    notifyParent('solving_started', { problemText });

    try {
      const res = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemText,
          instructions: 'DeltaMath live problem on web page.',
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to solve');
      }

      state.currentAnswer = data.data.deltaMathFormatAnswer;
      state.lastResult = data.data;
      notifyParent('solved', data.data);
      return data.data;
    } catch (err) {
      console.error('[DeltaBot] Solve error:', err);
      notifyParent('solve_error', { error: err.message });
      return null;
    } finally {
      state.isSolving = false;
      updateWidgetUI();
    }
  }

  // Simulate realistic typing into input field
  async function typeAnswerIntoInput(inputEl, text, humanized = true) {
    if (!inputEl) return;
    inputEl.focus();

    if (!humanized) {
      inputEl.value = text;
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      inputEl.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    // Humanized keystroke typing
    inputEl.value = '';
    for (let i = 0; i < text.length; i++) {
      inputEl.value += text[i];
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: text[i], bubbles: true }));
      inputEl.dispatchEvent(new KeyboardEvent('keyup', { key: text[i], bubbles: true }));
      await new Promise(r => setTimeout(r, 40 + Math.random() * 50));
    }
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Execute full solve & submit cycle
  async function runSolveCycle() {
    const problem = detectProblem();
    state.currentProblemText = problem;
    updateWidgetUI();

    const result = await solveProblem(problem);
    if (!result) return;

    const inputEl = findInputElement();
    const isHuman = state.mode === 'humanized';

    if (isHuman) {
      // Humanized delay
      await new Promise(r => setTimeout(r, state.stealthDelay));
    }

    if (inputEl) {
      await typeAnswerIntoInput(inputEl, result.deltaMathFormatAnswer, isHuman);
    }

    // Auto-submit if in autonomous or humanized auto-pilot
    if (state.autoPilotRunning || state.mode === 'autonomous') {
      if (isHuman) {
        await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
      }
      const submitBtn = findSubmitButton();
      if (submitBtn) {
        submitBtn.click();
        state.streak++;
        notifyParent('submitted', { answer: result.deltaMathFormatAnswer, streak: state.streak });
      }

      // Schedule next problem loop if in auto-pilot
      if (state.autoPilotRunning) {
        setTimeout(() => {
          runSolveCycle();
        }, 4000);
      }
    }
  }

  // Mount Floating HUD inside DeltaMath page
  let widgetContainer = null;
  function mountWidget() {
    if (document.getElementById('deltabot-floating-hud')) return;

    widgetContainer = document.createElement('div');
    widgetContainer.id = 'deltabot-floating-hud';
    widgetContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 20px 35px -5px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.15);
      border-radius: 16px;
      background: #0f172a;
      color: #f8fafc;
      overflow: hidden;
      width: 320px;
      transition: all 0.25s ease;
    `;

    document.body.appendChild(widgetContainer);
    updateWidgetUI();
  }

  function updateWidgetUI() {
    if (!widgetContainer) return;

    if (state.minimized) {
      widgetContainer.style.width = 'auto';
      widgetContainer.innerHTML = `
        <div id="deltabot-restore-btn" style="padding: 10px 14px; display: flex; items-center; gap: 8px; cursor: pointer; background: linear-gradient(135deg, #0284c7, #1e40af); font-weight: bold; font-size: 13px;">
          <span>Δ</span> DeltaBot Active
        </div>
      `;
      document.getElementById('deltabot-restore-btn')?.addEventListener('click', () => {
        state.minimized = false;
        updateWidgetUI();
      });
      return;
    }

    widgetContainer.style.width = '330px';
    widgetContainer.innerHTML = `
      <div style="background: linear-gradient(135deg, #1e3a8a, #0369a1); padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="background: rgba(255,255,255,0.2); padding: 2px 7px; border-radius: 6px; font-weight: 900; font-size: 13px;">Δ</span>
          <span style="font-weight: 700; font-size: 13px; letter-spacing: -0.2px;">DeltaBot Live HUD</span>
        </div>
        <button id="deltabot-min-btn" style="background: transparent; border: none; color: #cbd5e1; cursor: pointer; font-size: 16px; padding: 2px 6px;">−</button>
      </div>

      <div style="padding: 12px; display: flex; flex-direction: column; gap: 10px; font-size: 12px;">
        <!-- Status & Mode Switch -->
        <div style="display: flex; justify-content: space-between; align-items: center; background: #1e293b; padding: 8px 10px; border-radius: 8px;">
          <span style="color: #94a3b8;">Mode:</span>
          <div style="display: flex; gap: 4px;">
            <button id="deltabot-mode-human" style="padding: 3px 8px; border-radius: 5px; border: none; font-size: 11px; cursor: pointer; font-weight: 600; ${state.mode === 'humanized' ? 'background: #0284c7; color: white;' : 'background: #334155; color: #cbd5e1;'}">Humanized</button>
            <button id="deltabot-mode-auto" style="padding: 3px 8px; border-radius: 5px; border: none; font-size: 11px; cursor: pointer; font-weight: 600; ${state.mode === 'autonomous' ? 'background: #059669; color: white;' : 'background: #334155; color: #cbd5e1;'}">Auto</button>
          </div>
        </div>

        <!-- Calculated Answer Box -->
        <div style="background: #020617; border: 1px solid #1e293b; padding: 8px 10px; border-radius: 8px;">
          <div style="color: #64748b; font-size: 10px; text-transform: uppercase; font-weight: 700;">Calculated Answer:</div>
          <div style="color: #38bdf8; font-family: monospace; font-size: 15px; font-weight: bold; margin-top: 3px; word-break: break-all;">
            ${state.currentAnswer || (state.isSolving ? 'Solving live question...' : 'Click Auto-Solve below')}
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
          <button id="deltabot-solve-btn" style="background: #2563eb; color: white; border: none; padding: 8px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 12px;" ${state.isSolving ? 'disabled' : ''}>
            ${state.isSolving ? 'Solving...' : '⚡ Auto-Solve'}
          </button>
          <button id="deltabot-autopilot-btn" style="background: ${state.autoPilotRunning ? '#dc2626' : '#059669'}; color: white; border: none; padding: 8px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 12px;">
            ${state.autoPilotRunning ? '⏹ Stop Loop' : '▶ Auto-Pilot'}
          </button>
        </div>

        <!-- Stealth delay info -->
        <div style="font-size: 11px; color: #64748b; display: flex; justify-content: space-between;">
          <span>Stealth Delay: ${(state.stealthDelay / 1000).toFixed(1)}s</span>
          <span>Solved Streak: ${state.streak}</span>
        </div>
      </div>
    `;

    // Bind event listeners
    document.getElementById('deltabot-min-btn')?.addEventListener('click', () => {
      state.minimized = true;
      updateWidgetUI();
    });

    document.getElementById('deltabot-mode-human')?.addEventListener('click', () => {
      state.mode = 'humanized';
      updateWidgetUI();
      notifyParent('mode_change', { mode: 'humanized' });
    });

    document.getElementById('deltabot-mode-auto')?.addEventListener('click', () => {
      state.mode = 'autonomous';
      updateWidgetUI();
      notifyParent('mode_change', { mode: 'autonomous' });
    });

    document.getElementById('deltabot-solve-btn')?.addEventListener('click', () => {
      runSolveCycle();
    });

    document.getElementById('deltabot-autopilot-btn')?.addEventListener('click', () => {
      state.autoPilotRunning = !state.autoPilotRunning;
      updateWidgetUI();
      notifyParent('autopilot_toggle', { running: state.autoPilotRunning });
      if (state.autoPilotRunning) {
        runSolveCycle();
      }
    });
  }

  // Listen for messages from parent window
  window.addEventListener('message', (event) => {
    if (!event.data || event.data.target !== 'deltabot-injected') return;
    const { command, payload } = event.data;

    if (command === 'trigger_solve') {
      runSolveCycle();
    } else if (command === 'set_mode') {
      state.mode = payload.mode || state.mode;
      updateWidgetUI();
    } else if (command === 'set_delay') {
      state.stealthDelay = (payload.delaySeconds || 3) * 1000;
      updateWidgetUI();
    } else if (command === 'toggle_autopilot') {
      state.autoPilotRunning = !state.autoPilotRunning;
      updateWidgetUI();
      if (state.autoPilotRunning) runSolveCycle();
    }
  });

  // Mount when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountWidget);
  } else {
    mountWidget();
  }
})();
