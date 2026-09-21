import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { buildMockWorkspace } from '../data/mock';
import type { Artist, ContentIdea, ManagerMessage, Recommendation, RecommendationStatus, WorkspaceData } from '../types';
import type { SpotifyCsvRow } from './csv';

const throwIf = (error: { message: string } | null) => { if (error) throw new Error(error.message); };

export async function loadArtists(): Promise<Artist[]> {
  const { data, error } = await supabase.from('artists').select('*').order('created_at');
  throwIf(error);
  return (data ?? []) as Artist[];
}

export async function createArtist(user: User, name: string): Promise<Artist> {
  const base = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'artista';
  const { data, error } = await supabase.from('artists').insert({ name: name.trim(), slug: `${base}-${Date.now().toString(36)}`, created_by: user.id }).select().single();
  throwIf(error);
  return data as Artist;
}

export async function loadWorkspace(artist: Artist): Promise<WorkspaceData> {
  const [accounts, spotify, youtube, tracks, videos, recommendations, ideas, syncRuns, imports] = await Promise.all([
    supabase.from('platform_accounts').select('*').eq('artist_id', artist.id),
    supabase.from('spotify_daily_metrics').select('*').eq('artist_id', artist.id).order('metric_date'),
    supabase.from('youtube_daily_metrics').select('*').eq('artist_id', artist.id).order('metric_date'),
    supabase.from('tracks').select('*').eq('artist_id', artist.id).order('release_date', { ascending: false }),
    supabase.from('videos').select('*').eq('artist_id', artist.id).order('published_at', { ascending: false }),
    supabase.from('recommendations').select('*').eq('artist_id', artist.id).order('created_at', { ascending: false }),
    supabase.from('content_ideas').select('*').eq('artist_id', artist.id).order('created_at', { ascending: false }),
    supabase.from('sync_runs').select('*').eq('artist_id', artist.id).order('started_at', { ascending: false }).limit(20),
    supabase.from('spotify_imports').select('*').eq('artist_id', artist.id).order('created_at', { ascending: false }).limit(20),
  ]);
  [accounts, spotify, youtube, tracks, videos, recommendations, ideas, syncRuns, imports].forEach(result => throwIf(result.error));
  const hasMetrics = Boolean(spotify.data?.length || youtube.data?.length);
  if (!hasMetrics) {
    const mock = buildMockWorkspace(artist);
    return {
      ...mock,
      accounts: accounts.data?.length ? accounts.data as WorkspaceData['accounts'] : mock.accounts,
      recommendations: (recommendations.data ?? []) as Recommendation[],
      ideas: ideas.data?.length ? ideas.data as ContentIdea[] : mock.ideas,
      syncRuns: (syncRuns.data ?? []) as WorkspaceData['syncRuns'],
      imports: (imports.data ?? []) as WorkspaceData['imports'],
    };
  }
  return {
    accounts: (accounts.data ?? []) as WorkspaceData['accounts'], spotifyMetrics: (spotify.data ?? []) as WorkspaceData['spotifyMetrics'],
    youtubeMetrics: (youtube.data ?? []) as WorkspaceData['youtubeMetrics'], tracks: (tracks.data ?? []) as WorkspaceData['tracks'],
    videos: (videos.data ?? []) as WorkspaceData['videos'], recommendations: (recommendations.data ?? []) as Recommendation[],
    ideas: (ideas.data ?? []) as ContentIdea[], syncRuns: (syncRuns.data ?? []) as WorkspaceData['syncRuns'],
    imports: (imports.data ?? []) as WorkspaceData['imports'], isDemo: false,
  };
}

export async function saveRecommendations(artistId: string, insights: Array<Omit<Recommendation, 'id' | 'artist_id' | 'created_at' | 'updated_at' | 'status'>>) {
  const { error } = await supabase.from('recommendations').insert(insights.map(item => ({ ...item, artist_id: artistId, status: 'new' })));
  throwIf(error);
}

export async function setRecommendationStatus(id: string, status: RecommendationStatus) {
  const { error } = await supabase.from('recommendations').update({ status }).eq('id', id);
  throwIf(error);
}

