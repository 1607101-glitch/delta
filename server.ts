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
app.use(express.static(path.resolve(__dirname, 'public')));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint: Solve DeltaMath Problem (Text or Image/Screenshot)
app.post('/api/solve', async (req: Request, res: Response) => {
  try {
    const { problemText, imageBase64, mimeType, topic, instructions } = req.body;

    if (!problemText && !imageBase64) {
      res.status(400).json({ error: 'Please provide problem text or a screenshot.' });
      return;
    }

    const systemPrompt = `You are an expert DeltaMath homework assistant.
Your goal is to solve any DeltaMath problem (Algebra 1, Geometry, Algebra 2, Pre-Calculus, Calculus).

Rules:
1. "deltaMathFormatAnswer": The EXACT answer string to be typed into DeltaMath.
   - For fractions: use slash notation e.g. "3/4" or "-7/2" (never decimals unless rounding is requested).
   - For radicals: use "sqrt(x)" or "2*sqrt(3)".
   - For quadratic solutions / equations: e.g. "x = 4, -3" or "x = 4".
   - For coordinate points: "(x, y)", e.g. "(-2, 5)".
   - For interval notation: e.g. "[-3, infinity)" or "(-oo, 4] U (7, oo)".
   - For polynomials/factoring: e.g. "(x - 5)(x + 2)".
   - If rounding: round to the exact decimal places requested in the problem.
   - If there is no solution: "No solution" or "DNE".
2. "steps": Step-by-step reasoning with title, content, and mathLatex.

Return ONLY a valid JSON object matching this schema:
{
  "parsedProblem": "Clear text of the math problem",
  "topic": "Detected math category",
  "deltaMathFormatAnswer": "The exact DeltaMath input string",
  "displayLatexAnswer": "Answer in LaTeX format for clean display",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Short title",
      "content": "Explanation",
      "mathLatex": "LaTeX expression"
    }
  ],
  "alternativeForms": ["Alternative 1"],
  "commonMistakes": ["A common pitfall students make"],
  "deltaMathInputTip": "Advice on how to type this into DeltaMath"
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
      userPromptText += `Topic: ${topic}\n`;
    }
    if (instructions) {
      userPromptText += `Instructions: ${instructions}\n`;
    }
    if (imageBase64 && !problemText) {
      userPromptText += `Transcribe the math problem from this screenshot and solve it with exact DeltaMath syntax.\n`;
    }

    userPromptText += `\nOutput strictly valid JSON with no markdown wrapping.`;
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
        lastError = err;
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

    let parsedResult;
    try {
      parsedResult = JSON.parse(responseText);
    } catch {
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
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
      error: error?.message || 'Failed to solve problem. Please try again.',
    });
  }
});

// Endpoint: Health check
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
