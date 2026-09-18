import express from 'express';
import cors from 'cors';
import { api } from './routes/api.js';

export function createApp() {
  const app = express();
  app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }));
  app.use(express.json({ limit: '100kb' }));
  app.use('/api', api);
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error(err);
    res.status(500).json({ error: err?.message ?? 'internal error' });
  });
  return app;
}