export async function saveIdea(idea: Omit<ContentIdea, 'id' | 'created_at'>) {
  const { error } = await supabase.from('content_ideas').insert(idea);
  throwIf(error);
}

export async function setIdeaStatus(id: string, status: ContentIdea['status']) {
  const { error } = await supabase.from('content_ideas').update({ status }).eq('id', id);
  throwIf(error);
}

export async function importSpotifyCsv(artistId: string, userId: string, fileName: string, rows: SpotifyCsvRow[]) {
  const { data: importRow, error: importError } = await supabase.from('spotify_imports').insert({ artist_id: artistId, imported_by: userId, file_name: fileName, status: 'processing', rows_processed: 0 }).select().single();
  throwIf(importError);
  try {
    const { data: account, error: accountError } = await supabase.from('platform_accounts').upsert({ artist_id: artistId, platform: 'spotify', display_name: 'Spotify for Artists', is_connected: true, connected_at: new Date().toISOString(), last_synced_at: new Date().toISOString(), metadata: { source: 'csv' } }, { onConflict: 'artist_id,platform' }).select().single();
    throwIf(accountError);
    const trackMap = new Map<string, string>();
    for (const row of rows.filter(item => item.track_name)) {
      const key = row.track_name!.trim().toLowerCase();
      if (trackMap.has(key)) continue;
      const externalId = `csv:${artistId}:${key.replace(/[^a-z0-9]+/g, '-').slice(0, 80)}`;
      const { data: track, error } = await supabase.from('tracks').upsert({ artist_id: artistId, spotify_track_id: externalId, title: row.track_name!.trim(), metadata: { source: 'csv' } }, { onConflict: 'spotify_track_id' }).select().single();
      throwIf(error);
      trackMap.set(key, track.id);
    }
    const payload = rows.map(row => {
      const trackId = row.track_name ? trackMap.get(row.track_name.trim().toLowerCase()) ?? null : null;
      return { artist_id: artistId, platform_account_id: account.id, track_id: trackId, metric_date: row.metric_date, scope_key: trackId ? `track:${trackId}` : 'artist', listeners: row.listeners, streams: row.streams, streams_per_listener: row.streams_per_listener, saves: row.saves, playlist_adds: row.playlist_adds, followers: row.followers, monthly_listeners: row.monthly_listeners, metadata: row.metadata };
    });
    for (let start = 0; start < payload.length; start += 500) {
      const { error } = await supabase.from('spotify_daily_metrics').upsert(payload.slice(start, start + 500), { onConflict: 'artist_id,metric_date,scope_key' });
      throwIf(error);
    }
    const { error: doneError } = await supabase.from('spotify_imports').update({ status: 'completed', rows_processed: payload.length, completed_at: new Date().toISOString(), metadata: { columns_detected: Object.keys(rows[0] ?? {}) } }).eq('id', importRow.id);
    throwIf(doneError);
    return payload.length;
  } catch (error) {
    await supabase.from('spotify_imports').update({ status: 'failed', error_message: error instanceof Error ? error.message : 'Erro desconhecido', completed_at: new Date().toISOString() }).eq('id', importRow.id);
    throw error;
  }
}

export async function loadManagerThread(artistId: string, userId: string) {
  let { data: thread, error } = await supabase.from('ai_threads').select('*').eq('artist_id', artistId).eq('user_id', userId).order('updated_at', { ascending: false }).limit(1).maybeSingle();
  throwIf(error);
  if (!thread) {
    const created = await supabase.from('ai_threads').insert({ artist_id: artistId, user_id: userId, title: 'AI Music Manager' }).select().single();
    throwIf(created.error);
    thread = created.data;
  }
  const messages = await supabase.from('ai_messages').select('*').eq('thread_id', thread.id).order('created_at');
  throwIf(messages.error);
  return { threadId: thread.id as string, messages: (messages.data ?? []) as ManagerMessage[] };
}

export async function addManagerMessage(threadId: string, role: ManagerMessage['role'], content: string, context: Record<string, unknown> = {}) {
  const { data, error } = await supabase.from('ai_messages').insert({ thread_id: threadId, role, content, context }).select().single();
  throwIf(error);
  return data as ManagerMessage;
}
