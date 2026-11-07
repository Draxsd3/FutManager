# Diagnóstico do motor existente

Base e limites em [ORIGEM](ORIGEM.md). Prefixos das evidências: **G** = `src/lib/game/`; **B** = `src/components/game-board.tsx`; **S** = `supabase/migrations/`. Os arquivos citados possuem caminho real no checkout. Testes são evidência de cenários específicos, não prova de simulação completa de um setor. Não contamos telas como implementação do respectivo sistema.

## Legenda

- **Parcial:** há regras funcionais, mas não atende todo o setor do anexo.
- **Ausente:** não foi encontrado sistema estruturado no fluxo auditado.
- **Implementado no recorte:** fluxo específico existente e coberto; não equivale ao módulo inteiro concluído.

Nenhum dos 22 módulos é declarado integralmente concluído contra o anexo. Há capacidades úteis a reutilizar, sem reescrita total.

## Inventário dos 22 módulos do capítulo 2.2

| Nº / módulo | Situação e evidência de execução | Evidência de teste | Lacuna para o anexo / destino |
|---|---|---|---|
| 1. Tempo/calendário | Parcial. G/season.ts, G/brazilian-calendar.ts; B avança data ao continuar resultado | G/season.test.ts, G/brazilian-calendar.test.ts; teste de avanço/retorno de empréstimo em `src/components/game-board.test.tsx` | Sem relógio de domínio/orquestrador universal; frequência CPU semanal não equivale a processar todos os dias. E2 |
| 2. Universo/países/regras | Parcial. G/editor-data.ts, G/career-universe.ts, G/tournament-formats.ts | G/career-universe.test.ts, G/tournament-formats.test.ts | Universo independente existe; formatos e calendário ainda brasileiros/específicos. Fontes e limites dos estaduais em docs/REGULAMENTOS-2026.md. E2/E8 |
| 3. Clubes/administração | Parcial. EditorClub, G/manager-market.ts, G/world-market.ts | G/world-market.test.ts, G/manager-market.test.ts | Sem diretoria/estratégia persistente por clube, objetivos de longo prazo ou planejamento completo. E4/E5 |
| 4. Jogadores/carreira | Parcial. EditorPlayer, Player, PlayerCareerRecord em G/editor-data.ts, G/mock-data.ts, G/career.ts | G/career.test.ts, G/recruitment.test.ts | Vários modelos/IDs/unidades; sem personalidade, ciclo completo de envelhecimento/aposentadoria e todos os atributos do anexo. E2/E6 |
| 5. Treinadores/carreira | Parcial. G/manager-market.ts, G/manager-jobs.ts | G/manager-jobs.test.ts | Técnico majoritariamente nome/vaga; falta entidade independente com contrato, salário, reputação, desemprego. Humano protegido de demissão no fluxo atual. E5 |
| 6. Diretorias/governança | Parcial. G/confidence.ts, avaliação em G/manager-market.ts | G/confidence.test.ts, G/manager-market.test.ts | Confiança simplificada não é modelo de dirigentes, metas e perfil de gestão. E5 |
| 7. Empresários/agentes | Ausente como entidade estruturada e participante da negociação | Sem suíte específica encontrada | Cadastro, representação, comissões, interesses e relações. E3/E4/E6 |
| 8. Contratos/registro | Parcial. G/recruitment.ts, G/career.ts, G/loans.ts, G/player-contract.ts | G/recruitment.test.ts, G/loans.test.ts, G/market-search.test.ts | Datas e empréstimos não implementam ciclo completo de contrato/inscrição. Não existe autoridade unificada de elegibilidade por competição. E3/E7/E8 |
| 9. Mercado/negociação | Parcial. G/transfers.ts, G/world-market.ts, G/incoming-offers.ts; B conclui compra e aceita venda humana por fluxos distintos | G/transfers.test.ts, G/world-market.test.ts, G/incoming-offers.test.ts, `src/components/screens/world-screens.test.tsx` | Preços/aceitação simplificados, concorrência limitada, não há consentimento individual contextual, liquidação única nem registro regulamentar completo. E3/E4 |
| 10. Finanças/economia | Parcial. budget em B, G/manager-market.ts, G/recruitment.ts, G/stadium.ts | G/stadium.test.ts, G/recruitment.test.ts | Sem livro-caixa único, parcelas/dívidas/folha periódica reconciliada; caixa e reserva salarial confundidos. E3 |
| 11. Elencos/planejamento | Parcial. G/world-market.ts, G/formations.ts, G/lineup.ts | G/world-market.test.ts, G/lineup.test.ts, G/formations.test.ts | Limites e profundidade heurísticos; sem planos, promessa de papel ou reposição futura por calendário. E4 |
| 12. Treino/desenvolvimento | Parcial. G/training.ts; B/trainPlayers | G/training.test.ts | Treino manual do humano, crescimento agregado por sorteio, sem potencial/rotina universal CPU; usa Math.random por padrão. E6 |
| 13. Saúde/físico/lesões | Parcial. G/live-match.ts: fadiga por idade/função e recuperação entre datas | G/live-match.test.ts | Energia não equivale a prontuário; sem catálogo e ciclo persistente de lesões, tratamento e recaída. E6 |
| 14. Tática/preparação | Parcial. G/football-decisions.ts, G/live-match.ts, G/formations.ts | G/football-decisions.test.ts, G/live-positioning.test.ts | Plano rival adaptativo existe; sem treinador individual, familiaridade/contexto e planejamento universal. E5/E7 |
| 15. Partidas | Parcial. B chama G/live-match.ts/simulateAction; G/season.ts usa otherScore para partidas de fundo | G/live-match.test.ts, G/football-calibration.test.ts | Ao vivo e fundo não usam mesma granularidade. engine.ts não é o controlador do universo atual; não substituir o fluxo real por esse nome de arquivo. E7 |
| 16. Competições/classificação | Parcial. G/season.ts, G/tournament-progression.ts, G/tournament-schedule.ts, G/competitions.ts | G/season.test.ts, G/tournament-formats.test.ts, G/competitions.test.ts | Há grupos/fases e registros de acesso, mas não ciclo plurianual completo de inscrições e temporadas. 19 estaduais simplificados. E7/E8 |
| 17. Base/novos atletas | Parcial. G/youth.ts; criação sob demanda em B e endpoint `src/app/api/transfermarkt/youth/route.ts` | G/youth.test.ts; integração de promoção em `src/components/game-board.test.tsx` | Não é renovação anual de todos os clubes. Promoção não usa sempre sourceId do catálogo. Há chamada de dados externos na carreira, divergente da regra do Editor. E2/E6/E8 |
| 18. Arbitragem/disciplina | Parcial. Faltas/cartões/impedimento em G/live-match.ts e parâmetros de G/match-rules.ts | G/live-match.test.ts, G/match-rules.test.ts | Sem suspensão acumulada universal por competição; nem todos os reinícios/penalidades IFAB simulados. E6/E7 |
| 19. Notícias/eventos | Parcial. WorldMarket.events contém data/texto, até 100 entradas | G/world-market.test.ts | Sem eventId/entidades/tipo/auditoria canônicos; texto não pode ser fonte de verdade. E2/E4/E8 |
| 20. Estatísticas/histórico | Parcial. G/career.ts, G/honours.ts, contribuições em G/season.ts | G/career.test.ts, G/honours.test.ts | Histórico útil existe, mas sem estatísticas detalhadas/eventos completos para todas as partidas CPU, temporadas e agentes. E7/E8 |
| 21. Reputação/relações/moral | Parcial. Confiança em G/confidence.ts, motivação na preparação/partida em B/G/live-match.ts | G/confidence.test.ts, G/live-match.test.ts | Sem grafo de relações, personalidade, reputação individual persistente e memória estratégica. E5/E6 |
| 22. Persistência/auditoria/integridade | Parcial. G/persistence.ts, G/progress.ts, G/save-reconciliation.ts, G/career-universe.ts; tabelas em S | G/persistence.test.ts, G/career-universe.test.ts, G/club-reconciliation.test.ts | Escritas serializadas por save no processo não são transação global/multiaba; falta revisão otimista e diário estruturado de decisões. E2 |

