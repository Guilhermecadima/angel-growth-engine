import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

const dataBase = 'https://www.googleapis.com/youtube/v3';
const analyticsBase = 'https://youtubeanalytics.googleapis.com/v2/reports';
const scopes = ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/yt-analytics.readonly'];

type OAuthState = { artistId: string; userId: string; exp: number; nonce: string };
type StoredCredential = { platform_account_id: string; access_token: string; refresh_token: string | null; token_type: string | null; scopes: string[] | null; expires_at: string | null; metadata: Record<string, unknown> };

const base64url = (value: string) => Buffer.from(value).toString('base64url');
const stateSecret = () => process.env.OAUTH_STATE_SECRET || process.env.YOUTUBE_CLIENT_SECRET || '';

export function youtubeReady() {
  return Boolean(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET && process.env.YOUTUBE_REDIRECT_URI && stateSecret());
}

export function createOAuthState(artistId: string, userId: string) {
  if (!stateSecret()) throw new Error('OAuth state secret is missing');
  const payload: OAuthState = { artistId, userId, exp: Date.now() + 10 * 60_000, nonce: crypto.randomBytes(12).toString('hex') };
  const encoded = base64url(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', stateSecret()).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function readOAuthState(value: string): OAuthState {
  const [encoded, signature] = value.split('.');
  if (!encoded || !signature) throw new Error('Invalid OAuth state');
  const expected = crypto.createHmac('sha256', stateSecret()).update(encoded).digest('base64url');
  const a = Buffer.from(signature); const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error('Invalid OAuth state');
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as OAuthState;
  if (!payload.artistId || !payload.userId || payload.exp < Date.now()) throw new Error('OAuth state expired');
  return payload;
}

export function authorizationUrl(state: string) {
  if (!youtubeReady()) throw new Error('YouTube OAuth credentials are not configured yet');
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', process.env.YOUTUBE_CLIENT_ID!);
  url.searchParams.set('redirect_uri', process.env.YOUTUBE_REDIRECT_URI!);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('scope', scopes.join(' '));
  url.searchParams.set('state', state);
  return url.toString();
}

async function googleRequest<T>(url: URL | string, accessToken: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { Authorization: `Bearer ${accessToken}`, ...(init?.headers ?? {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message ?? `YouTube API error ${response.status}`);
  return body as T;
}

export async function exchangeCode(code: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: process.env.YOUTUBE_CLIENT_ID!, client_secret: process.env.YOUTUBE_CLIENT_SECRET!, redirect_uri: process.env.YOUTUBE_REDIRECT_URI!, grant_type: 'authorization_code' }) });
  const data: any = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw new Error(data.error_description ?? data.error ?? 'YouTube token exchange failed');
  return data as { access_token: string; refresh_token?: string; expires_in: number; token_type: string; scope: string };
}

async function refreshAccessToken(refreshToken: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ refresh_token: refreshToken, client_id: process.env.YOUTUBE_CLIENT_ID!, client_secret: process.env.YOUTUBE_CLIENT_SECRET!, grant_type: 'refresh_token' }) });
  const data: any = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw new Error(data.error_description ?? data.error ?? 'YouTube token refresh failed');
  return data as { access_token: string; expires_in: number; token_type: string; scope?: string };
}

export async function getChannel(accessToken: string) {
  const url = new URL(`${dataBase}/channels`); url.searchParams.set('part', 'snippet,statistics,contentDetails'); url.searchParams.set('mine', 'true');
  const data = await googleRequest<any>(url, accessToken); const channel = data.items?.[0];
  if (!channel) throw new Error('No YouTube channel found for this account');
  return channel;
}

export async function storeCredentials(admin: SupabaseClient, platformAccountId: string, token: { access_token: string; refresh_token?: string; expires_in: number; token_type: string; scope?: string }) {
  const { error } = await admin.rpc('store_oauth_credentials', { p_platform_account_id: platformAccountId, p_access_token: token.access_token, p_refresh_token: token.refresh_token ?? null, p_token_type: token.token_type, p_scopes: token.scope?.split(' ') ?? scopes, p_expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(), p_metadata: { provider: 'google' } });
  if (error) throw new Error(`Could not persist OAuth credentials: ${error.message}`);
}

async function credentials(admin: SupabaseClient, platformAccountId: string): Promise<StoredCredential> {
  const { data, error } = await admin.rpc('get_oauth_credentials', { p_platform_account_id: platformAccountId });
  if (error || !data?.[0]) throw new Error('YouTube credentials not found; reconnect the account');
  let saved = data[0] as StoredCredential;
  if (saved.expires_at && new Date(saved.expires_at).getTime() < Date.now() + 60_000) {
    if (!saved.refresh_token) throw new Error('YouTube session expired; reconnect the account');
    const fresh = await refreshAccessToken(saved.refresh_token);
    await storeCredentials(admin, platformAccountId, { ...fresh, refresh_token: saved.refresh_token, scope: fresh.scope ?? saved.scopes?.join(' ') });
    saved = { ...saved, access_token: fresh.access_token, expires_at: new Date(Date.now() + fresh.expires_in * 1000).toISOString() };
  }
  return saved;
}

