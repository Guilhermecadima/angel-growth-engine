import React from 'react';
import { ArrowRight, Bot, Check, CheckCircle2, Clock3, FileUp, Lightbulb, Link2, LoaderCircle, Music2, RefreshCw, Send, Sparkles, Upload, Video } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type { Artist, ContentIdea, ManagerMessage, Period, RecommendationStatus, WorkspaceData } from '../types';
import { compact, dailySeries, inPeriod, number, spotifySummary, sum, youtubeSummary } from '../lib/analytics';
import { EmptyState, ErrorState, Kpi, LineChart } from '../components/Ui';
import { generateRuleInsights, managerReply } from '../lib/recommendations';
import { addManagerMessage, importSpotifyCsv, loadManagerThread, saveIdea, saveRecommendations, setIdeaStatus, setRecommendationStatus } from '../lib/data';
import { parseSpotifyCsv } from '../lib/csv';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';

type CommonProps = { artist: Artist; data: WorkspaceData; period: Period; refresh: () => Promise<void>; notify: (message: string, tone?: 'success' | 'error') => void };

function Panel({ title, subtitle, action, children, className = '' }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <section className={`panel ${className}`}><div className="panel-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>{children}</section>;
}

function SourceBadge({ demo }: { demo: boolean }) { return <span className={`source-badge ${demo ? 'demo' : 'live'}`}><i/>{demo ? 'Mock realista' : 'Dados reais'}</span>; }

export function OverviewPage({ data, period, ...props }: CommonProps) {
  const spotify = spotifySummary(data.spotifyMetrics, period);
  const youtube = youtubeSummary(data.youtubeMetrics, period);
  const series = dailySeries(data.spotifyMetrics, data.youtubeMetrics, period);
  const insights = generateRuleInsights(data.spotifyMetrics, data.youtubeMetrics, period).slice(0, 3);
  return <>
    <div className="page-intro"><div><span className="overline">Performance center</span><h2>O que merece a tua atenção agora.</h2><p>Um resumo das duas plataformas, comparado com o período anterior.</p></div><SourceBadge demo={data.isDemo}/></div>
    <div className="kpi-grid"><Kpi label="Streams Spotify" value={spotify.metrics.streams} change={spotify.changes.streams}/><Kpi label="Ouvintes" value={spotify.metrics.listeners} change={spotify.changes.listeners} tone="green"/><Kpi label="Views YouTube" value={youtube.metrics.views} change={youtube.changes.views} tone="red"/><Kpi label="Watch time" value={`${compact(youtube.metrics.watchTime / 60)}h`} change={youtube.changes.watchTime} tone="blue"/></div>
    <div className="dashboard-grid">
      <Panel title="Evolução diária" subtitle={`Últimos ${period} dias · streams vs. views`} className="wide"><LineChart data={series} series={[{ key: 'spotify', label: 'Spotify streams', color: '#1ed760' }, { key: 'youtube', label: 'YouTube views', color: '#ff4d67' }]}/></Panel>
      <Panel title="Próximas ações" subtitle="Ordenadas por impacto"><div className="next-actions">{insights.map((item, index) => <article key={item.title}><span>{index + 1}</span><div><b>{item.title}</b><p>{item.recommended_action}</p></div></article>)}</div></Panel>
      <Panel title="Spotify" subtitle="Sinais de conversão"><div className="platform-summary"><div><span>Taxa de saves</span><strong>{spotify.metrics.streams ? ((spotify.metrics.saves / spotify.metrics.streams) * 100).toFixed(1) : 0}%</strong></div><div><span>Streams / ouvinte</span><strong>{spotify.metrics.listeners ? (spotify.metrics.streams / spotify.metrics.listeners).toFixed(2) : '0'}</strong></div><div><span>Playlist adds</span><strong>{number(spotify.metrics.playlistAdds)}</strong></div></div></Panel>
      <Panel title="YouTube" subtitle="Qualidade da audiência"><div className="platform-summary"><div><span>CTR média</span><strong>{youtube.metrics.ctr.toFixed(1)}%</strong></div><div><span>Engagement</span><strong>{youtube.metrics.engagement.toFixed(1)}%</strong></div><div><span>Novos subs</span><strong>{number(youtube.metrics.subscribers)}</strong></div></div></Panel>
    </div>
  </>;
}

