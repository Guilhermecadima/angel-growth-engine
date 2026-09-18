# Plano de testes — Angel Growth Engine

## 0. Pré-condições

1. Node.js 20+ instalado (`node -v`).
2. Dependências instaladas.
3. `server/.env` criado a partir de `.env.example`.
4. Para o primeiro ciclo, manter `MOCK_MODE=true`.
5. Abrir DevTools do browser: Console + Network.

---

## 1. Smoke test

1. Executar `npm run dev`.
2. Abrir `http://localhost:5173`.
3. Confirmar sidebar com 3 secções:
   - Visão geral
   - Growth Automation
   - Viewbot Simulator
4. Confirmar badge `APIs em modo demo`.
5. Confirmar que não há erros vermelhos na Console.
6. Em Network, confirmar `GET /api/health` = HTTP 200.
7. Abrir `http://localhost:3001/api/health` diretamente.
8. Esperado: `{ "ok": true, "mockMode": true }`.

## 2. Navegação e UI

Testar larguras:

- 320 px
- 375 px
- 390 px
- 768 px
- 1024 px
- 1440 px
- 1920 px

Em todas:

- nenhum scroll horizontal inesperado;
- textos legíveis;
- botões clicáveis;
- sidebar/nav acessível;
- cards não se sobrepõem;
- gráficos dentro do card.

## 3. Monitorização — YouTube mock

1. Visão geral.
2. Nome: `Angel — corte transformação`.
3. Plataforma: YouTube.
4. ID: `demo-video-001`.
5. Adicionar ao monitor.
6. Esperado: item aparece na lista.
7. Clicar Snapshot.
8. Esperado: views/likes mock > 0.
9. Clicar Snapshot mais 2 vezes.
10. Esperado: horário do último snapshot muda.
11. Fazer F5.
12. Esperado: item continua guardado.
13. Apagar.
14. F5 novamente.
15. Esperado: não reaparece.

## 4. Monitorização — Spotify mock

Repetir o teste anterior com Spotify e ID `demo-track-001`.

Esperado: mostra `Popularidade X/100`.

## 5. Validação do formulário

Tentar submeter sem:

- nome;
- ID;

O browser deve bloquear os campos `required`.

Depois usar Postman/curl para validar também o backend:

```bash
curl -i -X POST http://localhost:3001/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{"platform":"youtube"}'
```

Esperado: HTTP 400.

## 6. Assistente de engagement

Testar estes comentários:

1. `Onde fica a barbearia?`
2. `Muito bom 🔥🔥🔥`
3. `Quanto custa?`
4. `Quando sai o próximo vídeo?`
5. texto com acentos portugueses;
6. texto longo.

Esperado:

- 3 sugestões;
- nenhuma publicação automática;
- UI continua responsiva.

## 7. Growth Automation

Testar Instagram:

- objetivo: `mais marcações`;
- tema: `transformação fade`;
- público: `homens 18–40 Margem Sul`.

Esperado:

- score 0–100;
- 4 recomendações;
- 4 ações 24 h;
- 3 hooks;
- caption;
- métricas a vigiar.

Repetir para:

- TikTok;
- YouTube;
- Spotify.

Confirmar que Spotify devolve recomendações relacionadas com smart-link/saves, e YouTube com CTR/retenção/Shorts.

## 8. Growth endpoint inválido

```bash
curl -i -X POST http://localhost:3001/api/growth/analyse \
  -H "Content-Type: application/json" \
  -d '{"platform":"qualquercoisa"}'
```

Esperado: HTTP 400.

## 9. Simulator — cenário base

Configuração:

- YouTube
- 10 000 eventos
- 90 min
- likes 3.4%
- comentários 0.4%
- follows 0.2%

Esperado:

- animação chega a 100%;
- `Eventos brutos` = 10 000;
- `Validados` <= 10 000;
- rejeitados > 0;
- likes/comentários/follows calculados;
- gráfico aparece;
- aviso `SIMULADOR LOCAL` continua visível.

## 10. Simulator — limites

Testar mínimo:

- 100 eventos
- 1 minuto
- taxas 0%

Testar máximo pela UI:

- 1 000 000 eventos
- 1440 min
- 25% likes
- 10% comentários
- 10% follows

Testar input extremo diretamente no endpoint:

```bash
curl -s -X POST http://localhost:3001/api/simulation/run \
  -H "Content-Type: application/json" \
  -d '{"targetViews":999999999,"durationMinutes":-20,"likeRate":500}'
```

Esperado:

- `requested` = 1 000 000;
- `durationMinutes` = 1;
- serviço não crasha.

## 11. Confirmar isolamento do simulador

Esta parte é importante antes de o mostrares.

1. Abrir DevTools > Network.
2. Limpar lista.
3. Executar uma simulação.
4. Esperado: request apenas para o teu backend (`/api/simulation/run`).
5. Não deve existir request para:
   - youtube.com;
   - googlevideo.com;
   - spotify.com;
   - tiktok.com;
   - instagram.com.
6. Pesquisar no projeto por termos como `proxy`, `play`, `watch`, `stream` e confirmar que não existe rotina externa de reprodução no simulador.

## 12. Falha do backend

1. Abrir aplicação normalmente.
2. Parar servidor backend.
3. Tentar Growth Automation.
4. Esperado: mensagem de erro; página não fica branca.
5. Voltar a arrancar backend.
6. Fazer refresh.
7. Esperado: aplicação recupera.

## 13. Testes automáticos

```bash
npm test
```

Devem passar os testes de:

- health;
- monitor YouTube;
- payload inválido;
- reply suggestions;
- growth analysis;
- plataforma inválida;
- simulador sintético;
- clamp de inputs extremos.

## 14. Build de produção

```bash
npm run build
```

Esperado:

- backend TypeScript compila;
- frontend TypeScript compila;
- Vite gera `client/dist`.

Depois:

```bash
npm --prefix client run preview -- --host 0.0.0.0
```

Abrir o URL apresentado e repetir Smoke Test + navegação.

## 15. Checklist antes de mostrar ao Angel

- [ ] `MOCK_MODE=true` se ainda não tens APIs reais.
- [ ] Console sem erros.
- [ ] Growth Automation gera resultado.
- [ ] Simulator chega a 100%.
- [ ] Aviso de simulação bem visível.
- [ ] Pelo menos um monitor com snapshot para o dashboard não estar vazio.
- [ ] Testar em telemóvel.
- [ ] Ter uma frase simples para explicar a diferença entre growth real e simulação.
