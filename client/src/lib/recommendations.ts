import { spotifySummary, youtubeSummary } from './analytics';
import type { Period, RuleInsight, SpotifyMetric, YouTubeMetric } from '../types';

export function generateRuleInsights(spotify: SpotifyMetric[], youtube: YouTubeMetric[], period: Period = 28): RuleInsight[] {
  const s = spotifySummary(spotify, period);
  const y = youtubeSummary(youtube, period);
  const output: RuleInsight[] = [];

  if (s.changes.streams > 12) output.push({ platform: 'spotify', source: 'rules', category: 'growth', priority: 'high', title: 'O Spotify está a acelerar', explanation: `Os streams cresceram ${Math.round(s.changes.streams)}% face ao período anterior.`, recommended_action: 'Repete o formato e a origem de tráfego das publicações dos últimos 7 dias enquanto o sinal está forte.', evidence: { stream_growth: s.changes.streams }, confidence: 0.91 });
  else output.push({ platform: 'spotify', source: 'rules', category: 'growth', priority: s.changes.streams < -8 ? 'high' : 'medium', title: s.changes.streams < -8 ? 'Recuperar descoberta no Spotify' : 'Criar novo pico de descoberta', explanation: `A evolução de streams está em ${Math.round(s.changes.streams)}% no período.`, recommended_action: 'Publica três clips com hooks diferentes para a faixa com melhor taxa de saves e mede cada origem com um smart-link.', evidence: { stream_growth: s.changes.streams }, confidence: 0.86 });

  const saveRate = s.metrics.streams ? (s.metrics.saves / s.metrics.streams) * 100 : 0;
  output.push({ platform: 'spotify', source: 'rules', category: 'conversion', priority: saveRate < 4 ? 'high' : 'medium', title: saveRate < 4 ? 'Transformar ouvintes em saves' : 'A taxa de saves está saudável', explanation: `${saveRate.toFixed(1)}% dos streams resultaram em saves.`, recommended_action: saveRate < 4 ? 'Faz um CTA específico para guardar a música nos conteúdos onde explicas a história da faixa.' : 'Mantém CTAs naturais e replica o contexto das faixas com maior taxa de saves.', evidence: { save_rate: saveRate }, confidence: 0.89 });

  output.push({ platform: 'youtube', source: 'rules', category: 'retention', priority: y.metrics.ctr < 5 ? 'high' : 'medium', title: y.metrics.ctr < 5 ? 'Thumbnail e título precisam de teste' : 'CTR do YouTube acima da linha de alerta', explanation: `A CTR média é ${y.metrics.ctr.toFixed(1)}%.`, recommended_action: y.metrics.ctr < 5 ? 'Testa uma nova combinação de thumbnail e título durante 72 horas, alterando apenas uma variável.' : 'Usa a linguagem visual do vídeo com maior CTR no próximo lançamento.', evidence: { ctr: y.metrics.ctr }, confidence: 0.88 });

  output.push({ platform: 'youtube', source: 'rules', category: 'engagement', priority: y.metrics.engagement < 5 ? 'high' : 'medium', title: 'Converter visualizações em conversa', explanation: `O engagement por view está em ${y.metrics.engagement.toFixed(1)}%.`, recommended_action: 'Fixa uma pergunta concreta ligada à letra ou ao processo criativo e responde às primeiras reações.', evidence: { engagement_rate: y.metrics.engagement }, confidence: 0.84 });

  output.push({ platform: 'cross-platform', source: 'rules', category: 'cross-promotion', priority: 'high', title: 'Criar uma ponte YouTube → Spotify', explanation: 'O conteúdo mais forte pode reduzir a distância entre descoberta visual e audição completa.', recommended_action: 'Fecha o próximo Short com o momento musical mais forte e um único CTA para a faixa no Spotify; compara cliques e saves nas 48 horas seguintes.', evidence: { spotify_streams: s.metrics.streams, youtube_views: y.metrics.views }, confidence: 0.93 });
  return output;
}

export function managerReply(question: string, spotify: SpotifyMetric[], youtube: YouTubeMetric[]) {
  const s = spotifySummary(spotify, 28);
  const y = youtubeSummary(youtube, 28);
  const lower = question.toLowerCase();
  if (lower.includes('spotify') || lower.includes('stream') || lower.includes('save')) return `Nos últimos 28 dias tens ${Math.round(s.metrics.streams).toLocaleString('pt-PT')} streams e uma variação de ${s.changes.streams.toFixed(1)}%. A ação mais útil agora é promover a faixa com melhor relação saves/streams em três clips diferentes, mantendo o mesmo smart-link para conseguires atribuir o resultado.`;
  if (lower.includes('youtube') || lower.includes('vídeo') || lower.includes('video') || lower.includes('view')) return `O YouTube somou ${Math.round(y.metrics.views).toLocaleString('pt-PT')} views no período, com CTR média de ${y.metrics.ctr.toFixed(1)}% e engagement de ${y.metrics.engagement.toFixed(1)}%. Eu priorizaria o vídeo com melhor retenção para criar dois Shorts e testaria uma nova thumbnail apenas se a CTR estiver abaixo de 5%.`;
  if (lower.includes('próxim') || lower.includes('prioridade') || lower.includes('fazer')) return `A prioridade número um é a ponte YouTube → Spotify: publica um Short com o hook da faixa, um CTA único e link rastreável. Em segundo lugar, responde às conversas com maior intenção. Depois compara streams, saves e views ao fim de 48 horas antes de mudares a estratégia.`;
  return `O sinal geral é de ${s.changes.streams >= 0 ? 'crescimento' : 'abrandamento'} no Spotify (${s.changes.streams.toFixed(1)}%) e ${y.changes.views >= 0 ? 'crescimento' : 'abrandamento'} no YouTube (${y.changes.views.toFixed(1)}%). Posso ajudar-te a decidir a próxima ação, comparar músicas ou vídeos, ou transformar estes dados num plano de conteúdo.`;
}