export function SpotifyPage({ artist, data, period, refresh, notify }: CommonProps) {
  const summary = spotifySummary(data.spotifyMetrics, period);
  const rows = inPeriod(data.spotifyMetrics, period);
  const trackRows = data.tracks.map(track => {
    const metrics = rows.filter(item => item.track_id === track.id);
    const streams = sum(metrics, 'streams');
    const saves = sum(metrics, 'saves');
    return { ...track, streams, listeners: sum(metrics, 'listeners'), saves, saveRate: streams ? saves / streams * 100 : 0 };
  }).sort((a, b) => b.streams - a.streams);
  const [importing, setImporting] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function upload(file?: File) {
    if (!file) return;
    setImporting(true);
    try {
      const parsed = parseSpotifyCsv(await file.text());
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) throw new Error('A sessão expirou. Volta a entrar.');
      const count = await importSpotifyCsv(artist.id, session.session.user.id, file.name, parsed);
      await refresh(); notify(`${count} linhas do Spotify importadas.`);
    } catch (error) { notify(error instanceof Error ? error.message : 'Falha na importação.', 'error'); }
    finally { setImporting(false); if (inputRef.current) inputRef.current.value = ''; }
  }
  return <>
    <div className="page-intro"><div><span className="overline"><Music2/> Spotify for Artists</span><h2>Da audição à lealdade.</h2><p>Analytics oficiais por CSV; catálogo e metadados via Spotify Web API.</p></div><div className="intro-actions"><SourceBadge demo={data.isDemo}/><input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={event => upload(event.target.files?.[0])}/><button className="button primary" onClick={() => inputRef.current?.click()} disabled={importing}>{importing ? <LoaderCircle className="spin"/> : <Upload/>}{importing ? 'A importar…' : 'Importar CSV'}</button></div></div>
    <div className="kpi-grid"><Kpi label="Streams" value={summary.metrics.streams} change={summary.changes.streams} tone="green"/><Kpi label="Listeners" value={summary.metrics.listeners} change={summary.changes.listeners}/><Kpi label="Saves" value={summary.metrics.saves} change={summary.changes.saves} tone="blue"/><Kpi label="Followers" value={summary.metrics.followers} change={summary.changes.followers}/></div>
    <div className="dashboard-grid"><Panel title="Streams e ouvintes" subtitle={`Evolução nos últimos ${period} dias`} className="wide"><LineChart data={rows.filter(item => item.scope_key === 'artist').map(item => ({ date: item.metric_date, streams: item.streams, listeners: item.listeners }))} series={[{ key: 'streams', label: 'Streams', color: '#1ed760' }, { key: 'listeners', label: 'Listeners', color: '#8b5cf6' }]}/></Panel>
      <Panel title="Saúde da audiência" subtitle="Indicadores do período"><div className="score-block"><div className="score-ring green"><strong>{Math.min(99, Math.round(58 + Math.max(0, summary.changes.streams) / 2))}</strong><span>/100</span></div><div><b>Momentum score</b><p>Combina crescimento, saves e repetição de audição.</p></div></div><div className="metric-lines"><span><b>Streams por listener</b><em>{summary.metrics.listeners ? (summary.metrics.streams / summary.metrics.listeners).toFixed(2) : '0'}</em></span><span><b>Save rate</b><em>{summary.metrics.streams ? (summary.metrics.saves / summary.metrics.streams * 100).toFixed(1) : '0'}%</em></span><span><b>Monthly listeners</b><em>{compact(summary.metrics.monthlyListeners)}</em></span></div></Panel>
      <Panel title="Comparação entre músicas" subtitle={`Resultados agregados em ${period} dias`} className="full"><div className="table-wrap"><table><thead><tr><th>Música</th><th>Streams</th><th>Listeners</th><th>Saves</th><th>Save rate</th></tr></thead><tbody>{trackRows.map((track, index) => <tr key={track.id}><td><span className="rank">{index + 1}</span><b>{track.title}</b><small>{track.album_name}</small></td><td>{number(track.streams)}</td><td>{number(track.listeners)}</td><td>{number(track.saves)}</td><td><span className={track.saveRate >= 5 ? 'good' : ''}>{track.saveRate.toFixed(1)}%</span></td></tr>)}</tbody></table>{!trackRows.length && <EmptyState title="Ainda não há músicas" text="Importa um CSV com a coluna da faixa para comparares resultados."/>}</div></Panel>
    </div>
  </>;
}

