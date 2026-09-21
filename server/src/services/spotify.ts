let tokenCache: { token: string; expiresAt: number } | null = null;

export const spotifyReady = () => Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);

async function token() {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token;
  const id = process.env.SPOTIFY_CLIENT_ID!;
  const secret = process.env.SPOTIFY_CLIENT_SECRET!;
  const body = new URLSearchParams({ grant_type: 'client_credentials' });
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });
  if (!res.ok) throw new Error(`Spotify token ${res.status}`);
  const data: any = await res.json();
  tokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return tokenCache.token;
}

export async function spotifyMetrics(trackId: string) {
  if (process.env.MOCK_MODE === 'true' || !process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    return { name: 'Mock Spotify Track', artist: 'Demo Artist', popularity: 47, durationMs: 201000, source: 'mock' };
  }
  const t = await token();
  const res = await fetch(`https://api.spotify.com/v1/tracks/${encodeURIComponent(trackId)}`, {
    headers: { Authorization: `Bearer ${t}` }
  });
  if (!res.ok) throw new Error(`Spotify API ${res.status}`);
  const data: any = await res.json();
  return {
    name: data.name,
    artist: data.artists?.map((a: any) => a.name).join(', ') ?? '',
    popularity: data.popularity ?? 0,
    durationMs: data.duration_ms ?? 0,
    source: 'spotify-api'
  };
}

export async function spotifyTrack(trackId: string) {
  return spotifyMetrics(trackId);
}

export function spotifyIdeas(metrics: any) {
  const ideas = [
    'Cria clips verticais com o hook da faixa e liga para um smart-link rastreável.',
    'Pede saves/playlist adds apenas a audiência real; evita loops ou streams artificiais.',
    'Compara a popularidade e tráfego antes/depois de cada campanha social.'
  ];
  if ((metrics.popularity ?? 0) < 50) ideas.unshift('Foca descoberta: micro-creators, UGC e conteúdos com o melhor trecho nos primeiros segundos.');
  return ideas;
}
