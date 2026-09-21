import express from 'express';
import cors from 'cors';
import { api } from './routes/api.js';

export function createApp() {
  const app = express();
  const configuredOrigins = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
  const allowedOrigins = configuredOrigins.split(',').map(value => value.trim());
  if (process.env.VERCEL_URL) allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
  app.disable('x-powered-by');
  app.use(cors({ origin(origin, callback) { if (!origin || allowedOrigins.includes(origin)) callback(null, true); else callback(new Error('Origin not allowed')); }, credentials: false, methods: ['GET', 'POST', 'OPTIONS'] }));
  app.use(express.json({ limit: '250kb' }));
  app.use((_req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin'); res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()'); next(); });
  app.use('/api', api);
  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error(err);
    const message = err?.message ?? 'Internal error';
    res.status(message === 'Origin not allowed' ? 403 : 500).json({ error: message });
  });
  return app;
}
