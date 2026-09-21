// @vitest-environment jsdom
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Shell } from './Shell';
import { AuthScreen } from './Auth';
import { buildMockWorkspace } from '../data/mock';
import { DataPage, IdeasPage, ManagerPage, OverviewPage, RecommendationsPage, SpotifyPage, YouTubePage } from '../pages/Pages';

const mocks = vi.hoisted(() => ({
  signIn: vi.fn().mockResolvedValue({ error: null }),
  signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
  reset: vi.fn().mockResolvedValue({ error: null }),
  saveRecommendations: vi.fn().mockResolvedValue(undefined),
  saveIdea: vi.fn().mockResolvedValue(undefined),
  setIdeaStatus: vi.fn().mockResolvedValue(undefined),
  setRecommendationStatus: vi.fn().mockResolvedValue(undefined),
  loadThread: vi.fn().mockResolvedValue({ threadId: 'thread-1', messages: [] }),
  addMessage: vi.fn().mockImplementation((_id: string, role: string, content: string) => Promise.resolve({ id: `${role}-${content}`, role, content, created_at: new Date().toISOString() })),
  syncYouTube: vi.fn().mockResolvedValue({ rowsProcessed: 90, mode: 'mock' }),
  advanced: vi.fn().mockResolvedValue({ answer: 'Resposta avançada', source: 'ai' }),
}));

vi.mock('../lib/supabase', () => ({ supabase: { auth: { signInWithPassword: mocks.signIn, signUp: mocks.signUp, resetPasswordForEmail: mocks.reset, getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } }) } } }));
vi.mock('../lib/data', () => ({
  saveRecommendations: mocks.saveRecommendations, saveIdea: mocks.saveIdea, setIdeaStatus: mocks.setIdeaStatus,
  setRecommendationStatus: mocks.setRecommendationStatus, loadManagerThread: mocks.loadThread, addManagerMessage: mocks.addMessage,
  importSpotifyCsv: vi.fn().mockResolvedValue(1),
}));
vi.mock('../lib/api', () => ({ api: { syncYouTube: mocks.syncYouTube, youtubeAuthUrl: vi.fn().mockResolvedValue({ url: 'https://example.com' }), advancedAnalysis: mocks.advanced } }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const artist = { id: 'artist-1', name: 'Test Artist', slug: 'test', image_url: null, spotify_artist_id: null, youtube_channel_id: null, created_by: 'user-1' };
const data = buildMockWorkspace(artist);
const common = { artist, data, period: 28 as const, refresh: vi.fn().mockResolvedValue(undefined), notify: vi.fn() };

describe('authentication and navigation', () => {
  it('submits login and switches authentication modes', async () => {
    render(<AuthScreen/>);
    fireEvent.change(screen.getByPlaceholderText('nome@exemplo.com'), { target: { value: 'user@example.com' } });
    fireEvent.change(document.querySelector('input[type="password"]')!, { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(mocks.signIn).toHaveBeenCalledWith({ email: 'user@example.com', password: 'password123' }));
    fireEvent.click(screen.getByRole('button', { name: 'Criar uma conta' }));
    expect(screen.getByRole('heading', { name: 'Criar conta' })).toBeInTheDocument();
  });

  it('navigates and changes period from the shell', () => {
    const setPage = vi.fn(); const setPeriod = vi.fn(); const logout = vi.fn();
    render(<Shell page="overview" setPage={setPage} artists={[artist]} artist={artist} setArtist={vi.fn()} period={28} setPeriod={setPeriod} isDemo onLogout={logout}><div>Conteúdo</div></Shell>);
    fireEvent.click(screen.getByRole('button', { name: /Spotify/ }));
    fireEvent.click(screen.getByRole('button', { name: '7d' }));
    fireEvent.click(screen.getByRole('button', { name: 'Terminar sessão' }));
    expect(setPage).toHaveBeenCalledWith('spotify'); expect(setPeriod).toHaveBeenCalledWith(7); expect(logout).toHaveBeenCalled();
  });
});

describe('dashboard pages', () => {
  it('renders every analytics and workflow page', async () => {
    const views = [
      <OverviewPage key="overview" {...common}/>, <SpotifyPage key="spotify" {...common}/>, <YouTubePage key="youtube" {...common}/>,
      <RecommendationsPage key="recommendations" {...common}/>, <IdeasPage key="ideas" {...common}/>, <DataPage key="data" {...common}/>,
    ];
    const headings = ['O que merece a tua atenção agora.', 'Da audição à lealdade.', 'Descoberta, retenção e comunidade.', 'Prioridades que não dependem de IA.', 'Transforma sinais em conteúdo.', 'Dados transparentes e recuperáveis.'];
    for (let index = 0; index < views.length; index += 1) {
      const result = render(views[index]);
      expect(screen.getByRole('heading', { name: headings[index] })).toBeInTheDocument();
      result.unmount();
    }
  });

  it('executes recommendation, idea, sync and manager actions', async () => {
    const recommendation = render(<RecommendationsPage {...common}/>);
    fireEvent.click(screen.getByRole('button', { name: /Gerar análise atual/ }));
    await waitFor(() => expect(mocks.saveRecommendations).toHaveBeenCalled()); recommendation.unmount();

    const ideas = render(<IdeasPage {...common}/>);
    fireEvent.click(screen.getByRole('button', { name: /Gerar 3 ideias/ }));
    await waitFor(() => expect(mocks.saveIdea).toHaveBeenCalledTimes(3)); ideas.unmount();

    const history = render(<DataPage {...common}/>);
    fireEvent.click(screen.getByRole('button', { name: /Testar sincronização/ }));
    await waitFor(() => expect(mocks.syncYouTube).toHaveBeenCalled()); history.unmount();

    render(<ManagerPage {...common} user={{ id: 'user-1', email: 'user@example.com' } as any}/>);
    await waitFor(() => expect(screen.getByPlaceholderText('Pergunta sobre os teus dados…')).toBeEnabled());
    fireEvent.change(screen.getByPlaceholderText('Pergunta sobre os teus dados…'), { target: { value: 'Qual é a prioridade?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    await waitFor(() => expect(mocks.addMessage).toHaveBeenCalledTimes(2));
  });
});
