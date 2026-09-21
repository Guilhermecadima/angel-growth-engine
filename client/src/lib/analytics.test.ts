import { describe, expect, it } from 'vitest';
import { parseSpotifyCsv } from './csv';
import { buildMockWorkspace } from '../data/mock';
import { spotifySummary, youtubeSummary } from './analytics';
import { generateRuleInsights, managerReply } from './recommendations';

const artist = { id: 'artist-1', name: 'Test Artist', slug: 'test', image_url: null, spotify_artist_id: null, youtube_channel_id: null, created_by: 'user-1' };

describe('analytics adapters', () => {
  it('parses Spotify for Artists CSV with Portuguese headers', () => {
    const rows = parseSpotifyCsv('Data;Streams;Ouvintes;Saves;Faixa\n2026-09-20;1200;800;90;Mar Aberto');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ streams: 1200, listeners: 800, saves: 90, track_name: 'Mar Aberto' });
  });

  it('rejects malformed CSV rows', () => {
    expect(() => parseSpotifyCsv('date,streams\nnot-a-date,100')).toThrow('Data inválida');
  });

  it('produces realistic mock summaries and comparisons', () => {
    const data = buildMockWorkspace(artist);
    const spotify = spotifySummary(data.spotifyMetrics, 28);
    const youtube = youtubeSummary(data.youtubeMetrics, 28);
    expect(spotify.metrics.streams).toBeGreaterThan(1000);
    expect(spotify.metrics.listeners).toBeGreaterThan(0);
    expect(youtube.metrics.views).toBeGreaterThan(1000);
    expect(youtube.metrics.engagement).toBeGreaterThan(0);
  });

  it('generates rules and a manager fallback without external AI', () => {
    const data = buildMockWorkspace(artist);
    const insights = generateRuleInsights(data.spotifyMetrics, data.youtubeMetrics, 28);
    expect(insights.some(item => item.platform === 'cross-platform')).toBe(true);
    expect(insights.every(item => item.recommended_action.length > 20)).toBe(true);
    expect(managerReply('O que faço no YouTube?', data.spotifyMetrics, data.youtubeMetrics)).toContain('YouTube');
  });
});
