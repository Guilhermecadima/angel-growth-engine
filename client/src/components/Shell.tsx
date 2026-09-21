import React from 'react';
import { BarChart3, BrainCircuit, ChevronDown, Database, LayoutDashboard, Lightbulb, LogOut, Menu, Music2, Sparkles, Video, X } from 'lucide-react';
import type { Artist, Page, Period } from '../types';

const nav: Array<{ id: Page; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard }, { id: 'spotify', label: 'Spotify', icon: Music2 },
  { id: 'youtube', label: 'YouTube', icon: Video }, { id: 'recommendations', label: 'Recomendações', icon: Sparkles },
  { id: 'ideas', label: 'Content ideas', icon: Lightbulb }, { id: 'manager', label: 'AI Music Manager', icon: BrainCircuit },
  { id: 'data', label: 'Dados e histórico', icon: Database },
];

const titles: Record<Page, [string, string]> = {
  overview: ['Visão geral', 'A fotografia completa da tua música.'], spotify: ['Spotify', 'Streams, ouvintes, saves e músicas.'],
  youtube: ['YouTube', 'Views, watch time, subs e vídeos.'], recommendations: ['Recomendações', 'Prioridades claras, suportadas pelos teus dados.'],
  ideas: ['Content ideas', 'Ideias ligadas ao que está a funcionar.'], manager: ['AI Music Manager', 'Pergunta, compara e decide com contexto.'],
  data: ['Dados e histórico', 'Fontes, importações e sincronizações.'],
};

export function Shell({ page, setPage, artists, artist, setArtist, period, setPeriod, isDemo, onLogout, children }: { page: Page; setPage: (page: Page) => void; artists: Artist[]; artist: Artist; setArtist: (artist: Artist) => void; period: Period; setPeriod: (period: Period) => void; isDemo: boolean; onLogout: () => void; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const go = (target: Page) => { setPage(target); setOpen(false); };
  return <div className="app-shell">
    <aside className={open ? 'sidebar open' : 'sidebar'}>
      <div className="sidebar-head"><div className="brand"><span className="brand-mark"><BarChart3/></span><span><b>EngageFlow</b><small>Music Intelligence</small></span></div><button className="mobile-close" onClick={() => setOpen(false)} aria-label="Fechar menu"><X/></button></div>
      <nav>{nav.map(item => <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => go(item.id)}><item.icon size={19}/><span>{item.label}</span>{item.id === 'recommendations' && <i className="nav-count">5</i>}</button>)}</nav>
      <div className="sidebar-foot"><div className="data-mode"><span className={isDemo ? 'status-dot demo' : 'status-dot live'}/><span><b>{isDemo ? 'Dados de demonstração' : 'Dados reais'}</b><small>{isDemo ? 'Tudo funciona sem APIs externas' : 'Supabase sincronizado'}</small></span></div><button onClick={onLogout}><LogOut size={18}/>Terminar sessão</button></div>
    </aside>
    {open && <button className="backdrop" aria-label="Fechar menu" onClick={() => setOpen(false)}/>} 
    <main className="workspace">
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu/></button>
        <div className="page-heading"><span>{titles[page][1]}</span><h1>{titles[page][0]}</h1></div>
        <div className="top-controls">
          <label className="select-control"><span>Artista</span><select value={artist.id} onChange={event => setArtist(artists.find(item => item.id === event.target.value) ?? artist)}>{artists.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown/></label>
          <div className="period-switch" aria-label="Período">{([7, 28, 90] as Period[]).map(value => <button key={value} className={period === value ? 'active' : ''} onClick={() => setPeriod(value)}>{value}d</button>)}</div>
        </div>
      </header>
      <div className="page-content">{children}</div>
    </main>
  </div>;
}

export function Onboarding({ onCreate, busy }: { onCreate: (name: string) => void; busy: boolean }) {
  const [name, setName] = React.useState('');
  return <main className="onboarding"><div className="onboarding-card"><span className="brand-mark"><Music2/></span><span className="overline">Primeira configuração</span><h1>Como se chama o projeto artístico?</h1><p>Vamos criar a tua área. O YouTube e Spotify podem ser ligados depois; até lá terás dados realistas de demonstração.</p><form onSubmit={event => { event.preventDefault(); onCreate(name); }}><label>Nome do artista ou projeto<input value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: Angel Fortes" minLength={2} required autoFocus/></label><button className="button primary large" disabled={busy}>{busy ? 'A criar…' : 'Criar workspace'}</button></form></div></main>;
}
