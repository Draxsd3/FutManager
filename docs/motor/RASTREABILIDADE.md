# Rastreabilidade dos requisitos

Cobertura integral por capítulo do anexo (27/27). Inventário granular dos 22 módulos em [DIAGNOSTICO](DIAGNOSTICO.md); aceites em [PLANO](PLANO.md). Caminhos abreviados referem-se a `src/lib/game/`, exceto controlador em `src/components/`. Classificação mede o anexo, não quantidade de telas.

| Capítulo | Exigência | Estado atual | Evidência principal | Trabalho previsto |
|---|---|---|---|---|
| 1 | Universo autônomo e invariantes | Parcial | career-universe.ts; world-market.ts | E2–E8 |
| 2 | Orquestrador e 22 módulos | Parcial | game-board.tsx; progress.ts | E2 |
| 3 | Modelo universal de entidades | Parcial | editor-data.ts; mock-data.ts; career.ts | E2/E3/E5/E6 |
| 4 | Personalidade, utilidade e memória | Parcial: heurísticas sem modelo geral | world-market.ts; football-decisions.ts | E4/E5/E6 |
| 5 | Planejamento de clubes | Parcial | world-market.ts | E4 |
| 6 | Mercado com interesses e concorrência | Parcial | transfers.ts; recruitment.ts; incoming-offers.ts | E3/E4 |
| 7 | Contratos de jogadores e técnicos | Parcial | career.ts; loans.ts; manager-jobs.ts | E3/E5 |
| 8 | Empresários e representação | Ausente estruturado | sem módulo de representação encontrado | E3/E4/E6 |
| 9 | Economia e compromissos | Parcial | manager-market.ts; stadium.ts; recruitment.ts | E3 |
| 10 | Gestão de elenco/papel | Parcial | world-market.ts; formations.ts | E4/E6 |
| 11 | Treino e evolução contextual | Parcial | training.ts | E6 |
| 12 | Condição, lesões e suspensões | Parcial: condição não é prontuário | live-match.ts; match-rules.ts | E6/E7 |
| 13 | Tática e preparação | Parcial | football-decisions.ts; live-match.ts | E5/E7 |
| 14 | Partidas e ajustes CPU | Parcial | live-match.ts; season.ts | E7 |
| 15 | Competições/calendário/temporadas | Parcial | season.ts; tournament-formats.ts; tournament-progression.ts | E7/E8 |
| 16 | Base e renovação do universo | Parcial sob demanda | youth.ts; game-board.tsx | E6/E8 |
| 17 | Carreiras/reputação/relações | Parcial | career.ts; manager-jobs.ts; confidence.ts | E5/E6/E8 |
| 18 | Notícias de fatos reais | Parcial: texto sem evento canônico | world-market.ts | E2/E4/E8 |
| 19 | Estatísticas e histórico | Parcial | career.ts; honours.ts; season.ts | E7/E8 |
| 20 | Tempo e ciclo | Parcial | game-board.tsx; season.ts | E2 |
| 21 | Integridade e transações | Parcial: verificações locais | recruitment.ts; transfers.ts; persistence.ts | E2/E3 |
| 22 | Persistência e auditoria | Parcial: snapshot sem auditoria geral | progress.ts; persistence.ts; career-universe.ts | E2 |
| 23 | Configuração e balanceamento | Parcial: regras das partidas centralizadas | match-rules.ts; public/game-assets/match-engine-rules.md | E2 e setores |
| 24 | IA generativa validada | Ausente no motor de universo | nenhum adaptador Gemini no fluxo auditado | E2 contrato/E4 piloto |
| 25 | Testes funcionais/comportamento/equilíbrio/integridade | Parcial: suítes locais, sem campanha plurianual | *.test.ts em src/lib/game; football-calibration.test.ts | Todas; E8 campanha |
| 26 | Implementação incremental/compatibilidade | Parcial, prática existente e este plano | career-universe.ts; save-reconciliation.ts; CONTEXTO.md | Todas |
| 27 | Ecossistema profissional sustentável | Parcial; objetivo final não atingido | conjunto dos módulos do diagnóstico | E8 valida integração |

## Exceções explícitas

- Cap. 1.7: determinismo observado em partidas/algumas decisões não se estende hoje a treino e universo inteiro. E2 separará replay de chamadas LLM novas.
- Cap. 1.9/1.10: capacidade de armazenar clubes não implica regulamentos universais já parametrizados. Brasil continua o escopo inicial.
- Cap. 3.3/7.3: humano não é hoje demissível no caminho principal; E5 precisa de fluxo de desemprego antes de remover a proteção.
- Cap. 6.5: uma contraproposta baseada apenas em porcentagem não é negociação contextual de clube/atleta/agente.
- Cap. 21: proprietário e clube de atuação diferem em empréstimo; a regra de unicidade não pode proibir empréstimos válidos.
- Cap. 24: [IA-HIBRIDA](IA-HIBRIDA.md) amplia o uso para propostas estratégicas validadas conforme direção do usuário. Não concede execução arbitrária.
- Cap. 25: suíte verde não declara economia equilibrada nem comprova todas as fases/temporadas; campanha longa está planejada, não executada nesta etapa.

## Atualização E3 (sem reclassificar o diagnóstico original como motor completo)

Finanças e contratos de jogador têm agora livro/compromissos, liquidação bilateral, folha civil e inscrição básica em `simulation/finance.ts` e `settlement.ts`; integração e limites em [ETAPA-3.md](ETAPA-3.md). Capítulos 6–9 e 21 continuam parciais em relação à especificação inteira: agentes, planejamento de mercado, contratos de técnicos, toda a economia e transações distribuídas não foram declarados concluídos.

## Atualização E4

Planejamento por clube/posição/calendário, preço contextual, proposta versionada, concorrência e piloto assistido/comparação estão integrados ao avanço comum; ver [ETAPA-4.md](ETAPA-4.md). API server-only, quota por conta/revisão e replay/fallback testados. Representação desconhecida continua explícita, sem agentes completos nem comissão; E5–E8 e calibração plurianual não são declarados concluídos. Gemini real não foi habilitado ou consultado.
