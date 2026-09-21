import React from 'react';
import { ArrowRight, BarChart3, Eye, EyeOff, LoaderCircle, Music2, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function AuthScreen() {
  const [mode, setMode] = React.useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [visible, setVisible] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [message, setMessage] = React.useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
        setMessage('Enviámos as instruções de recuperação para o teu email.');
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) setMessage('Conta criada. Confirma o email para entrares.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível autenticar.'); }
    finally { setBusy(false); }
  }

  return <main className="auth-shell">
    <section className="auth-story">
      <div className="brand light"><span className="brand-mark"><Music2/></span><span><b>EngageFlow</b><small>Music Intelligence</small></span></div>
      <div className="auth-copy"><span className="overline"><Sparkles/> Decisões melhores, todos os dias</span><h1>Spotify e YouTube.<br/>Uma só estratégia.</h1><p>Transforma métricas dispersas num plano claro de crescimento, conteúdo e cross-promotion.</p></div>
      <div className="auth-proof"><div><BarChart3/><span><b>Analytics unificados</b><small>Compara períodos, músicas e vídeos.</small></span></div><div><Sparkles/><span><b>Music Manager inteligente</b><small>Funciona com regras, mesmo sem uma API de IA.</small></span></div></div>
    </section>
    <section className="auth-panel">
      <form className="auth-card" onSubmit={submit}>
        <div><span className="overline">Área privada</span><h2>{mode === 'login' ? 'Bem-vindo de volta' : mode === 'signup' ? 'Criar conta' : 'Recuperar acesso'}</h2><p>{mode === 'reset' ? 'Indica o email associado à tua conta.' : 'Acede ao centro de inteligência da tua música.'}</p></div>
        <label>Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" placeholder="nome@exemplo.com" required/></label>
        {mode !== 'reset' && <label>Palavra-passe<span className="password-field"><input type={visible ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} required/><button type="button" aria-label={visible ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'} onClick={() => setVisible(value => !value)}>{visible ? <EyeOff/> : <Eye/>}</button></span></label>}
        {error && <div className="form-error">{error}</div>}{message && <div className="form-success">{message}</div>}
        <button className="button primary large" disabled={busy}>{busy ? <LoaderCircle className="spin"/> : <>{mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar conta' : 'Enviar instruções'}<ArrowRight/></>}</button>
        <div className="auth-links">{mode === 'login' && <button type="button" onClick={() => setMode('reset')}>Esqueci-me da palavra-passe</button>}<button type="button" onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}>{mode === 'signup' ? 'Já tenho conta' : 'Criar uma conta'}</button></div>
      </form>
    </section>
  </main>;
}