export function YouTubePage({ artist, data, period, refresh, notify }: CommonProps) {
  const summary = youtubeSummary(data.youtubeMetrics, period);
  const rows = inPeriod(data.youtubeMetrics, period);
  const videoRows = data.videos.map(video => {
    const metrics = rows.filter(item => item.video_id === video.id);
    const views = sum(metrics, 'views');
    const engagements = sum(metrics, 'likes') + sum(metrics, 'comments') + sum(metrics, 'shares');
    return { ...video, views, watchTime: sum(metrics, 'watch_time_minutes'), engagement: views ? engagements / views * 100 : 0, ctr: metrics.length ? metrics.reduce((total, item) => total + Number(item.impression_ctr ?? 0), 0) / metrics.length : 0 };
  }).sort((a, b) => b.views - a.views);
  const [busy, setBusy] = React.useState('');

  async function connect() {
    setBusy('connect');
    try { const result = await api.youtubeAuthUrl(artist.id); window.location.assign(result.url); }
    catch (error) { notify(error instanceof Error ? error.message : 'Não foi possível iniciar o OAuth.', 'error'); }
    finally { setBusy(''); }
  }
  async function sync() {
    setBusy('sync');
    try { const result = await api.syncYouTube(artist.id); await refresh(); notify(`Sincronização ${result.mode === 'mock' ? 'de demonstração' : 'real'} concluída (${result.rowsProcessed} linhas).`); }
    catch (error) { notify(error instanceof Error ? error.message : 'Falha ao sincronizar.', 'error'); }
    finally { setBusy(''); }
  }
  const connected = data.accounts.find(item => item.platform === 'youtube')?.is_connected;
  return <>
    <div className="page-intro"><div><span className="overline"><Video/> YouTube Analytics</span><h2>Descoberta, retenção e comunidade.</h2><p>Dados públicos e privados separados, com OAuth e refresh tokens preparados.</p></div><div className="intro-actions"><SourceBadge demo={data.isDemo}/><button className="button ghost" onClick={sync} disabled={Boolean(busy)}>{busy === 'sync' ? <LoaderCircle className="spin"/> : <RefreshCw/>}Sincronizar</button><button className="button youtube" onClick={connect} disabled={Boolean(busy)}>{busy === 'connect' ? <LoaderCircle className="spin"/> : <Link2/>}{connected ? 'Reconectar' : 'Ligar YouTube'}</button></div></div>
    <div className="kpi-grid"><Kpi label="Views" value={summary.metrics.views} change={summary.changes.views} tone="red"/><Kpi label="Watch time" value={`${compact(summary.metrics.watchTime / 60)}h`} change={summary.changes.watchTime} tone="blue"/><Kpi label="Subscribers" value={summary.metrics.subscribers} change={summary.changes.subscribers}/><Kpi label="Engagement" value={`${summary.metrics.engagement.toFixed(1)}%`} change={summary.changes.engagement}/></div>
    <div className="dashboard-grid"><Panel title="Views e watch time" subtitle={`Evolução nos últimos ${period} dias`} className="wide"><LineChart data={rows.filter(item => item.scope_key === 'channel').map(item => ({ date: item.metric_date, views: item.views, watchTime: Math.round(item.watch_time_minutes / 3) }))} series={[{ key: 'views', label: 'Views', color: '#ff4d67' }, { key: 'watchTime', label: 'Watch time (escala)', color: '#4da3ff' }]}/></Panel>
      <Panel title="Funil de descoberta" subtitle="Médias do período"><div className="funnel"><div style={{ width: '100%' }}><span>Impressões</span><b>{compact(sum(rows.filter(item => item.scope_key === 'channel'), 'impressions'))}</b></div><div style={{ width: '82%' }}><span>CTR</span><b>{summary.metrics.ctr.toFixed(1)}%</b></div><div style={{ width: '66%' }}><span>Views</span><b>{compact(summary.metrics.views)}</b></div><div style={{ width: '50%' }}><span>Engagement</span><b>{summary.metrics.engagement.toFixed(1)}%</b></div></div></Panel>
      <Panel title="Comparação entre vídeos" subtitle={`Resultados agregados em ${period} dias`} className="full"><div className="table-wrap"><table><thead><tr><th>Vídeo</th><th>Views</th><th>Watch time</th><th>CTR</th><th>Engagement</th></tr></thead><tbody>{videoRows.map((video, index) => <tr key={video.id}><td><span className="rank red">{index + 1}</span><b>{video.title}</b><small>{video.published_at ? new Date(video.published_at).toLocaleDateString('pt-PT') : 'Sem data'}</small></td><td>{number(video.views)}</td><td>{compact(video.watchTime / 60)}h</td><td>{video.ctr.toFixed(1)}%</td><td><span className={video.engagement >= 5 ? 'good' : ''}>{video.engagement.toFixed(1)}%</span></td></tr>)}</tbody></table>{!videoRows.length && <EmptyState title="Ainda não há vídeos" text="Liga o YouTube para importar o canal e os seus vídeos."/>}</div></Panel>
    </div>
  </>;
}

