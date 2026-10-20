# In-App DeltaMath Live Web Proxy & Autonomous Solver HUD

An authentic, working in-app web proxy architecture that loads the live DeltaMath website (`deltamath.com`) directly inside the application, strips restrictive frame headers, injects an autonomous DeltaBot solving overlay, and provides both fully autonomous and humanized stealth solving modes.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed based on your requirements:
> - **In-App Live Connection**: Full reverse web proxy (`/api/deltamath-proxy/*`) that fetches live pages from `https://www.deltamath.com`, strips framing barriers (`X-Frame-Options` and `CSP`), and renders the real website inside an integrated in-app browser view.
> - **Injected DeltaBot HUD**: A script injected directly into the proxied DeltaMath DOM that detects active problem text, formulas, and input fields.
> - **Solving Modes**: User toggle between **Fully Autonomous Mode** (auto-detect, auto-solve, auto-type, and auto-submit in an infinite loop) and **Humanized Stealth Mode** (realistic 3–6s calculation pauses, 45 WPM keystroke pacing).
> - **Companion Bookmarklet Bridge**: A 1-click browser bridge for school SSO accounts that require external login or browser extension execution.

---

## 1. Overview & Core Concept

- **What It Does**: Bridges the application directly to the live `deltamath.com` website. Students can navigate, log in to their real DeltaMath school account, view their actual assigned homework modules, and activate DeltaBot to automatically solve problems on the page.
- **Target Audience**: Students tackling daily DeltaMath homework, test reviews, and timed math modules across Algebra, Geometry, Pre-Calculus, and AP Calculus.
- **Key Value**: Eliminates mock or fake data. Directly inspects real live DeltaMath DOM elements, inputs exact mathematical solutions into the real page, and handles automated submission.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Live Browser Navigation**: Student enters the in-app browser view showing `https://www.deltamath.com`. The browser toolbar features an address bar, reload, back/forward buttons, and a status indicator.
2. **Real Account Log In**: The user logs into DeltaMath via their real student credentials or Google account inside the proxied viewport.
3. **Problem Detection & HUD Activation**: When an assignment or problem loads, the injected DeltaBot HUD expands with the parsed problem, target answer, and step breakdown.
4. **Autonomous vs. Humanized Solving**:
   - In *Autonomous Mode*, clicking "Start Auto-Pilot" solves problems continuously, typing the answer and submitting automatically.
   - In *Humanized Mode*, DeltaBot simulates realistic human pauses (configurable 2s–8s) and types each character with randomized intervals before submitting.
5. **Real-Time Visual Feedback**: The browser frame highlights active DeltaMath inputs in blue, displays KaTeX-rendered solution steps, and tracks completed problem streaks.

### Visual Identity & Theme
- **Dominant Neutral Canvas**: Deep slate foundation (`#0F172A`) keeping focus on the live proxied DeltaMath viewport.
- **Structural Surfaces**: Subtle hairline borders (`#1E293B`), frosted glass HUD backgrounds with high backdrop-blur (`bg-slate-900/90`).
- **Semantic Accents**: DeltaMath signature royal blue (`#1D4ED8` and `#38BDF8`), success emerald (`#10B981`) for correct submissions, and amber (`#F59E0B`) for humanized stealth status.
- **Typography**: Clean display typography (`Plus Jakarta Sans`), readable body text (`DM Sans`), and tabular monospace (`font-mono tabular-nums`) for formulas and timer intervals.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Live Reverse Proxy vs. Static Simulation**
  - *Chosen Approach*: Implement an Express HTTP reverse proxy (`/api/deltamath-proxy/*`) that forwards requests to `deltamath.com`, rewrites asset links (CSS, JS, images), rewrites cookies, and removes `X-Frame-Options` and `Content-Security-Policy: frame-ancestors`.
  - *Why*: Enables real in-app browsing and login on the actual website without relying on simulated questions.
- **Decision 2: Script Injection for DeltaBot**
  - *Chosen Approach*: The proxy automatically injects `deltabot-injected.js` into proxied HTML responses before streaming them to the client.
  - *Why*: Allows direct DOM access to DeltaMath's input fields (`input`, `.mathquill-rendered-math`, buttons) to automate typing and submission without cross-origin iframe security errors.
- **Decision 3: Dual Mode (Autonomous & Humanized)**
  - *Chosen Approach*: Autonomous mode executes instant solves and submissions for maximum speed. Humanized mode introduces customizable delays and typing simulation to avoid anti-cheat flags.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    In-App Browser Client                        │
│  ┌───────────────────────┐   ┌───────────────────────────────┐  │
│  │   Browser Toolbar     │   │     DeltaBot HUD Overlay      │  │
│  │  [URL] [Back] [Reload]│   │  [Autonomous] [Humanized]     │  │
│  └──────────┬────────────┘   └───────────────┬───────────────┘  │
│             │                                │                  │
│  ┌──────────▼────────────────────────────────▼───────────────┐  │
│  │              Proxied DeltaMath iframe View                │  │
│  │   - Injected `deltabot-injected.js` script                │  │
│  │   - Real DOM Scraper & Keystroke Synthesizer              │  │
│  └──────────────────────────┬────────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                    HTTP Proxy & API Calls
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                     Express Backend Server                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  `/api/deltamath-proxy/*` (Reverse Proxy & Header Rewriter│  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  `/api/solve` (Gemini 3.8 Flash + Local Math CAS Engine)  │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  `/deltabot-injected.js` (DOM automation & solver client) │  │
│  └──────────────────────────┬────────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                    Upstream Web Requests
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│              Live DeltaMath (`deltamath.com`)                   │
└─────────────────────────────────────────────────────────────────┘
```

### Component & File Mapping
1. **`server.ts`**:
   - Adds `/api/deltamath-proxy/*` streaming reverse proxy using native `fetch` / streams.
   - Strips `x-frame-options`, `content-security-policy`, and rewrites cookie domains.
   - Injects the DeltaBot client script into HTML pages.
2. **`public/deltabot-injected.js`**:
   - In-page script running directly inside the DeltaMath frame.
   - Detects problem containers, parses math text/images, sends payloads to `/api/solve`.
   - Dispatches realistic keyboard events (`keydown`, `input`, `keyup`) into DeltaMath input boxes.
   - Clicks "Submit Answer" and listens for score updates.
3. **`src/components/LiveWebProxyBrowser.tsx`**:
   - Sleek in-app browser interface with address bar, quick navigation to DeltaMath login and student solve paths.
   - Integrated control deck for Autonomous vs. Humanized modes, delay slider, and live solver log.
4. **`src/components/BookmarkletModal.tsx`**:
   - 1-click copyable bookmarklet that runs the exact same DeltaBot engine on an external DeltaMath tab if desired.
5. **`src/App.tsx`**:
   - Updates main layout to feature the Live In-App Browser as the primary interactive experience, keeping the custom solver and screenshot OCR tools readily accessible.
