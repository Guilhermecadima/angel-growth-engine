const mock = () => ({
  title: 'Mock YouTube Video',
  channelTitle: 'Demo Channel',
  views: 12840,
  likes: 931,
  comments: 118,
  source: 'mock'
});

export async function youtubeMetrics(videoId: string) {
  if (process.env.MOCK_MODE === 'true' || !process.env.YOUTUBE_API_KEY) return mock();
  const key = process.env.YOUTUBE_API_KEY;
  const url = new URL('https://www.googleapis.com/youtube/v3/videos');
  url.searchParams.set('part', 'snippet,statistics');
  url.searchParams.set('id', videoId);
  url.searchParams.set('key', key);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API ${res.status}`);
  const data: any = await res.json();
  const item = data.items?.[0];
  if (!item) throw new Error('YouTube video not found');
  return {
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    views: Number(item.statistics.viewCount ?? 0),
    likes: Number(item.statistics.likeCount ?? 0),
    comments: Number(item.statistics.commentCount ?? 0),
    source: 'youtube-api'
  };
}

export function youtubeIdeas(metrics: any) {
  const engagement = metrics.views ? ((metrics.likes + metrics.comments) / metrics.views) * 100 : 0;
  const ideas = [
    'Recorta 1 momento forte do vídeo para Shorts e aponta o CTA para o vídeo completo.',
    'Faz uma pergunta concreta no comentário fixado para incentivar respostas reais.',
    'Testa uma thumbnail/título alternativo durante 48-72h e compara CTR no YouTube Studio.'
  ];
  if (engagement < 5) ideas.unshift('O engagement relativo está baixo: melhora o primeiro minuto e usa um CTA específico, não genérico.');
  return { engagementRate: Number(engagement.toFixed(2)), ideas };
}
