import type { NextFunction, Request, Response } from 'express';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { authenticate } from '../lib/supabase.js';

export type AuthRequest = Request & { user?: User; db?: SupabaseClient; accessToken?: string };

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const { user, client } = await authenticate(token);
    req.user = user; req.db = client; req.accessToken = token;
    next();
  } catch { return res.status(401).json({ error: 'Invalid or expired session' }); }
}