export function RecommendationsPage({ artist, data, period, refresh, notify }: CommonProps) {
  const [busy, setBusy] = React.useState('');
  const generated = generateRuleInsights(data.spotifyMetrics, data.youtubeMetrics, period);
  const items = data.recommendations.length ? data.recommendations : generated.map((item, index) => ({ ...item, id: `preview-${index}`, artist_id: artist.id, status: 'new' as const, created_at: new Date().toISOString() }));
  async function generate() { setBusy('generate'); try { await saveRecommendations(artist.id, generated); await refresh(); notify('Novas recomendações guardadas no histórico.'); } catch (error) { notify(error instanceof Error ? error.message : 'Falha ao guardar.', 'error'); } finally { setBusy(''); } }
  async function status(id: string, value: RecommendationStatus) { if (id.startsWith('preview-')) { notify('Gera as recomendações para as guardar primeiro.', 'error'); return; } setBusy(id); try { await setRecommendationStatus(id, value); await refresh(); notify(value === 'completed' ? 'Ação marcada como concluída.' : 'Estado atualizado.'); } catch (error) { notify(error instanceof Error ? error.message : 'Falha ao atualizar.', 'error'); } finally { setBusy(''); } }
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return <><div className="page-intro"><div><span className="overline"><Sparkles/> Motor baseado em regras</span><h2>Prioridades que não dependem de IA.</h2><p>Cada ação inclui evidência, confiança e estado para criar um histórico útil.</p></div><button className="button primary" onClick={generate} disabled={Boolean(busy)}>{busy === 'generate' ? <LoaderCircle className="spin"/> : <RefreshCw/>}Gerar análise atual</button></div>
    <div className="recommendation-list">{[...items].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]).map(item => <article className={`recommendation ${item.status}`} key={item.id}><div className="recommendation-meta"><span className={`priority ${item.priority}`}>{item.priority === 'high' ? 'Alta prioridade' : item.priority === 'critical' ? 'Crítica' : item.priority === 'medium' ? 'Média' : 'Baixa'}</span><span>{item.platform === 'cross-platform' ? 'Spotify ↔ YouTube' : item.platform}</span><span>{Math.round(Number(item.confidence ?? 0) * 100)}% confiança</span></div><h3>{item.title}</h3><p>{item.explanation}</p><div className="action-box"><ArrowRight/><span><small>Próxima ação</small><b>{item.recommended_action}</b></span></div><div className="recommendation-foot"><span className={`status-pill ${item.status}`}>{item.status === 'new' ? 'Nova' : item.status === 'accepted' ? 'Aceite' : item.status === 'completed' ? 'Concluída' : 'Ignorada'}</span><div>{item.status === 'new' && <button className="button ghost" onClick={() => status(item.id, 'accepted')} disabled={busy === item.id}><Check/>Aceitar</button>}{item.status !== 'completed' && <button className="button subtle" onClick={() => status(item.id, 'completed')} disabled={busy === item.id}><CheckCircle2/>Concluir</button>}</div></div></article>)}</div>
  </>;
}

