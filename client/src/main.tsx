import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  Activity, BarChart3, Bot, ChevronRight, CircleCheck, Eye, Gauge, Link2,
  MessageCircle, Music2, Play, RefreshCw, ShieldCheck, Sparkles, Trash2,
  TrendingUp, Users, Zap
} from 'lucide-react';
import { api, type Campaign, type GrowthResult, type SimulationResult } from './lib/api';
import './styles.css';

type Tab = 'overview' | 'growth' | 'simulator';

const fmt = (n:number) => new Intl.NumberFormat('pt-PT').format(n);

function metricSummary(c: Campaign) {
  const m = c.snapshots.at(-1)?.metrics ?? {};
  if (c.platform === 'youtube') return `${Number(m.views ?? 0).toLocaleString()} views · ${Number(m.likes ?? 0).toLocaleString()} likes`;
  return `Popularidade ${m.popularity ?? 0}/100`;
}

function MiniChart({data}:{data:SimulationResult['timeline']}) {
  const width = 720, height = 220, pad = 18;
  const max = Math.max(...data.map(d=>d.gross), 1);
  const points = (key:'gross'|'validated') => data.map((d,i)=>{
    const x = pad + (i/(data.length-1))*(width-pad*2);
    const y = height-pad-(d[key]/max)*(height-pad*2);
    return `${x},${y}`;
  }).join(' ');
  return <div className="chart-wrap">
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolução da simulação">
      {[0.25,0.5,0.75].map(v=><line key={v} x1={pad} x2={width-pad} y1={height*v} y2={height*v} className="gridline"/>)}
      <polyline points={points('gross')} className="line gross" fill="none"/>
      <polyline points={points('validated')} className="line validated" fill="none"/>
    </svg>
    <div className="chart-legend"><span><i className="legend-dot raw"/>Eventos brutos</span><span><i className="legend-dot valid"/>Métrica validada</span></div>
  </div>
}

