import { supabase } from './supabase';

const BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api');

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error ?? `Pedido falhou (${response.status}).`);
    return payload as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('O servidor demorou demasiado a responder.');
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export const api = {
  health: () => request<{ ok: boolean; mockMode: boolean; youtubeReady: boolean; spotifyReady: boolean; aiReady: boolean }>('/health'),
  youtubeAuthUrl: (artistId: string) => request<{ url: string }>(`/youtube/auth-url?artistId=${encodeURIComponent(artistId)}`),
  syncYouTube: (artistId: string) => request<{ rowsProcessed: number; mode: 'mock' | 'real' }>(`/youtube/sync/${artistId}`, { method: 'POST' }),
  spotifyTrack: (trackId: string) => request<Record<string, unknown>>(`/spotify/tracks/${encodeURIComponent(trackId)}`),
  advancedAnalysis: (body: unknown) => request<{ answer: string; source: 'rules' | 'ai' }>('/ai/analyse', { method: 'POST', body: JSON.stringify(body) }),
};