## Fluxos confirmados no código

### Carreira e universo

Editor → `createCareerUniverseSnapshot` → `CareerProgress.universeSnapshot` → catálogo congelado da carreira → `worldDatabase` aplica negócios/empréstimos/listagens → elenco humano salvo e elencos adversários derivados. A recuperação estrutural pode corrigir duplicatas/metadados/elenco não jogável; não autoriza atualizar livremente uma carreira com a coleta mais recente. Criar clube no Editor não significa inseri-lo automaticamente em saves anteriores.

### Partida e avanço

B prepara regras via `loadMatchRules`, executa `simulateAction` por minuto, grava resultado via `completeCareerFixture`, confiança/estatísticas/bilheteria. No `ResultScreen.onContinue`, calcula próxima data, expira empréstimos, chama `simulateWorldMarket`, reconcilia elenco, recupera energia, gera ofertas recebidas e salva. A interface ainda coordena regras e efeitos demais. Um clube não visitado pode ter jogos/negócios de fundo, mas isso **não comprova atualização diária de todos os seus agentes**.

### Mercado

Compra humana: `proposeTransfer` → contraproposta/acordo → `recruitPlayer` → atualização do elenco/budget/negociação/loan no controlador. CPU: `simulateWorldMarket` negocia e conclui numa rodada semanal, até seis negócios; protege humano e negociações ativas e usa cooldown de 90 dias. Oferta recebida: `generateIncomingOffers` cria no máximo uma por partida; aceitar passa por `applyPlayerMarketAction`, um caminho diferente do ledger de compras/CPU.

