# Angel Growth Engine

Demo técnica para apresentar ao Angel Fortes. O projeto tem **duas áreas claramente separadas**:

1. **Growth Automation real** — análise de conteúdo, plano de distribuição, hooks, captions, acompanhamento de métricas e respostas assistidas.
2. **Viewbot Simulator** — simulador local de métricas sintéticas para demonstrar filas, dashboards, validação/rejeição e curvas de execução. **Não envia tráfego para YouTube, Spotify, Instagram ou TikTok.**

## Stack

- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- Testes: Vitest + Supertest
- Ícones: Lucide React
- YouTube: adapter preparado para YouTube Data API v3
- Spotify: adapter preparado para Spotify Web API

## Arranque rápido

Na raiz do projeto:

```bash
npm install
npm run install:all
```

Depois cria o ficheiro de ambiente:

### Windows PowerShell

```powershell
Copy-Item server/.env.example server/.env
```

### macOS / Linux / Git Bash

```bash
cp server/.env.example server/.env
```

Confirma que `server/.env` começa assim:

```env
PORT=3001
MOCK_MODE=true
YOUTUBE_API_KEY=
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
```

Arranca frontend + backend:

```bash
npm run dev
```

Abre:

- Frontend: http://localhost:5173
- Backend health: http://localhost:3001/api/health

## O que mostrar ao cliente

### 1. Visão geral

Mostra que o produto centraliza:

- conteúdos monitorizados;
- snapshots de métricas;
- respostas assistidas;
- acesso ao Growth Automation;
- acesso ao simulador isolado.

### 2. Growth Automation

Preenche, por exemplo:

- Plataforma: Instagram
- Objetivo: `mais alcance e marcações`
- Tema: `Transformação de corte + fade`
- Público: `homens 18–40 na Margem Sul`

Clica **Gerar plano de crescimento**.

O sistema devolve:

- Opportunity Score;
- recomendações;
- plano das próximas 24 h;
- hooks;
- caption;
- métricas a acompanhar.

### 3. Viewbot Simulator

Explica antes de clicar:

> “Isto é uma simulação técnica. Não abre vídeos nem envia views. Serve para demonstrar como seria a camada de processamento, validação e analytics de um sistema deste género.”

Experimenta:

- Plataforma: YouTube
- Eventos simulados: 10 000
- Duração: 90 min
- Like: 3.4%
- Comentários: 0.4%
- Follow: 0.2%

Clica **Executar simulação**.

A demo mostra:

- progresso da execução;
- eventos brutos;
- eventos validados pelo modelo;
- rejeições;
- engagement sintético;
- follows sintéticos;
- retenção média;
- curva temporal.

## Scripts

```bash
npm run dev
npm test
npm run build
```

Para executar só uma parte:

```bash
npm --prefix server run dev
npm --prefix client run dev
npm --prefix server test
npm --prefix server run build
npm --prefix client run build
```

## APIs reais

### YouTube

Quando tiveres uma API key da YouTube Data API v3:

```env
MOCK_MODE=false
YOUTUBE_API_KEY=...
```

Endpoint de teste:

```text
GET /api/youtube/:videoId
```

### Spotify

Quando tiveres credenciais de uma aplicação Spotify:

```env
MOCK_MODE=false
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
```

Endpoint de teste:

```text
GET /api/spotify/:trackId
```

Nunca colocar secrets no frontend/Vite.

## Limites intencionais do simulador

O simulador não contém:

- reprodução automática de vídeos ou faixas;
- rotação de proxies;
- criação/controlo de contas falsas;
- técnicas de evasão de deteção;
- geração de likes, comentários ou follows em plataformas externas;
- campo de URL para “atacar” um conteúdo.

Os números são calculados no backend e devolvidos apenas para o dashboard local.
