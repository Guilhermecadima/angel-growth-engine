import { Router } from 'express';
import { adminClient, assertArtistAccess, isSupabaseConfigured } from '../lib/supabase.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { authorizationUrl, createOAuthState, exchangeCode, getChannel, readOAuthState, storeCredentials, syncYouTube, youtubeReady } from '../services/youtubeOAuth.js';
import { spotifyReady, spotifyTrack } from '../services/spotify.js';

export const api = Router();
const mockMode = () => process.env.MOCK_MODE !== 'false';

api.get('/health', (_req, res) => res.json({ ok: true, mockMode: mockMode(), youtubeReady: youtubeReady(), spotifyReady: spotifyReady(), aiReady: Boolean(process.env.AI_API_KEY), supabaseReady: isSupabaseConfigured() }));

api.get('/youtube/auth-url', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const artistId = String(req.query.artistId ?? '');
    if (!artistId) return res.status(400).json({ error: 'artistId is required' });
    await assertArtistAccess(req.db!, artistId);
    const state = createOAuthState(artistId, req.user!.id);
    return res.json({ url: authorizationUrl(state) });
  } catch (error) { next(error); }
});

api.get('/youtube/oauth/callback', async (req, res) => {
  const clientUrl = (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173').split(',')[0].trim();
  try {
    if (req.query.error) throw new Error(String(req.query.error));
    const code = String(req.query.code ?? ''); const state = String(req.query.state ?? '');
    if (!code || !state) throw new Error('Missing OAuth callback parameters');
    const context = readOAuthState(state);
    const token = await exchangeCode(code);
    const channel = await getChannel(token.access_token);
    const admin = adminClient();
    const { data: member } = await admin.from('artist_members').select('id').eq('artist_id', context.artistId).eq('user_id', context.userId).maybeSingle();
    if (!member) throw new Error('Artist access denied');
    const { data: account, error } = await admin.from('platform_accounts').upsert({ artist_id: context.artistId, platform: 'youtube', external_account_id: channel.id, display_name: channel.snippet?.title ?? 'YouTube', handle: channel.snippet?.customUrl ?? null, avatar_url: channel.snippet?.thumbnails?.high?.url ?? null, account_url: channel.id ? `https://youtube.com/channel/${channel.id}` : null, is_connected: true, connected_at: new Date().toISOString(), metadata: { source: 'youtube-oauth' } }, { onConflict: 'artist_id,platform' }).select().single();
    if (error) throw error;
    await storeCredentials(admin, account.id, token);
    return res.redirect(`${clientUrl}/#/youtube?connected=1`);
  } catch (error) {
    const message = encodeURIComponent(error instanceof Error ? error.message : 'OAuth failed');
    return res.redirect(`${clientUrl}/#/youtube?oauth_error=${message}`);
  }
});

api.post('/youtube/sync/:artistId', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const artistId = String(req.params.artistId);
    await assertArtistAccess(req.db!, artistId);
    if (mockMode() || !youtubeReady()) {
      const { data: run, error } = await req.db!.from('sync_runs').insert({ artist_id: artistId, source: 'youtube', sync_type: 'manual', status: 'completed', rows_processed: 90, completed_at: new Date().toISOString(), metadata: { source: 'mock' } }).select().single();
      if (error) throw error;
      return res.json({ rowsProcessed: run.rows_processed, mode: 'mock' });
    }
    const admin = adminClient();
    const { data: account, error } = await admin.from('platform_accounts').select('*').eq('artist_id', artistId).eq('platform', 'youtube').maybeSingle();
    if (error || !account) return res.status(409).json({ error: 'Connect YouTube before syncing' });
    const { data: run, error: runError } = await admin.from('sync_runs').insert({ artist_id: artistId, source: 'youtube', sync_type: 'manual', status: 'running' }).select().single();
    if (runError) throw runError;
    try {
      const rowsProcessed = await syncYouTube(admin, artistId, account);
      await admin.from('sync_runs').update({ status: 'completed', rows_processed: rowsProcessed, completed_at: new Date().toISOString() }).eq('id', run.id);
      return res.json({ rowsProcessed, mode: 'real' });
    } catch (error) {
      await admin.from('sync_runs').update({ status: 'failed', error_message: error instanceof Error ? error.message : 'Unknown sync error', completed_at: new Date().toISOString() }).eq('id', run.id);
      throw error;
    }
  } catch (error) { next(error); }
});

api.get('/spotify/tracks/:trackId', requireAuth, async (req, res, next) => {
  try { return res.json(await spotifyTrack(String(req.params.trackId))); }
  catch (error) { next(error); }
});

api.post('/ai/analyse', requireAuth, async (req, res, next) => {
  const question = String(req.body?.question ?? '').trim();
  if (!question) return res.status(400).json({ error: 'question is required' });
  const fallback = `Com base nos dados atuais, transforma a pergunta “${question.slice(0, 120)}” numa experiência mensurável: escolhe uma ação, mantém um único CTA e compara o resultado ao fim de 48 horas.`;
  if (!process.env.AI_API_KEY) return res.json({ answer: fallback, source: 'rules' });
  try {
    const endpoint = process.env.AI_API_URL ?? 'https://api.openai.com/v1/responses';
    const response = await fetch(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${process.env.AI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: process.env.AI_MODEL ?? 'gpt-5-mini', input: [{ role: 'system', content: 'You are a concise music growth manager. Only use the supplied metrics. Reply in European Portuguese with specific next actions.' }, { role: 'user', content: JSON.stringify(req.body) }] }) });
    const body: any = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error?.message ?? `AI provider error ${response.status}`);
    const answer = body.output_text ?? body.output?.flatMap((item: any) => item.content ?? []).find((item: any) => item.type === 'output_text')?.text ?? fallback;
    return res.json({ answer, source: 'ai' });
  } catch (error) { next(error); }
});
