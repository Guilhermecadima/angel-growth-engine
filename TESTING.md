# Verificação da entrega

## Automático

```bash
npm test
npm run build
```

Os testes cobrem health/error handling da API, proteção de endpoints, assinatura OAuth, parser CSV, cálculos por período, mocks, recomendações e fallback do AI Music Manager.

## Fluxo manual

1. Criar conta e confirmar email (quando a confirmação está ativa no Supabase).
2. Criar o primeiro workspace de artista.
3. Navegar por todas as sete áreas do menu.
4. Alternar 7/28/90 dias e confirmar alterações nos KPIs/gráficos.
5. Importar um CSV Spotify válido e confirmar histórico.
6. Importar um CSV inválido e confirmar erro recuperável.
7. Gerar recomendações, aceitar e concluir uma ação.
8. Gerar content ideas, adicionar uma manual e alterar estado.
9. Perguntar ao AI Music Manager sobre Spotify, YouTube e prioridades.
10. Terminar sessão e voltar a entrar.

## Responsive

Validar sem scroll horizontal em 320, 390, 768, 1024 e 1440 px. Em mobile, o menu lateral abre como drawer e todas as tabelas mantêm scroll interno.

## YouTube real

1. `MOCK_MODE=false` e credenciais definidas.
2. Clicar **Ligar YouTube** e concluir OAuth.
3. Confirmar redirect para `#/youtube?connected=1`.
4. Clicar **Sincronizar**.
5. Confirmar `sync_runs.status=completed`, `platform_accounts.is_connected=true`, vídeos e métricas no Supabase.
6. Forçar token expirado e confirmar refresh automático.

## Supabase

- confirmar que um utilizador não vê artistas de outro utilizador;
- confirmar que queries anónimas às tabelas públicas não devolvem linhas;
- confirmar que as RPCs OAuth não executam como `anon` ou `authenticated`;
- rever Security e Performance Advisors depois de alterações ao schema.
