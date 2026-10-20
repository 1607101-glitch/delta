import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { solveLocally } from './src/server/localMathSolver.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '25mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint: Solve problem (Text or Image/Screenshot)
app.post('/api/solve', async (req: Request, res: Response) => {
  try {
    const { problemText, imageBase64, mimeType, topic, instructions } = req.body;

    if (!problemText && !imageBase64) {
      res.status(400).json({ error: 'Please provide either problem text or a screenshot image.' });
      return;
    }

    const systemPrompt = `You are the ultimate DeltaMath Auto-Solver engine.
Your purpose is to accurately solve any DeltaMath homework, test, or quiz problem across all grade levels (Algebra 1, Geometry, Algebra 2, Pre-Calculus, and AP Calculus).

Crucial DeltaMath formatting rules:
1. "deltaMathFormatAnswer": The EXACT answer string to be typed into DeltaMath.
   - For fractions: use slash notation like "3/4" or "-7/2" (never decimals unless requested or rounding is specified).
   - For radical expressions: use "sqrt(x)" or "2*sqrt(3)".
   - For quadratic solutions / equations: e.g. "x = 4, -3" or "x = 4" or "{ -3, 4 }".
   - For coordinate points: "(x, y)", e.g. "(-2, 5)".
   - For interval notation: e.g. "[-3, infinity)" or "(-oo, 4] U (7, oo)".
   - For polynomials/factoring: e.g. "(x - 5)(x + 2)" or "3(2x + 1)(x - 4)".
   - If rounding: round to the exact decimal places requested in the problem (e.g. nearest tenth, nearest hundredth).
   - If there is no solution: "No solution" or "DNE".
2. "steps": An array of clear, DeltaMath-style step-by-step reasoning steps.
   - Each step has "title", "content" (plain text explanation), and "mathLatex" (clean LaTeX formatted expression).
3. "summary": A quick 1-sentence recap.
4. "graphData": If the problem involves graphing lines, parabolas, or points, provide plotting parameters (type, points, equation).
5. Always double-check algebraic arithmetic, signs, and order of operations before outputting.

Return ONLY a valid JSON object matching this schema:
{
  "parsedProblem": "Clear text of the math problem",
  "topic": "Detected math category (e.g. Quadratic Equations, Factoring, Linear Systems, Trigonometry)",
  "deltaMathFormatAnswer": "The exact DeltaMath input string",
  "displayLatexAnswer": "Answer in LaTeX format for clean display",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Short title",
      "content": "Explanation of what is done here",
      "mathLatex": "LaTeX expression"
    }
  ],
  "alternativeForms": ["Alternative representation 1", "Alternative 2"],
  "commonMistakes": ["A common pitfall students make on DeltaMath for this topic"],
  "deltaMathInputTip": "Advice on how to type this in DeltaMath (e.g., press '/' to make a fraction, type 'sqrt' for square root)"
}`;

    const contents: any[] = [];

    if (imageBase64) {
      const cleanData = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      contents.push({
        inlineData: {
          mimeType: mimeType || 'image/png',
          data: cleanData,
        },
      });
    }

    let userPromptText = '';
    if (problemText) {
      userPromptText += `Problem:\n${problemText}\n`;
    }
    if (topic) {
      userPromptText += `Topic hint: ${topic}\n`;
    }
    if (instructions) {
      userPromptText += `Additional instructions: ${instructions}\n`;
    }
    if (imageBase64 && !problemText) {
      userPromptText += `Please examine this DeltaMath screenshot, transcribe the exact problem, solve it completely, and provide the exact DeltaMath input.\n`;
    }

    userPromptText += `\nOutput strictly valid JSON with no markdown backticks surrounding it, or pure JSON.`;
    contents.push({ text: userPromptText });

    let responseText = '';
    const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });
        if (response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} failed or unavailable:`, err?.message || err);
        lastError = err;
        // Short delay before fallback attempt
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    if (!responseText) {
      if (problemText) {
        const local = solveLocally(problemText, topic);
        if (local) {
          res.json({ success: true, data: local });
          return;
        }
      }
      throw lastError || new Error('Solver service is currently busy. Please try again.');
    }

    const rawText = responseText;
    let parsedResult;
    try {
      parsedResult = JSON.parse(rawText);
    } catch {
      const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleaned);
    }

    res.json({
      success: true,
      data: parsedResult,
    });
  } catch (error: any) {
    console.error('Solve Error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to solve problem. Please check input and try again.',
    });
  }
});

// Endpoint: Generate DeltaMath Practice Questions
app.post('/api/generate-practice', async (req: Request, res: Response) => {
  try {
    const { category, difficulty = 'medium', count = 1 } = req.body;

    const prompt = `Generate ${count} authentic, challenging DeltaMath-style question(s) for the curriculum topic: "${category || 'Algebra 1 - Solving Linear Equations'}".
Difficulty level: ${difficulty}.

Each problem must look and feel exactly like a real DeltaMath problem with authentic question phrasing, exact integer or simplified fraction answers, and clear steps.

Return ONLY a JSON array with objects matching:
[
  {
    "id": "unique-string",
    "topic": "Specific Skill Name",
    "prompt": "Problem statement formatted like DeltaMath",
    "promptLatex": "LaTeX representation of equations in the problem",
    "instructions": "Specific instruction e.g. 'Solve for x. Answer as a fraction or integer.'",
    "deltaMathFormatAnswer": "exact answer string",
    "displayLatexAnswer": "latex answer",
    "solutionSteps": [
      {
        "stepNumber": 1,
        "title": "Title",
        "content": "Explanation",
        "mathLatex": "LaTeX"
      }
    ],
    "inputPlaceholder": "e.g. x = ?",
    "inputType": "equation | single-value | coordinates | expression | multiple-choice"
  }
]`;

    let responseText = '';
    const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.4,
          },
        });
        if (response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} practice generation fallback:`, err?.message || err);
        lastError = err;
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    if (!responseText) {
      throw lastError || new Error('Failed to generate practice problems.');
    }

    const parsed = JSON.parse(responseText || '[]');
    res.json({ success: true, problems: parsed });
  } catch (error: any) {
    console.error('Practice Generation Error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to generate practice problems.',
    });
  }
});

