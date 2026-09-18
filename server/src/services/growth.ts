export type GrowthPlatform = 'youtube' | 'spotify' | 'instagram' | 'tiktok';

type AnalyseInput = {
  platform: GrowthPlatform;
  title?: string;
  goal?: string;
  audience?: string;
  url?: string;
};

const platformPlaybooks: Record<GrowthPlatform, string[]> = {
  youtube: [
    'Testar um título mais orientado para benefício/curiosidade sem clickbait enganador.',
    'Criar 2–3 Shorts derivados do conteúdo principal e apontar para o vídeo completo.',
    'Responder aos primeiros comentários com perguntas que prolonguem a conversa.',
    'Rever thumbnail e CTR após recolher dados suficientes; alterar só uma variável de cada vez.'
  ],
  spotify: [
    'Criar um smart-link único para a faixa e medir a origem dos cliques.',
    'Recortar momentos fortes da música para Reels/Shorts/TikTok com CTA para ouvir a faixa completa.',
    'Preparar conteúdo de bastidores, letra ou história da faixa para aumentar saves e partilhas.',
    'Acompanhar popularity, saves/clicks disponíveis e comparar cada origem de tráfego.'
  ],
  instagram: [
    'Reutilizar o conteúdo em Reel, Story e carrossel com ganchos diferentes.',
    'Responder cedo a comentários e DMs relevantes para aumentar conversas reais.',
    'Testar uma CTA única por publicação: comentário, partilha, save ou visita ao perfil.',
    'Reaproveitar os melhores criativos em campanhas pagas oficiais se o orgânico responder bem.'
  ],
  tiktok: [
    'Abrir com o momento mais forte nos primeiros segundos.',
    'Testar 3 hooks sobre o mesmo conteúdo mantendo a mensagem central.',
    'Transformar comentários reais em ideias para vídeos-resposta.',
    'Publicar variações genuínas e comparar retenção, partilhas e visitas ao perfil.'
  ]
};

export function analyseGrowth(input: AnalyseInput) {
  const title = (input.title || 'Conteúdo').trim();
  const audience = (input.audience || 'público principal').trim();
  const goal = (input.goal || 'alcance').trim();
  const seed = [...title].reduce((a, c) => a + c.charCodeAt(0), 0) + input.platform.length * 17;
  const score = 62 + (seed % 27);

  const hooks = input.platform === 'spotify'
    ? [
        `A parte desta faixa que ninguém espera…`,
        `Se só ouvires 15 segundos, ouve estes.`,
        `O momento que mudou completamente esta música.`
      ]
    : [
        `Isto é o que quase ninguém te mostra sobre ${title.toLowerCase()}.`,
        `Antes de passares à frente, vê isto.`,
        `O resultado fica muito melhor quando mudas só esta parte.`
      ];

  return {
    score,
    platform: input.platform,
    goal,
    audience,
    headline: `${score}/100 de potencial inicial para ${goal}`,
    recommendations: platformPlaybooks[input.platform],
    next24h: [
      'Publicar a versão principal com tracking do link.',
      'Distribuir 1 adaptação curta para outro formato autorizado.',
      'Rever comentários e responder manualmente às conversas com maior intenção.',
      'Guardar um snapshot das métricas para comparar a evolução.'
    ],
    hooks,
    caption: `Novo conteúdo: ${title}. Feito para ${audience}. Diz-me o que achaste e partilha com alguém a quem isto possa interessar.`,
    metricsToWatch: input.platform === 'youtube'
      ? ['CTR', 'retenção média', 'views validadas', 'comentários por 1.000 views']
      : input.platform === 'spotify'
      ? ['cliques no smart-link', 'saves', 'popularidade', 'origem do tráfego']
      : ['retenção', 'partilhas', 'saves', 'visitas ao perfil']
  };
}

export function runSyntheticSimulation(input: any) {
  const requested = Math.max(100, Math.min(1_000_000, Number(input.targetViews) || 10000));
  const durationMinutes = Math.max(1, Math.min(1440, Number(input.durationMinutes) || 60));
  const likeRate = Math.max(0, Math.min(25, Number(input.likeRate) || 3.2));
  const commentRate = Math.max(0, Math.min(10, Number(input.commentRate) || 0.35));
  const followRate = Math.max(0, Math.min(10, Number(input.followRate) || 0.18));

  // Synthetic-only model: no traffic is sent anywhere. Rejection exists to demonstrate
  // how a dashboard could distinguish raw events from validated metrics.
  const rejectionRate = Math.min(0.42, 0.06 + requested / 3_000_000 + Math.max(0, 60 - durationMinutes) / 800);
  const rejected = Math.round(requested * rejectionRate);
  const validated = requested - rejected;
  const likes = Math.round(validated * (likeRate / 100));
  const comments = Math.round(validated * (commentRate / 100));
  const follows = Math.round(validated * (followRate / 100));
  const avgRetention = Math.round((46 + ((requested + durationMinutes) % 31)) * 10) / 10;

  const points = 12;
  const timeline = Array.from({ length: points + 1 }, (_, i) => {
    const progress = i / points;
    const eased = 1 - Math.pow(1 - progress, 1.55);
    const gross = Math.round(requested * eased);
    const accepted = Math.round(validated * eased);
    return { minute: Math.round(durationMinutes * progress), gross, validated: accepted };
  });

  return {
    synthetic: true,
    warning: 'SIMULAÇÃO LOCAL: não envia views, streams, likes, comentários ou seguidores para qualquer plataforma.',
    platform: String(input.platform || 'youtube'),
    requested,
    durationMinutes,
    rejected,
    validated,
    likes,
    comments,
    follows,
    avgRetention,
    rejectionRate: Math.round(rejectionRate * 1000) / 10,
    timeline
  };
}
