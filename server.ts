import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { solveMathLocally } from './src/utils/mathSolver.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.static(path.resolve(__dirname, 'public')));

// 100% Standalone & Offline Math Solve Endpoint (Zero external AI APIs)
app.post('/api/solve', async (req: Request, res: Response) => {
  try {
    const { problemText } = req.body;

    if (!problemText || !problemText.trim()) {
      res.status(400).json({ error: 'Please provide problem text to solve.' });
      return;
    }

    const result = solveMathLocally(problemText);

    if (result) {
      res.json({
        success: true,
        data: result,
      });
    } else {
      res.json({
        success: false,
        error: 'Could not match known algebraic pattern. Try typing the equation directly.',
      });
    }
  } catch (error: any) {
    console.error('Local Solve Error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to compute solution.',
    });
  }
});

// Endpoint: Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    engine: 'Standalone Offline Engine',
    externalApi: false,
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
    console.log(`DeltaSolve standalone server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