// Serve public directory explicitly for injected scripts and static assets
app.use(express.static(path.resolve(__dirname, 'public')));

// Endpoint: Live DeltaMath Reverse Web Proxy
app.all('/api/deltamath-proxy*', async (req: Request, res: Response) => {
  try {
    let subPath = req.url.replace(/^\/api\/deltamath-proxy/, '');
    if (!subPath || subPath === '') subPath = '/';

    // Support query param ?url=https://www.deltamath.com/...
    let targetUrl: string;
    if (req.query.url) {
      targetUrl = decodeURIComponent(req.query.url as string);
    } else {
      targetUrl = `https://www.deltamath.com${subPath}`;
    }

    // Prepare headers
    const forwardHeaders: Record<string, string> = {
      'User-Agent':
        req.headers['user-agent'] ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: req.headers['accept'] || '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: 'https://www.deltamath.com/',
      Origin: 'https://www.deltamath.com',
    };

    if (req.headers.cookie) {
      forwardHeaders['Cookie'] = req.headers.cookie;
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers: forwardHeaders,
      redirect: 'follow',
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      forwardHeaders['Content-Type'] = req.headers['content-type'] || 'application/json';
    }

    const upstreamRes = await fetch(targetUrl, fetchOptions);

    // Forward status code
    res.status(upstreamRes.status);

    // Filter and forward response headers (strip frame protection)
    upstreamRes.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (
        lower === 'x-frame-options' ||
        lower === 'content-security-policy' ||
        lower === 'content-security-policy-report-only' ||
        lower === 'cross-origin-opener-policy' ||
        lower === 'cross-origin-resource-policy' ||
        lower === 'content-encoding' // Let fetch decode transparently
      ) {
        return;
      }

      if (lower === 'set-cookie') {
        // Strip domain restriction so cookies work in proxy
        const rewrittenCookie = value.replace(/domain=[^;]+;?/gi, '');
        res.setHeader(key, rewrittenCookie);
      } else {
        res.setHeader(key, value);
      }
    });

    // Ensure iframe framing is permitted
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const contentType = upstreamRes.headers.get('content-type') || '';

    if (contentType.includes('text/html')) {
      let html = await upstreamRes.text();

      // Ensure base tag is present for relative DeltaMath assets (images, fonts, bundles)
      if (!html.includes('<base')) {
        html = html.replace('<head>', '<head><base href="https://www.deltamath.com/">');
      }

      // Inject the DeltaBot script HUD before closing body tag
      const injection = `
<!-- DeltaBot Injected Solver -->
<script src="/deltabot-injected.js?_v=${Date.now()}"></script>
</body>`;

      if (html.includes('</body>')) {
        html = html.replace('</body>', injection);
      } else {
        html += injection;
      }

      res.send(html);
    } else {
      // Stream binary/asset responses directly
      const buffer = await upstreamRes.arrayBuffer();
      res.send(Buffer.from(buffer));
    }
  } catch (error: any) {
    console.error('DeltaMath Proxy Error:', error);
    res.status(502).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>DeltaMath Proxy Gateway</title>
        <style>
          body { font-family: -apple-system, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; text-align: center; }
          .card { max-width: 500px; margin: 40px auto; background: #1e293b; border: 1px solid #334155; padding: 30px; border-radius: 16px; }
          h2 { color: #38bdf8; margin-top: 0; }
          p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
          a { display: inline-block; background: #0284c7; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>DeltaMath Proxy Gateway</h2>
          <p>Connecting to <code>https://www.deltamath.com</code>... If your connection is filtered by school firewalls or Cloudflare, you can also use our 1-click Bookmarklet to solve directly in your browser tab.</p>
          <a href="/api/deltamath-proxy/" onclick="location.reload(); return false;">Retry Proxy Connection</a>
        </div>
      </body>
      </html>
    `);
  }
});

// Endpoint: Status check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'DeltaSolve Engine',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DeltaSolve server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