const date = (daysAgo = 0) => { const value = new Date(); value.setUTCDate(value.getUTCDate() - daysAgo); return value.toISOString().slice(0, 10); };

async function analytics(accessToken: string, startDate: string, endDate: string, dimensions = 'day') {
  const url = new URL(analyticsBase); url.searchParams.set('ids', 'channel==MINE'); url.searchParams.set('startDate', startDate); url.searchParams.set('endDate', endDate); url.searchParams.set('dimensions', dimensions); url.searchParams.set('sort', dimensions === 'day' ? 'day' : '-views'); url.searchParams.set('metrics', 'views,estimatedMinutesWatched,averageViewDuration,likes,comments,shares,subscribersGained,subscribersLost');
  if (dimensions === 'video') url.searchParams.set('maxResults', '25');
  return googleRequest<any>(url, accessToken);
}

async function latestVideos(accessToken: string, uploadsPlaylistId: string) {
  const url = new URL(`${dataBase}/playlistItems`); url.searchParams.set('part', 'snippet,contentDetails'); url.searchParams.set('playlistId', uploadsPlaylistId); url.searchParams.set('maxResults', '25');
  const data = await googleRequest<any>(url, accessToken);
  return data.items ?? [];
}

export async function syncYouTube(admin: SupabaseClient, artistId: string, account: { id: string; external_account_id: string | null; metadata?: Record<string, any> }) {
  const saved = await credentials(admin, account.id);
  const channel = await getChannel(saved.access_token);
  const uploads = channel.contentDetails?.relatedPlaylists?.uploads;
  const items = uploads ? await latestVideos(saved.access_token, uploads) : [];
  const videoRows = items.map((item: any) => ({ artist_id: artistId, youtube_video_id: item.contentDetails?.videoId, title: item.snippet?.title ?? 'Untitled video', description: item.snippet?.description ?? null, published_at: item.contentDetails?.videoPublishedAt ?? item.snippet?.publishedAt ?? null, thumbnail_url: item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.medium?.url ?? null, youtube_url: item.contentDetails?.videoId ? `https://youtube.com/watch?v=${item.contentDetails.videoId}` : null, metadata: { source: 'youtube-data-api' } })).filter((row: any) => row.youtube_video_id);
  if (videoRows.length) { const { error } = await admin.from('videos').upsert(videoRows, { onConflict: 'youtube_video_id' }); if (error) throw error; }
  const { data: videos, error: videoError } = await admin.from('videos').select('id,youtube_video_id').eq('artist_id', artistId); if (videoError) throw videoError;
  const videoMap = new Map((videos ?? []).map((row: any) => [row.youtube_video_id, row.id]));
  const daily = await analytics(saved.access_token, date(89), date());
  const dailyRows = (daily.rows ?? []).map((row: any[]) => ({ artist_id: artistId, platform_account_id: account.id, metric_date: row[0], scope_key: 'channel', views: Number(row[1] ?? 0), watch_time_minutes: Number(row[2] ?? 0), average_view_duration_seconds: Number(row[3] ?? 0), likes: Number(row[4] ?? 0), comments: Number(row[5] ?? 0), shares: Number(row[6] ?? 0), subscribers_gained: Number(row[7] ?? 0), subscribers_lost: Number(row[8] ?? 0), impressions: 0, impression_ctr: null, unique_viewers: null, metadata: { source: 'youtube-analytics-api' } }));
  const byVideo = await analytics(saved.access_token, date(27), date(), 'video');
  const aggregateRows = (byVideo.rows ?? []).map((row: any[]) => ({ artist_id: artistId, platform_account_id: account.id, video_id: videoMap.get(row[0]) ?? null, metric_date: date(), scope_key: `video:${videoMap.get(row[0]) ?? row[0]}`, views: Number(row[1] ?? 0), watch_time_minutes: Number(row[2] ?? 0), average_view_duration_seconds: Number(row[3] ?? 0), likes: Number(row[4] ?? 0), comments: Number(row[5] ?? 0), shares: Number(row[6] ?? 0), subscribers_gained: Number(row[7] ?? 0), subscribers_lost: Number(row[8] ?? 0), impressions: 0, impression_ctr: null, unique_viewers: null, metadata: { source: 'youtube-analytics-api', period: '28d' } }));
  const metricRows = [...dailyRows, ...aggregateRows];
  if (metricRows.length) { const { error } = await admin.from('youtube_daily_metrics').upsert(metricRows, { onConflict: 'platform_account_id,metric_date,scope_key' }); if (error) throw error; }
  await admin.from('platform_accounts').update({ display_name: channel.snippet?.title, handle: channel.snippet?.customUrl ?? null, avatar_url: channel.snippet?.thumbnails?.high?.url ?? null, external_account_id: channel.id, is_connected: true, last_synced_at: new Date().toISOString(), metadata: { source: 'youtube', uploads_playlist_id: uploads } }).eq('id', account.id);
  return metricRows.length + videoRows.length;
}