export function IdeasPage({ artist, data, refresh, notify }: CommonProps) {
  const [busy, setBusy] = React.useState('');
  const [formOpen, setFormOpen] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const generated = [
    { platform: 'youtube_short' as const, title: 'O detalhe que mudou a música', content_type: 'Short', hook: 'A música só começou a funcionar quando tirei isto.', concept: 'Mostrar a versão antes/depois de uma decisão de produção.', caption: 'Às vezes, menos é mesmo mais.', call_to_action: 'Ouve a versão final no Spotify.', hashtags: ['#musicproduction', '#novamusica'], reasoning: 'Conteúdo de processo cria curiosidade e conduz para a faixa.' },
    { platform: 'cross-platform' as const, title: 'Dueto com a letra', content_type: 'Reel + Short', hook: 'Completa esta frase antes do refrão entrar.', concept: 'Pausa antes da linha mais memorável e convida a audiência a responder.', caption: 'Quero ver quem acerta 👀', call_to_action: 'Guarda a faixa e envia a resposta.', hashtags: ['#lyrics', '#musicaportuguesa'], reasoning: 'Transforma a letra em participação e aumenta sinais de save.' },
    { platform: 'youtube' as const, title: 'Live session minimalista', content_type: 'Vídeo', hook: 'Uma voz, um instrumento e a música sem filtros.', concept: 'Performance curta num cenário simples com áudio cuidado.', caption: 'A versão mais crua desta música.', call_to_action: 'Comenta qual faixa devia ser a próxima.', hashtags: ['#livesession', '#acoustic'], reasoning: 'Aprofunda ligação e cria matéria-prima para clips.' },
  ];
  async function addGenerated() { setBusy('generate'); try { for (const idea of generated) await saveIdea({ ...idea, artist_id: artist.id, status: 'idea', scheduled_for: null, created_by_ai: false }); await refresh(); notify('3 novas ideias adicionadas.'); } catch (error) { notify(error instanceof Error ? error.message : 'Falha ao criar ideias.', 'error'); } finally { setBusy(''); } }
  async function addCustom(event: React.FormEvent) { event.preventDefault(); setBusy('custom'); try { await saveIdea({ artist_id: artist.id, platform: 'cross-platform', title, content_type: 'Conteúdo', hook: null, concept: null, caption: null, call_to_action: null, hashtags: [], reasoning: 'Ideia adicionada manualmente.', status: 'idea', scheduled_for: null, created_by_ai: false }); setTitle(''); setFormOpen(false); await refresh(); notify('Ideia adicionada.'); } catch (error) { notify(error instanceof Error ? error.message : 'Falha ao adicionar.', 'error'); } finally { setBusy(''); } }
  async function move(idea: ContentIdea, status: ContentIdea['status']) { if (idea.id.startsWith('demo-')) { notify('Cria ideias reais para poderes gerir o estado.', 'error'); return; } setBusy(idea.id); try { await setIdeaStatus(idea.id, status); await refresh(); } catch (error) { notify(error instanceof Error ? error.message : 'Falha ao atualizar.', 'error'); } finally { setBusy(''); } }
  const ideas = data.ideas;
  return <><div className="page-intro"><div><span className="overline"><Lightbulb/> Ideias orientadas por dados</span><h2>Transforma sinais em conteúdo.</h2><p>Do hook à CTA, com uma ponte clara entre YouTube e Spotify.</p></div><div className="intro-actions"><button className="button ghost" onClick={() => setFormOpen(value => !value)}>Adicionar ideia</button><button className="button primary" onClick={addGenerated} disabled={Boolean(busy)}>{busy === 'generate' ? <LoaderCircle className="spin"/> : <Sparkles/>}Gerar 3 ideias</button></div></div>
    {formOpen && <form className="inline-form" onSubmit={addCustom}><label>Título da ideia<input value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex.: Bastidores do novo single" required/></label><button className="button primary" disabled={busy === 'custom'}>Guardar</button></form>}
    <div className="ideas-grid">{ideas.map(idea => <article className="idea-card" key={idea.id}><div className="idea-top"><span className="platform-pill">{idea.platform.replace('_', ' ')}</span><span className={`status-pill ${idea.status}`}>{idea.status}</span></div><h3>{idea.title}</h3>{idea.hook && <blockquote>“{idea.hook}”</blockquote>}<p>{idea.concept}</p>{idea.call_to_action && <div className="idea-cta"><b>CTA</b>{idea.call_to_action}</div>}<div className="tags">{idea.hashtags?.map(tag => <span key={tag}>{tag}</span>)}</div><div className="idea-actions"><button onClick={() => move(idea, 'planned')} disabled={busy === idea.id}><Clock3/>Planear</button><button onClick={() => move(idea, 'published')} disabled={busy === idea.id}><Check/>Publicada</button></div></article>)}{!ideas.length && <EmptyState title="Sem ideias guardadas" text="Gera uma primeira lista com base nas métricas atuais." action={<button className="button primary" onClick={addGenerated}>Gerar ideias</button>}/>}</div>
  </>;
}

export function ManagerPage({ artist, data, notify, user }: CommonProps & { user: User }) {
  const [messages, setMessages] = React.useState<ManagerMessage[]>([]);
  const [threadId, setThreadId] = React.useState('');
  const [question, setQuestion] = React.useState('');
  const [busy, setBusy] = React.useState(true);
  React.useEffect(() => { let active = true; setBusy(true); loadManagerThread(artist.id, user.id).then(result => { if (active) { setThreadId(result.threadId); setMessages(result.messages); } }).catch(error => notify(error.message, 'error')).finally(() => active && setBusy(false)); return () => { active = false; }; }, [artist.id, notify, user.id]);
  async function ask(event: React.FormEvent) {
    event.preventDefault(); if (!question.trim() || !threadId) return;
    const prompt = question.trim(); setQuestion(''); setBusy(true);
    try {
      const userMessage = await addManagerMessage(threadId, 'user', prompt); setMessages(current => [...current, userMessage]);
      let answer = managerReply(prompt, data.spotifyMetrics, data.youtubeMetrics);
      let source: 'rules' | 'ai' = 'rules';
      try { const advanced = await api.advancedAnalysis({ question: prompt, artist: artist.name, summary: { spotify: spotifySummary(data.spotifyMetrics, 28), youtube: youtubeSummary(data.youtubeMetrics, 28) } }); answer = advanced.answer || answer; source = advanced.source; } catch { /* The local rules answer is the production fallback. */ }
      const assistant = await addManagerMessage(threadId, 'assistant', answer, { source }); setMessages(current => [...current, assistant]);
    } catch (error) { notify(error instanceof Error ? error.message : 'Não foi possível responder.', 'error'); }
    finally { setBusy(false); }
  }
  const starters = ['Qual é a prioridade desta semana?', 'Que música devo promover?', 'Como cruzo YouTube e Spotify?'];
  return <div className="manager-layout"><section className="manager-main"><div className="manager-head"><span className="manager-icon"><Bot/></span><div><h2>AI Music Manager</h2><p><span className="status-dot live"/>Motor de regras ativo · IA avançada opcional</p></div></div><div className="messages">{!messages.length && !busy && <div className="manager-empty"><Sparkles/><h3>Tenho os teus dados em contexto.</h3><p>Pergunta-me o que priorizar, que conteúdo criar ou como comparar resultados.</p><div>{starters.map(item => <button key={item} onClick={() => setQuestion(item)}>{item}</button>)}</div></div>}{messages.map(message => <article className={`message ${message.role}`} key={message.id}><span>{message.role === 'assistant' ? <Bot/> : user.email?.slice(0, 1).toUpperCase()}</span><div><small>{message.role === 'assistant' ? 'Music Manager' : 'Tu'}</small><p>{message.content}</p></div></article>)}{busy && messages.length > 0 && <article className="message assistant"><span><Bot/></span><div><small>Music Manager</small><p className="typing"><i/><i/><i/></p></div></article>}</div><form className="manager-input" onSubmit={ask}><input value={question} onChange={event => setQuestion(event.target.value)} placeholder="Pergunta sobre os teus dados…" disabled={busy}/><button aria-label="Enviar" disabled={busy || !question.trim()}><Send/></button></form></section><aside className="manager-context"><span className="overline">Contexto ativo</span><h3>{artist.name}</h3><div><span>Spotify</span><b>{compact(spotifySummary(data.spotifyMetrics, 28).metrics.streams)} streams</b></div><div><span>YouTube</span><b>{compact(youtubeSummary(data.youtubeMetrics, 28).metrics.views)} views</b></div><div><span>Recomendações</span><b>{data.recommendations.filter(item => item.status === 'new').length} por rever</b></div><p>As respostas por regras funcionam offline. Quando configurares uma API de IA, a mesma conversa passa a usar análises avançadas.</p></aside></div>;
}

export function DataPage({ artist, data, refresh, notify }: CommonProps) {
  const youtube = data.accounts.find(item => item.platform === 'youtube');
  const spotify = data.accounts.find(item => item.platform === 'spotify');
  const [busy, setBusy] = React.useState(false);
  async function syncMock() { setBusy(true); try { await api.syncYouTube(artist.id); await refresh(); notify('Sincronização concluída.'); } catch (error) { notify(error instanceof Error ? error.message : 'Servidor indisponível. Os dashboards continuam a usar o fallback local.', 'error'); } finally { setBusy(false); } }
  const history = [...data.syncRuns.map(item => ({ ...item, kind: 'YouTube sync', at: item.started_at })), ...data.imports.map(item => ({ ...item, kind: 'Spotify CSV', at: item.created_at }))].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return <><div className="page-intro"><div><span className="overline"><FileUp/> Fontes e operações</span><h2>Dados transparentes e recuperáveis.</h2><p>Consulta ligações, sincronizações, imports e falhas sem sair da aplicação.</p></div><button className="button ghost" onClick={syncMock} disabled={busy}>{busy ? <LoaderCircle className="spin"/> : <RefreshCw/>}Testar sincronização</button></div>
    <div className="connections"><article><span className="connection-icon spotify"><Music2/></span><div><h3>Spotify for Artists</h3><p>Analytics por importação CSV oficial.</p><small>{spotify?.last_synced_at ? `Último import: ${new Date(spotify.last_synced_at).toLocaleString('pt-PT')}` : 'Ainda sem importações reais'}</small></div><span className={`connection-state ${spotify?.is_connected ? 'connected' : ''}`}>{spotify?.is_connected ? 'Com dados' : 'Mock ativo'}</span></article><article><span className="connection-icon youtube"><Video/></span><div><h3>YouTube</h3><p>Data API + Analytics API via OAuth 2.0.</p><small>{youtube?.last_synced_at ? `Última sync: ${new Date(youtube.last_synced_at).toLocaleString('pt-PT')}` : 'A aguardar credenciais OAuth'}</small></div><span className={`connection-state ${youtube?.is_connected ? 'connected' : ''}`}>{youtube?.is_connected ? 'Ligado' : 'Mock ativo'}</span></article></div>
    <Panel title="Histórico de operações" subtitle="Imports e sincronizações mais recentes"><div className="history-list">{history.map(item => <article key={`${item.kind}-${item.id}`}><span className={`history-icon ${item.status}`}>{item.status === 'completed' ? <Check/> : item.status === 'failed' ? '!' : <RefreshCw/>}</span><div><b>{item.kind}</b><small>{item.at ? new Date(item.at).toLocaleString('pt-PT') : 'Sem data'}</small></div><span>{item.rows_processed} linhas</span><em className={`status-pill ${item.status}`}>{item.status}</em></article>)}{!history.length && <EmptyState title="Ainda sem operações reais" text="As futuras sincronizações e importações aparecerão aqui com o respetivo estado."/>}</div></Panel>
    <Panel title="Arquitetura de dados" subtitle="O que está pronto"><div className="readiness-grid"><span><CheckCircle2/><b>Supabase + RLS</b><small>Dados isolados por artista e utilizador.</small></span><span><CheckCircle2/><b>Adapters independentes</b><small>Mock, CSV e APIs reais partilham o mesmo modelo.</small></span><span><CheckCircle2/><b>Fallback automático</b><small>A interface não depende de credenciais externas.</small></span><span><CheckCircle2/><b>OAuth seguro</b><small>Refresh tokens preparados no schema privado.</small></span></div></Panel>
  </>;
}
