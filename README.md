# EngageFlow Music Intelligence

Aplicação de produção para centralizar Spotify for Artists e YouTube Analytics, comparar performance e transformar dados em próximas ações.

## O que está incluído

- autenticação completa com Supabase Auth e logout;
- onboarding e workspaces por artista;
- overview unificado com comparação entre períodos (7/28/90 dias);
- dashboards Spotify e YouTube;
- comparação entre músicas e vídeos;
- streams, listeners, saves, playlist adds e followers via CSV de Spotify for Artists;
- views, watch time, subscribers e engagement via YouTube Data + Analytics APIs;
- recomendações automáticas, prioridades, estados e histórico;
- content ideas e cross-promotion Spotify ↔ YouTube;
- AI Music Manager com motor local de regras e provider de IA opcional;
- estados de loading, vazio, erro e sucesso;
- layout responsivo e deploy unificado no Vercel;
- testes automáticos e build de produção.

Sem credenciais externas, a aplicação usa mocks realistas. O schema Supabase existente é a fonte de verdade e todas as queries respeitam RLS.

## Desenvolvimento local

Requisitos: Node.js 20+.

```bash
npm install
npm run install:all
```

Cria os ficheiros de ambiente a partir dos exemplos e arranca frontend + API:

```bash
npm run dev
```

- App: `http://localhost:5173`
- Health: `http://localhost:3001/api/health`

## Variáveis

### Frontend (`client/.env`)

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_API_URL=http://localhost:3001/api
```

Em produção no mesmo domínio, `VITE_API_URL` pode ficar por definir.

### Backend (`server/.env` ou Vercel)

```env
MOCK_MODE=true
CLIENT_ORIGIN=http://localhost:5173
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REDIRECT_URI=http://localhost:3001/api/youtube/oauth/callback
OAUTH_STATE_SECRET=

SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=

AI_API_KEY=
AI_API_URL=https://api.openai.com/v1/responses
AI_MODEL=gpt-5-mini
```

`SUPABASE_SECRET_KEY`, `YOUTUBE_CLIENT_SECRET`, `OAUTH_STATE_SECRET`, `SPOTIFY_CLIENT_SECRET` e `AI_API_KEY` são apenas para o backend. Nunca uses o prefixo `VITE_` nestes valores.

## Ligar YouTube real

1. Ativa YouTube Data API v3 e YouTube Analytics API no Google Cloud.
2. Cria um OAuth Client do tipo Web Application.
3. Adiciona o callback local e o callback final do Vercel como Authorized redirect URIs.
4. Preenche as variáveis `YOUTUBE_*`, `OAUTH_STATE_SECRET` e `SUPABASE_SECRET_KEY`.
5. Define `MOCK_MODE=false`.
6. Na aplicação, abre YouTube e clica em **Ligar YouTube**.

O backend usa state assinado, access token, refresh token, rotação automática e persistência na tabela privada já existente. Os tokens nunca são devolvidos ao frontend.

## Spotify

A Spotify Web API é usada apenas para dados oficialmente disponíveis, como catálogo e popularidade. Não existem endpoints inventados de Spotify for Artists.

Para analytics:

1. exporta CSV no Spotify for Artists;
2. abre o dashboard Spotify;
3. clica em **Importar CSV**.

O parser aceita vírgula ou ponto-e-vírgula e aliases comuns em inglês/português. Imports são registados em `spotify_imports`, e as métricas são guardadas em `spotify_daily_metrics`.

## IA opcional

Sem `AI_API_KEY`, o AI Music Manager usa o motor determinístico de regras. Ao configurar uma API compatível com o formato Responses, o backend passa a pedir uma análise avançada e mantém o fallback local em caso de falha.

## Scripts

```bash
npm run dev
npm test
npm run build
npm run vercel-build
```

## Deploy Vercel

O repositório inclui `vercel.json` e uma função catch-all em `api/[...path].ts`, permitindo publicar frontend e API no mesmo projeto. Configura as variáveis acima no Vercel, usa a raiz do repositório como Root Directory e executa o deploy.

## Segurança

- RLS está ativo em todas as tabelas públicas.
- A app usa a publishable key no browser.
- Endpoints privados validam o JWT do utilizador.
- OAuth tokens ficam no schema `private` e só são acessíveis por RPCs concedidas ao `service_role`.
- CORS usa allowlist e as respostas incluem cabeçalhos defensivos.
- Nenhuma funcionalidade gera tráfego, streams, views ou engagement artificial.
