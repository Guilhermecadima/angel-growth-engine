import type { Artist, ContentIdea, SpotifyMetric, Track, Video, WorkspaceData, YouTubeMetric } from '../types';

const iso = (daysAgo: number) => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
};

const wobble = (day: number, amplitude: number) => Math.sin(day * 0.72) * amplitude + Math.cos(day * 0.21) * amplitude * 0.45;

export function buildMockWorkspace(artist: Artist): WorkspaceData {
  const spotifyAccountId = `demo-spotify-${artist.id}`;
  const youtubeAccountId = `demo-youtube-${artist.id}`;
  const tracks: Track[] = [
    { id: 'demo-track-1', artist_id: artist.id, spotify_track_id: 'demo-luzes', title: 'Luzes da Cidade', album_name: 'Depois da Meia-Noite', release_date: iso(120), cover_url: null, spotify_url: null },
    { id: 'demo-track-2', artist_id: artist.id, spotify_track_id: 'demo-sem-voltar', title: 'Sem Voltar Atrás', album_name: 'Depois da Meia-Noite', release_date: iso(80), cover_url: null, spotify_url: null },
    { id: 'demo-track-3', artist_id: artist.id, spotify_track_id: 'demo-mar-aberto', title: 'Mar Aberto', album_name: 'Single', release_date: iso(38), cover_url: null, spotify_url: null },
  ];
  const videos: Video[] = [
    { id: 'demo-video-1', artist_id: artist.id, youtube_video_id: 'demo-live', title: 'Mar Aberto — Live Session', published_at: new Date(Date.now() - 32 * 86400000).toISOString(), thumbnail_url: null, youtube_url: null },
    { id: 'demo-video-2', artist_id: artist.id, youtube_video_id: 'demo-visualizer', title: 'Luzes da Cidade — Visualizer', published_at: new Date(Date.now() - 70 * 86400000).toISOString(), thumbnail_url: null, youtube_url: null },
    { id: 'demo-video-3', artist_id: artist.id, youtube_video_id: 'demo-studio', title: 'Como nasceu Sem Voltar Atrás', published_at: new Date(Date.now() - 18 * 86400000).toISOString(), thumbnail_url: null, youtube_url: null },
  ];

  const spotifyMetrics: SpotifyMetric[] = [];
  const youtubeMetrics: YouTubeMetric[] = [];
  for (let day = 59; day >= 0; day -= 1) {
    const progress = 60 - day;
    const boost = day < 15 ? 1.27 : 1;
    const listeners = Math.max(420, Math.round((560 + progress * 9.2 + wobble(day, 54)) * boost));
    const streams = Math.round(listeners * (1.54 + Math.sin(day / 5) * 0.12));
    spotifyMetrics.push({
      artist_id: artist.id, platform_account_id: spotifyAccountId, metric_date: iso(day), scope_key: 'artist',
      listeners, streams, streams_per_listener: Number((streams / listeners).toFixed(2)), saves: Math.round(streams * 0.061),
      playlist_adds: Math.round(streams * 0.019), followers: 4720 + progress * 14, monthly_listeners: 18120 + progress * 126,
      metadata: { source: 'mock' },
    });
    tracks.forEach((track, index) => {
      const share = [0.47, 0.31, 0.22][index];
      const trackStreams = Math.round(streams * share * (1 + Math.sin((day + index) / 7) * 0.07));
      spotifyMetrics.push({
        artist_id: artist.id, platform_account_id: spotifyAccountId, track_id: track.id, metric_date: iso(day), scope_key: `track:${track.id}`,
        listeners: Math.round(trackStreams / 1.46), streams: trackStreams, streams_per_listener: 1.46,
        saves: Math.round(trackStreams * (0.05 + index * 0.008)), playlist_adds: Math.round(trackStreams * 0.017), followers: null, monthly_listeners: null,
        metadata: { source: 'mock' },
      });
    });

    const views = Math.max(360, Math.round((640 + progress * 11.8 + wobble(day + 3, 105)) * (day < 10 ? 1.38 : 1)));
    youtubeMetrics.push({
      artist_id: artist.id, platform_account_id: youtubeAccountId, metric_date: iso(day), scope_key: 'channel', views,
      likes: Math.round(views * 0.069), comments: Math.round(views * 0.011), shares: Math.round(views * 0.015),
      subscribers_gained: Math.round(views * 0.008), subscribers_lost: Math.max(0, Math.round(views * 0.0008)),
      watch_time_minutes: Math.round(views * 2.74), average_view_duration_seconds: 164 + (day % 18),
      impressions: Math.round(views / 0.071), impression_ctr: Number((6.8 + Math.sin(day / 6) * 0.7).toFixed(2)),
      unique_viewers: Math.round(views * 0.83), metadata: { source: 'mock' },
    });
    videos.forEach((video, index) => {
      const share = [0.51, 0.29, 0.2][index];
      const videoViews = Math.round(views * share * (1 + Math.cos((day + index) / 9) * 0.09));
      youtubeMetrics.push({
        artist_id: artist.id, platform_account_id: youtubeAccountId, video_id: video.id, metric_date: iso(day), scope_key: `video:${video.id}`,
        views: videoViews, likes: Math.round(videoViews * (0.062 + index * 0.01)), comments: Math.round(videoViews * 0.009),
        shares: Math.round(videoViews * 0.013), subscribers_gained: Math.round(videoViews * 0.007), subscribers_lost: 0,
        watch_time_minutes: Math.round(videoViews * (2.5 + index * 0.25)), average_view_duration_seconds: 151 + index * 27,
        impressions: Math.round(videoViews / (0.064 + index * 0.009)), impression_ctr: 6.4 + index * 0.9,
        unique_viewers: Math.round(videoViews * 0.84), metadata: { source: 'mock' },
      });
    });
  }

  const now = new Date().toISOString();
  const ideas: ContentIdea[] = [
    { id: 'demo-idea-1', artist_id: artist.id, platform: 'youtube_short', title: 'O refrão antes da versão final', content_type: 'Short', hook: 'Esta música quase teve um refrão completamente diferente.', concept: 'Começar com a demo original e fazer a transição para a versão publicada.', caption: 'Da primeira demo à versão que conheces.', call_to_action: 'Ouve a faixa completa no Spotify.', hashtags: ['#novamusica', '#bastidores'], reasoning: 'Liga a curiosidade do YouTube à intenção de ouvir no Spotify.', status: 'idea', scheduled_for: null, created_by_ai: false, created_at: now },
    { id: 'demo-idea-2', artist_id: artist.id, platform: 'cross-platform', title: 'A história de Mar Aberto', content_type: 'Série de 3 clips', hook: 'Escrevi esta frase quando ainda não sabia como a música acabava.', concept: 'Três partes: origem da letra, gravação e reação ao lançamento.', caption: 'Parte 1/3 — onde tudo começou.', call_to_action: 'Guarda para veres a próxima parte.', hashtags: ['#songwriting', '#musicaportuguesa'], reasoning: 'Cria continuidade entre plataformas e aumenta saves.', status: 'planned', scheduled_for: null, created_by_ai: false, created_at: now },
  ];

  return {
    accounts: [
      { id: spotifyAccountId, artist_id: artist.id, platform: 'spotify', display_name: artist.name, handle: null, is_connected: false, last_synced_at: null, metadata: { source: 'mock' } },
      { id: youtubeAccountId, artist_id: artist.id, platform: 'youtube', display_name: artist.name, handle: '@artistademo', is_connected: false, last_synced_at: null, metadata: { source: 'mock' } },
    ],
    spotifyMetrics, youtubeMetrics, tracks, videos, recommendations: [], ideas, syncRuns: [], imports: [], isDemo: true,
  };
}