### Armazenamento

Navegador mantém índice dos saves em localStorage, catálogo/snapshots por mecanismos locais em G/persistence.ts e cache em `src/lib/importer/database-cache.ts`; nuvem usa Supabase. `game_saves.state.progress` armazena progresso; `career_players` e `career_player_seasons` materializam dados. Migrações `20260823211728_persist_full_career_backend.sql`, `20261104050000_transfermarkt_origin.sql`, `20261105023433_sync_catalog_schema.sql` são referências do esquema. `writeCloudCareer` faz upserts sequenciais; a fila `saveWrites` evita sobreposição local no mesmo processo, não garante commit atômico de todos os dados em várias abas/dispositivos.

## Riscos concretos a tratar — não corrigidos nesta etapa

| ID | Prioridade | Evidência / risco | Etapa e verificação exigida |
|---|---|---|---|
| R01 | P0 integridade | B/applyPlayerMarketAction remove vendido do humano e credita taxa, mas não grava ali o mesmo TransferNegotiation completed nem débito no comprador. Propriedade no universo e elenco podem divergir | E3/E4: venda aceita transfere propriedade e os dois lados financeiros uma única vez, inclusive após reload |
| R02 | P0 economia | recruitPlayer/world-market reservam taxa + salários futuros; manager-market também usa payroll/4 por jogo. Sem ledger que diferencie reserva e pagamento há risco de dupla incidência e economia incompatível | E3: reserva não é despesa; débito mensal único reconciliado |
| R03 | P0 replay | Treino usa Math.random e UUID; não existe semente/cursor universal versionado no save. Determinismo de partidas não garante do universo inteiro | E2: relógio, RNG por domínio, versão e replay dos eventos |
| R04 | P0 operações | Regras distribuídas em B; efeitos e gravações em chamadas distintas sem transação global/revisão | E2/E3: comando atômico + conflito de revisão + falha injetada |
| R05 | P1 contratos | Ser livre exige cadastro explícito sem clube; expiração de contrato não é hoje ciclo geral de desligamento/renovação. Compra permanente pode carregar término anterior | E3: tratar término e gerar novo vínculo válido, sem presumir livre só por dado incompleto |
| R06 | P1 técnicos | `updateCareerMarket` passa allowDismissal:false para humano; nome em clube não é treinador com ID/carreira/contrato. Tela de técnicos deriva vínculos atuais | E5: modelo único, desemprego humano jogável, sem inventar histórico de carreira |
| R07 | P1 tempo | Saltos de data executam rodada CPU limitada, não todos os vencimentos/dias em ordem | E2: intervalo processado sem perder prazos, sem avalanche de negócios |
| R08 | P1 fonte | B cria base com consulta externa em carreira, apesar de separação Editor/jogo | E2 define fronteira; E6 migra a origem com fallback explícito; não expandir chamadas Transfermarkt no jogo |
| R09 | P1 mundo | Não há rollover plurianual completo; atributos e saúde CPU não têm o mesmo ciclo do humano | E6/E8: múltiplas temporadas sem esgotar elenco ou apagar passado |
| R10 | P1 auditoria | Giro é texto limitado, sem razões/contextos candidatos/versões por decisão | E2: eventos tipados e arquivo de auditoria; feed pode continuar limitado |
| R11 | P1 escala | Parâmetros hardcoded: até seis negócios, caixa inicial igual, limites de plantel/posição, percentuais de negociação | E2/E3/E4: catálogo versionado e calibração, não simplesmente aumentar frequência |
| R12 | P1 persistência | Atleta promovido pode ter youthId sem sourceId; reconciliação em nuvem por source_player_id exige cuidado com identidade nula | E2/E6: IDs persistentes sem colidir promoções nem corromper histórico |

P0 indica o que bloqueia aumentar a autoridade da IA, não uma autorização para mudar agora o jogo. Esses achados exigem cenários reproduzíveis na implementação; não são relatos de corrupção confirmada dos saves do usuário.
