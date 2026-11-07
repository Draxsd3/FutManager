# Motor do FutManager — etapa 1: diagnóstico e especificação

**Escopo fechado:** documentação e plano de execução. Não altera jogo, UI, saves, banco, API, configuração, balanceamento ou regulamento. Não implementa ainda o motor descrito no anexo. Um jogador humano; todos os demais agentes devem adquirir autonomia contextual ao longo das etapas.

## Ordem de leitura

1. [Origem, versão e integridade do anexo](ORIGEM.md).
2. [Diagnóstico do código e matriz dos 22 módulos](DIAGNOSTICO.md).
3. [Rastreabilidade dos 27 capítulos](RASTREABILIDADE.md).
4. [Modelo de dados, fluxos e fronteiras do motor](ARQUITETURA.md).
5. [Decisão híbrida: motor, IA e comparação](IA-HIBRIDA.md).
6. [Etapas, dependências e critérios de aceite](PLANO.md).
7. [Registro de decisões e questões a calibrar](DECISOES.md).
8. [Validação e checklist de encerramento da etapa 1](VALIDACAO.md).

## Especificação por setor

Os textos abaixo são extrações do anexo, com seus capítulos originais preservados. Requisitos não são afirmações de implementação.

| Setor | Capítulos originais | Referência |
|---|---|---|
| Fundação, tempo, integridade, persistência e parâmetros | 1, 2, 20–23 | [01-fundacao](setores/01-fundacao.md) |
| Entidades, personalidade e relações | 3, 4, 17 | [02-entidades](setores/02-entidades.md) |
| Economia | 9 | [03-financas](setores/03-financas.md) |
| Contratos, técnicos, diretorias e agentes | 7, 8 | [04-contratos-tecnicos-agentes](setores/04-contratos-tecnicos-agentes.md) |
| Planejamento dos clubes, mercado e elenco | 5, 6, 10 | [05-mercado-elencos](setores/05-mercado-elencos.md) |
| Desenvolvimento, saúde e base | 11, 12, 16 | [06-jogadores](setores/06-jogadores.md) |
| Tática, partidas e competições | 13–15 | [07-partidas-competicoes](setores/07-partidas-competicoes.md) |
| Notícias, estatísticas e memória histórica | 18, 19 | [08-noticias-historico](setores/08-noticias-historico.md) |
| IA, testes, implementação e objetivo final | 24–27 | [09-ia-qualidade](setores/09-ia-qualidade.md) |

## Precedência e convivência

- O anexo original permanece imutável. Estes documentos acrescentam diagnóstico e proposta técnica; não declaram que suas lacunas foram corrigidas.
- O complemento híbrido explicita a direção solicitada pelo usuário: IA pode propor decisões estratégicas nos setores habilitados, mas não tem autoridade de execução ou de inventar fatos. Isso amplia o papel textual do capítulo 24 sem relaxar integridade.
- `CONTEXTO.md` continua a registrar instruções do projeto. Não substituir `AGENTS.md`, `MECANICA-JOGO.md` ou a documentação de partidas/regulamentos.
- `public/game-assets/match-engine-rules.md` continua sendo o arquivo lido pelo motor de partidas via `match-rules.ts`. Este diretório não é carregado em runtime. Não colocar especificação de universo no parser numérico de partidas.
- Calendário e regulamentos brasileiros seguem `../REGULAMENTOS-2026.md` e `../brazilian-calendar.md`; não inventar novos formatos a partir de texto genérico.
- O próximo trabalho executável é a **etapa 2**, limitada à fundação. Nenhuma etapa seguinte está implicitamente implementada ou ativada.
