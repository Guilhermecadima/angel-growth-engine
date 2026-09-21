import React from 'react';
import type { Session } from '@supabase/supabase-js';
import { AuthScreen } from './components/Auth';
import { Onboarding, Shell } from './components/Shell';
import { ErrorState, LoadingState, Toast } from './components/Ui';
import { createArtist, loadArtists, loadWorkspace } from './lib/data';
import { supabase } from './lib/supabase';
import type { Artist, Page, Period, WorkspaceData } from './types';
import { DataPage, IdeasPage, ManagerPage, OverviewPage, RecommendationsPage, SpotifyPage, YouTubePage } from './pages/Pages';

const pages: Page[] = ['overview', 'spotify', 'youtube', 'recommendations', 'ideas', 'manager', 'data'];
const pageFromHash = (): Page => {
  const candidate = window.location.hash.replace('#/', '') as Page;
  return pages.includes(candidate) ? candidate : 'overview';
};

export function App() {
  const [session, setSession] = React.useState<Session | null>(null);
  const [authReady, setAuthReady] = React.useState(false);
  const [artists, setArtists] = React.useState<Artist[]>([]);
  const [artist, setArtist] = React.useState<Artist | null>(null);
  const [workspace, setWorkspace] = React.useState<WorkspaceData | null>(null);
  const [page, setPageState] = React.useState<Page>(pageFromHash);
  const [period, setPeriod] = React.useState<Period>(28);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const [toast, setToast] = React.useState<{ message: string; tone: 'success' | 'error' } | null>(null);

  const notify = React.useCallback((message: string, tone: 'success' | 'error' = 'success') => setToast({ message, tone }), []);
  const setPage = React.useCallback((next: Page) => { setPageState(next); window.history.replaceState(null, '', `#/${next}`); window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setAuthReady(true); });
    const hash = () => setPageState(pageFromHash()); window.addEventListener('hashchange', hash);
    return () => { data.subscription.unsubscribe(); window.removeEventListener('hashchange', hash); };
  }, []);

  React.useEffect(() => {
    if (!session) { setArtists([]); setArtist(null); setWorkspace(null); setLoading(false); return; }
    let active = true; setLoading(true); setError('');
    loadArtists().then(items => { if (!active) return; setArtists(items); setArtist(current => items.find(item => item.id === current?.id) ?? items[0] ?? null); }).catch(cause => setError(cause instanceof Error ? cause.message : 'Falha ao carregar artistas.')).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [session?.user.id]);

  const refresh = React.useCallback(async () => {
    if (!artist) return;
    setError('');
    try { setWorkspace(await loadWorkspace(artist)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao carregar os dados.'); throw cause; }
  }, [artist]);

  React.useEffect(() => {
    if (!artist) { setWorkspace(null); return; }
    let active = true; setLoading(true); setError('');
    loadWorkspace(artist).then(data => active && setWorkspace(data)).catch(cause => active && setError(cause instanceof Error ? cause.message : 'Falha ao carregar os dados.')).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [artist?.id]);

  async function onCreate(name: string) {
    if (!session?.user) return;
    setCreating(true); setError('');
    try { const created = await createArtist(session.user, name); setArtists([created]); setArtist(created); notify('Workspace criado.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível criar o workspace.'); }
    finally { setCreating(false); }
  }

  if (!authReady) return <LoadingState label="A verificar a sessão…"/>;
  if (!session) return <AuthScreen/>;
  if (loading && !artist) return <LoadingState/>;
  if (error && !artist) return <main className="centered"><ErrorState message={error} retry={() => window.location.reload()}/></main>;
  if (!artist) return <><Onboarding onCreate={onCreate} busy={creating}/>{error && <div className="floating-error">{error}</div>}</>;
  if (loading && !workspace) return <LoadingState/>;
  if (!workspace) return <main className="centered"><ErrorState message={error || 'Não foi possível abrir o workspace.'} retry={refresh}/></main>;

  const common = { artist, data: workspace, period, refresh, notify };
  return <>
    <Shell page={page} setPage={setPage} artists={artists} artist={artist} setArtist={setArtist} period={period} setPeriod={setPeriod} isDemo={workspace.isDemo} onLogout={() => supabase.auth.signOut()}>
      {error && <ErrorState message={error} retry={refresh}/>} 
      {page === 'overview' && <OverviewPage {...common}/>} 
      {page === 'spotify' && <SpotifyPage {...common}/>} 
      {page === 'youtube' && <YouTubePage {...common}/>} 
      {page === 'recommendations' && <RecommendationsPage {...common}/>} 
      {page === 'ideas' && <IdeasPage {...common}/>} 
      {page === 'manager' && <ManagerPage {...common} user={session.user}/>} 
      {page === 'data' && <DataPage {...common}/>} 
    </Shell>
    {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)}/>} 
  </>;
}