function App(){
  const [tab,setTab]=React.useState<Tab>('overview');
  const [campaigns,setCampaigns]=React.useState<Campaign[]>([]);
  const [mock,setMock]=React.useState<boolean|null>(null);
  const [busy,setBusy]=React.useState('');
  const [error,setError]=React.useState('');
  const [comment,setComment]=React.useState('');
  const [suggestions,setSuggestions]=React.useState<string[]>([]);

  const [monitor,setMonitor]=React.useState({name:'Angel Fortes — Vídeo',platform:'youtube',resourceId:'',goal:'views'});
  const [growth,setGrowth]=React.useState({
    platform:'instagram', title:'Novo corte / transformação', url:'', goal:'mais alcance e marcações', audience:'clientes de barbearia 18–40 anos'
  });
  const [growthResult,setGrowthResult]=React.useState<GrowthResult|null>(null);
  const [sim,setSim]=React.useState({platform:'youtube',targetViews:10000,durationMinutes:90,likeRate:3.4,commentRate:0.4,followRate:0.2});
  const [simulation,setSimulation]=React.useState<SimulationResult|null>(null);
  const [simProgress,setSimProgress]=React.useState(0);

  const load=React.useCallback(async()=>{
    try { const [h,c]=await Promise.all([api.health(),api.campaigns()]); setMock(h.mockMode); setCampaigns(c); setError(''); }
    catch(e:any){ setError(e.message); }
  },[]);
  React.useEffect(()=>{void load()},[load]);

  React.useEffect(()=>{
    if(!simulation) return;
    setSimProgress(0);
    const id=setInterval(()=>setSimProgress(p=>{
      const next=Math.min(100,p+4);
      if(next>=100) clearInterval(id);
      return next;
    }),45);
    return ()=>clearInterval(id);
  },[simulation]);

  async function createMonitor(e:React.FormEvent){
    e.preventDefault(); setBusy('monitor'); setError('');
    try { await api.createCampaign(monitor); setMonitor({...monitor,resourceId:''}); await load(); }
    catch(e:any){setError(e.message)} finally{setBusy('')}
  }
  async function snap(id:string){ setBusy(id); try{await api.snapshot(id);await load()}catch(e:any){setError(e.message)}finally{setBusy('')} }
  async function del(id:string){ setBusy(id); try{await api.remove(id);await load()}catch(e:any){setError(e.message)}finally{setBusy('')} }
  async function suggest(){ try{const r=await api.replies(comment);setSuggestions(r.suggestions)}catch(e:any){setError(e.message)} }
  async function analyse(e:React.FormEvent){
    e.preventDefault(); setBusy('growth'); setError('');
    try{ setGrowthResult(await api.analyseGrowth(growth)); }
    catch(e:any){setError(e.message)} finally{setBusy('')}
  }
  async function runSimulation(e:React.FormEvent){
    e.preventDefault(); setBusy('sim'); setError('');
    try{ setSimulation(await api.simulate(sim)); }
    catch(e:any){setError(e.message)} finally{setBusy('')}
  }

  const totalSnapshots=campaigns.reduce((a,c)=>a+c.snapshots.length,0);
  const livePoint=simulation ? simulation.timeline[Math.min(simulation.timeline.length-1, Math.floor(simProgress/100*(simulation.timeline.length-1)))] : null;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Zap size={19}/></div><div><strong>ANGEL</strong><span>Growth Engine</span></div></div>
      <nav>
        <button className={tab==='overview'?'active':''} onClick={()=>setTab('overview')}><BarChart3/>Visão geral</button>
        <button className={tab==='growth'?'active':''} onClick={()=>setTab('growth')}><TrendingUp/>Growth Automation</button>
        <button className={tab==='simulator'?'active':''} onClick={()=>setTab('simulator')}><Bot/>Viewbot Simulator</button>
      </nav>
      <div className="side-note"><ShieldCheck/><div><b>Modo seguro</b><span>Sem tráfego artificial para plataformas externas.</span></div></div>
    </aside>

    <div className="content-shell">
      <header className="topbar">
        <div><span className="eyebrow">ANGEL FORTES · DEMO</span><h1>{tab==='overview'?'Performance Center':tab==='growth'?'Growth Automation':'Viewbot Simulator'}</h1></div>
        <div className="status"><span className={mock?'dot mock':'dot'}></span>{mock===null?'A ligar…':mock?'APIs em modo demo':'APIs reais ligadas'}</div>
      </header>

      {error && <div className="error">{error}</div>}

      {tab==='overview' && <>
        <section className="hero card">
          <div className="hero-copy"><span className="hero-badge"><Sparkles size={14}/> Growth OS</span><h2>Transforma conteúdo em crescimento mensurável.</h2><p>Analisa, distribui, acompanha métricas e prepara respostas — mantendo o controlo humano.</p><div className="hero-actions"><button onClick={()=>setTab('growth')}>Analisar conteúdo <ChevronRight size={16}/></button><button className="secondary" onClick={()=>setTab('simulator')}>Abrir simulador</button></div></div>
          <div className="hero-score"><div className="score-ring"><strong>84</strong><span>Growth score</span></div><small>Demo do potencial do conteúdo</small></div>
        </section>

        <section className="kpi-grid">
          <div className="kpi card"><div className="kpi-icon"><Activity/></div><div><span>Conteúdos monitorizados</span><strong>{campaigns.length}</strong><small>YouTube + Spotify</small></div></div>
          <div className="kpi card"><div className="kpi-icon"><RefreshCw/></div><div><span>Snapshots</span><strong>{totalSnapshots}</strong><small>Histórico de métricas</small></div></div>
          <div className="kpi card"><div className="kpi-icon"><MessageCircle/></div><div><span>Respostas assistidas</span><strong>{suggestions.length}</strong><small>Revisão humana</small></div></div>
          <div className="kpi card"><div className="kpi-icon"><ShieldCheck/></div><div><span>Risco de conta</span><strong>0</strong><small>Sem métricas fabricadas</small></div></div>
        </section>

        <section className="two-col">
          <div className="card panel">
            <div className="section-title"><Activity/><div><h3>Monitorizar conteúdo real</h3><p>Guarda snapshots para veres a evolução.</p></div></div>
            <form onSubmit={createMonitor} className="form compact">
              <label>Nome<input value={monitor.name} onChange={e=>setMonitor({...monitor,name:e.target.value})} required/></label>
              <div className="form-row"><label>Plataforma<select value={monitor.platform} onChange={e=>setMonitor({...monitor,platform:e.target.value,goal:e.target.value==='youtube'?'views':'saves'})}><option value="youtube">YouTube</option><option value="spotify">Spotify</option></select></label><label>ID do conteúdo<input value={monitor.resourceId} onChange={e=>setMonitor({...monitor,resourceId:e.target.value})} placeholder="ID do vídeo/faixa" required/></label></div>
              <button disabled={busy==='monitor'}>{busy==='monitor'?'A adicionar…':'Adicionar ao monitor'}</button>
            </form>
          </div>

          <div className="card panel">
            <div className="section-title"><MessageCircle/><div><h3>Assistente de engagement</h3><p>Respostas sugeridas, nunca publicadas sem revisão.</p></div></div>
            <textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder="Ex.: Onde fica a barbearia? 🔥"/>
            <button className="secondary full" onClick={suggest} disabled={!comment.trim()}>Gerar respostas</button>
            <div className="suggestions">{suggestions.map((s,i)=><div key={i}>{s}</div>)}</div>
          </div>
        </section>

        <section className="card panel monitor-list">
          <div className="section-title"><BarChart3/><div><h3>Conteúdos monitorizados</h3><p>Dados reais quando ligares as APIs; dados mock enquanto estás a demonstrar.</p></div><button className="iconbtn" onClick={load}><RefreshCw size={15}/></button></div>
          {campaigns.length===0?<div className="empty">Ainda não tens conteúdos. Em modo demo podes introduzir qualquer ID.</div>:<div className="campaign-list">{campaigns.map(c=><article key={c.id} className="campaign">
            c.platform==='youtube'?<Play/>:<Music2/>
            <div className="campaign-main"><div className="campaign-head"><h4>{c.name}</h4><span>{c.goal}</span></div><p>{c.resourceId}</p><strong>{c.snapshots.length?metricSummary(c):'Sem snapshot'}</strong><small>{c.snapshots.length?`Último: ${new Date(c.snapshots.at(-1)!.at).toLocaleString('pt-PT')}`:'Recolhe a primeira métrica'}</small></div>
            <div className="actions"><button className="secondary" disabled={busy===c.id} onClick={()=>snap(c.id)}><Activity size={14}/> Snapshot</button><button className="danger" disabled={busy===c.id} onClick={()=>del(c.id)}><Trash2 size={14}/></button></div>
          </article>)}</div>}
        </section>
      </>}

      {tab==='growth' && <>
        <section className="page-intro card">
          <div><span className="hero-badge"><TrendingUp size={14}/> REAL GROWTH</span><h2>Uma peça de conteúdo. Um plano de distribuição.</h2><p>O motor transforma o objetivo numa checklist de crescimento, hooks, caption e métricas a acompanhar.</p></div>
          <div className="trust"><CircleCheck/> Sem views ou streams artificiais</div>
        </section>

        <section className="two-col growth-layout">
          <div className="card panel">
            <div className="section-title"><Sparkles/><div><h3>Analisar publicação</h3><p>Preenche o briefing como se estivesses com o Angel.</p></div></div>
            <form onSubmit={analyse} className="form">
              <div className="form-row"><label>Plataforma<select value={growth.platform} onChange={e=>setGrowth({...growth,platform:e.target.value})}><option value="instagram">Instagram</option><option value="tiktok">TikTok</option><option value="youtube">YouTube</option><option value="spotify">Spotify</option></select></label><label>Objetivo<input value={growth.goal} onChange={e=>setGrowth({...growth,goal:e.target.value})}/></label></div>
              <label>Título / tema<input value={growth.title} onChange={e=>setGrowth({...growth,title:e.target.value})}/></label>
              <label>Público<input value={growth.audience} onChange={e=>setGrowth({...growth,audience:e.target.value})}/></label>
              <label>URL (opcional)<div className="input-icon"><Link2 size={15}/><input value={growth.url} onChange={e=>setGrowth({...growth,url:e.target.value})} placeholder="https://..."/></div></label>
              <button disabled={busy==='growth'}>{busy==='growth'?'A analisar…':'Gerar plano de crescimento'}</button>
            </form>
          </div>

          <div className="card panel analysis-result">
            {!growthResult?<div className="result-placeholder"><Gauge/><h3>Growth Engine</h3><p>Faz uma análise para gerar o plano que vais mostrar ao cliente.</p></div>:<>
              <div className="score-head"><div><span>Opportunity score</span><strong>{growthResult.score}<small>/100</small></strong></div><div className="score-bar"><i style={{width:`${growthResult.score}%`}}/></div></div>
              <h3 className="result-title">Plano recomendado</h3>
              <ol className="plan-list">{growthResult.recommendations.map((x,i)=><li key={i}><span>{i+1}</span>{x}</li>)}</ol>
            </>}
          </div>
        </section>

        {growthResult && <section className="result-grid">
          <div className="card panel"><div className="section-title"><Zap/><div><h3>Próximas 24 horas</h3><p>Ações concretas.</p></div></div><div className="check-list">{growthResult.next24h.map((x,i)=><div key={i}><CircleCheck/>{x}</div>)}</div></div>
          <div className="card panel"><div className="section-title"><Play/><div><h3>Hooks para testar</h3><p>Variações criativas, não tráfego falso.</p></div></div><div className="hook-list">{growthResult.hooks.map((x,i)=><div key={i}><span>0{i+1}</span>{x}</div>)}</div></div>
          <div className="card panel"><div className="section-title"><BarChart3/><div><h3>Métricas a vigiar</h3><p>O que decide a próxima ação.</p></div></div><div className="metric-tags">{growthResult.metricsToWatch.map(x=><span key={x}>{x}</span>)}</div></div>
          <div className="card panel"><div className="section-title"><MessageCircle/><div><h3>Caption sugerida</h3><p>Pronta para ajustar e publicar.</p></div></div><div className="caption-box">{growthResult.caption}</div></div>
        </section>}
      </>}

      {tab==='simulator' && <>
        <section className="sim-warning"><ShieldCheck/><div><strong>SIMULADOR LOCAL — DEMONSTRAÇÃO</strong><span>Não abre vídeos, não reproduz músicas e não envia views, streams, likes, comentários ou seguidores para qualquer plataforma.</span></div></section>
        <section className="two-col sim-layout">
          <div className="card panel">
            <div className="section-title"><Bot/><div><h3>Configurar simulação</h3><p>Modela números sintéticos para demonstração e testes do dashboard.</p></div></div>
            <form onSubmit={runSimulation} className="form">
              <label>Plataforma<select value={sim.platform} onChange={e=>setSim({...sim,platform:e.target.value})}><option value="youtube">YouTube</option><option value="spotify">Spotify</option><option value="instagram">Instagram</option><option value="tiktok">TikTok</option></select></label>
              <div className="form-row"><label>Eventos simulados<input type="number" min="100" max="1000000" value={sim.targetViews} onChange={e=>setSim({...sim,targetViews:Number(e.target.value)})}/></label><label>Duração (min)<input type="number" min="1" max="1440" value={sim.durationMinutes} onChange={e=>setSim({...sim,durationMinutes:Number(e.target.value)})}/></label></div>
              <div className="form-row thirds"><label>Like %<input type="number" step="0.1" min="0" max="25" value={sim.likeRate} onChange={e=>setSim({...sim,likeRate:Number(e.target.value)})}/></label><label>Coment. %<input type="number" step="0.1" min="0" max="10" value={sim.commentRate} onChange={e=>setSim({...sim,commentRate:Number(e.target.value)})}/></label><label>Follow %<input type="number" step="0.1" min="0" max="10" value={sim.followRate} onChange={e=>setSim({...sim,followRate:Number(e.target.value)})}/></label></div>
              <button disabled={busy==='sim'}><Play size={15}/>{busy==='sim'?'A calcular…':'Executar simulação'}</button>
            </form>
            <div className="safe-box"><ShieldCheck/><p><b>Isolamento por design.</b> Este módulo só calcula e apresenta dados fictícios. Não existe campo para URL do conteúdo nem código que faça requests de reprodução.</p></div>
          </div>

          <div className="card panel simulator-screen">
            {!simulation?<div className="result-placeholder"><Bot/><h3>Pronto para simular</h3><p>Configura os valores e inicia uma execução.</p></div>:<>
              <div className="sim-head"><div><span>Execução sintética</span><strong>{simProgress<100?'RUNNING':'COMPLETE'}</strong></div><span>{simProgress}%</span></div>
              <div className="progress"><i style={{width:`${simProgress}%`}}/></div>
              <div className="live-number"><span>Eventos processados</span><strong>{fmt(livePoint?.gross ?? 0)}</strong><small>de {fmt(simulation.requested)} pedidos no modelo</small></div>
              <div className="terminal"><div><span>engine</span> synthetic-v1</div><div><span>platform</span> {simulation.platform}</div><div><span>output</span> local-dashboard-only</div><div><span>network</span> disabled for simulated traffic</div></div>
            </>}
          </div>
        </section>

        {simulation && <>
          <section className="kpi-grid sim-kpis">
            <div className="kpi card"><div className="kpi-icon"><Eye/></div><div><span>Eventos brutos</span><strong>{fmt(simulation.requested)}</strong><small>100% sintéticos</small></div></div>
            <div className="kpi card"><div className="kpi-icon"><CircleCheck/></div><div><span>Validados pelo modelo</span><strong>{fmt(simulation.validated)}</strong><small>{simulation.rejectionRate}% rejeitados</small></div></div>
            <div className="kpi card"><div className="kpi-icon"><MessageCircle/></div><div><span>Engagement simulado</span><strong>{fmt(simulation.likes + simulation.comments)}</strong><small>{fmt(simulation.likes)} likes · {fmt(simulation.comments)} comentários</small></div></div>
            <div className="kpi card"><div className="kpi-icon"><Users/></div><div><span>Follows simulados</span><strong>{fmt(simulation.follows)}</strong><small>Retenção média {simulation.avgRetention}%</small></div></div>
          </section>
          <section className="card panel chart-card"><div className="section-title"><Activity/><div><h3>Curva da execução</h3><p>Comparação entre eventos brutos e números que o modelo marcou como validados.</p></div></div><MiniChart data={simulation.timeline}/></section>
          <section className="explain-grid">
            <div className="card panel"><h3>O que esta demo prova</h3><p>Que conseguimos construir filas, métricas, dashboards, estados de execução e análise de resultados sem tocar numa plataforma externa.</p></div>
            <div className="card panel"><h3>O que ela não faz</h3><p>Não compra nem fabrica audiência real, não contorna deteção e não promete views/streams em contas de terceiros.</p></div>
          </section>
        </>}
      </>}

      <footer>Angel Growth Engine · demo técnica · crescimento, analytics e simulação isolada</footer>
    </div>
  </div>
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
