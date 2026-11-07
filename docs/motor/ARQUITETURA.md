# Arquitetura e contratos propostos — não implementados

## 1. Separação de responsabilidades

```text
Editor / importadores → catálogo de origem → snapshot independente da carreira
UI → comando do humano ─┐
Agenda do universo ────┼→ orquestrador → política de decisão → proposta
                       │                 (motor ou provedor IA)
                       └→ validadores do domínio → transação de estado/eventos
                                                   ↓
                                      persistência + projeções para UI
```

O controlador React deixa de possuir a regra oficial; chama o motor e apresenta estado/erros. Extrair gradualmente de `game-board.tsx`, mantendo adaptadores para `CareerProgress`. Não criar um segundo universo paralelo nem substituir todas as funções de uma vez.

O jogo é de um humano: CPU não recebe informação/limites privilegiados e o humano não fica imune a contratos, orçamento ou demissão quando o respectivo setor estiver pronto. Pausa significa que não há avanço do tempo simulado; não é simulação contínua no servidor quando o navegador está fechado. Ao avançar, o motor deve processar o intervalo e todos os agentes agendados, visitados ou não.

## 2. Donos dos dados e identidade

| Entidade / agregado proposto | Fonte atual a adaptar | Responsabilidade futura |
|---|---|---|
| CareerUniverse / Save | EditorDatabase, CareerSave, CareerProgress, universeSnapshot | isolamento, revisão, versões de esquema/regras, semente e relógio |
| Club / ClubPlan / Board | EditorClub, ManagerClub, confidenceHistory | identidade, instalações, perfil, metas e planejamento |
| Player / PlayerState | EditorPlayer, Player, PlayerCareerRecord, YouthPlayer | ID global da carreira, dados conhecidos/ocultos, condição, evolução e histórico |
| Coach / Employment | coachName, ManagerClub.coach, ManagerAppointment | técnico com ID independente do clube, contrato, reputação, período desempregado |
| Contract / Registration | contractEndsOn, contractUntil, LoanContract | proprietário, clube de atuação, validade, remuneração e inscrição competitiva separados |
| Negotiation | TransferNegotiation e TransferOffer em career.ts | máquina de estados compartilhada por humano e CPU |
| ClubLedger / Commitment | budget, payroll, GateReceipt | caixa, reservas, obrigações e lançamentos conciliáveis |
| Agent / Representation / Relation | sem agregado completo hoje | interesses, comissões, vínculo de representação e memória |
| Competition / Season | CareerSeason, TournamentRegistration, SeasonFixture | inscrições, regras versionadas, progressão e encerramento |
| DomainEvent / DecisionRecord | MatchEvent, WorldMarket.events e históricos específicos | evidência canônica dos fatos e das decisões, sem depender de texto |

IDs legados numéricos do elenco são locais de UI; `sourceId` identifica origem externa quando existe, `youthId` identifica base. Proposta: introduzir ID persistente da pessoa dentro da carreira, com tabela de equivalência legada. Não converter nomes em chave única nem exigir sourceId para existir. Homônimos continuam pessoas diferentes. Não gerar atletas reais/nacionalidade desconhecida a partir do país do clube.

## 3. Contrato do orquestrador (E2)

Entradas: snapshot, revision, rulesVersion, comando/evento com operationId, data simulada alvo, parâmetros e dependências injetadas (RNG, armazenamento e política). Saída: próximo snapshot, eventos, decisões e erro tipado ou sucesso. Sem rede, React, Date.now ou Math.random implícitos no núcleo.

- Uma unidade de comando valida o estado inicial e todos os efeitos antes de publicar qualquer efeito.
- Repetição de operationId produz o resultado anterior, não outro pagamento/negócio.
- Revisão obsoleta resulta em conflito recuperável; não usar apenas updatedAt para escolher vencedor.
- Datas civis `YYYY-MM-DD` para calendário; UTC ISO para observabilidade técnica. Não usar fuso da máquina para idade/prazo.
- Intervalos processados em ordem por vencimento e prioridade estável. Fim da partida gera fatos antes de avaliações dependentes do placar. Empates de agenda resolvidos por ID estável.
- Prioridade proposta: eventos vencidos → contratos/registro → recuperação/saúde → treino agendado → relações/objetivos → decisões/negociações → financeiro → partidas → pós-jogo → projeções/integridade/checkpoint. A implementação deve testar dependências; proibir reentrância e evento consumido duas vezes.
- Não recuperar anos ignorados com avalanche de contratações. O avanço será em lotes retomáveis com marcos e orçamento de processamento; a UI pode indicar progresso real, sem inventar percentuais.
- Uma falha interrompe no último checkpoint íntegro. Não ressuscitar/excluir jogadores para mascarar falha de migração.

## 4. Unidades e configuração

Situação atual: `EditorPlayer.salaryMonthlyBrl`/`marketValueBrl` e taxa de TransferNegotiation em reais; `budget`, `Player.salary` e ManagerClub.payroll em milhares; Player.marketValue e TransferOffer.fee em milhões. Esses formatos são contratos legados, não uma unidade universal.

Alvo: dinheiro em centavos inteiros seguros, moeda BRL explícita; periodicidade mensal, data de competência e vencimento nos compromissos. Adaptadores convertem nas fronteiras, com regra única de arredondamento e teste contra débito dobrado. Quantidades finitas e não negativas onde exigido; saldo negativo só em modalidade de crédito explicitamente configurada. Reserva reduz disponibilidade, pagamento reduz caixa e baixa obrigação: não cobrar ambos como despesa.

Catálogo futuro de parâmetros: chave, descrição, tipo, unidade, default versionado, limites, responsável, justificativa e suíte de calibração. Migrar primeiro os valores hoje hardcoded (budget inicial, percentuais/preços e cadência do mercado); não inventar novos defaults definitivos nesta etapa. Pesos são distintos de regras legais. Regulamentos têm fonte, país, competição, temporada e vigência.

## 5. Máquina de negociação proposta (E3/E4)

```text
interesse → proposta → contraproposta / recusada / expirada / desistida
          → acordo dos clubes → condições do atleta/agente
          → acordo integral → liquidação e novo contrato → registro / aguarda janela
          → concluída
```

Uma proposta não obriga contratação; acordo entre clubes não implica consentimento do atleta. Estados terminais, prazos e permissões terão testes de transição. Recusa não transfere, acordo não debita caixa antecipadamente, registro pendente não torna atleta elegível. Condições alteradas exigem nova versão da proposta. Concorrência é permitida antes da conclusão; apenas uma operação poderá adquirir o vínculo, invalidando propostas incompatíveis sem apagar histórico.

Contrato de empréstimo separa proprietário e clube de atuação, partilha salarial e retorno. Não impor regra universal de opção/pré-contrato/estrangeiros sem configuração regulamentar pesquisada. Fim de contrato é evento, não mera comparação ad hoc com data de hoje; dados ausentes continuam desconhecidos até migração/decisão válida.

## 6. Eventos, projeções e integridade

Envelope proposto: eventId, operationId, careerId, occurredOn, type, actorIds, entityIds, payload tipado, causationId, rulesVersion e stateRevision. Eventos de negócio e lançamentos financeiros possuem identidade própria. Eventos textuais legados são histórico de apresentação, não reconstituem fatos que nunca foram registrados.

Invariantes: um vínculo proprietário ativo por atleta; empréstimo válido separa dono e atuação; somente elegíveis são escalados; negócio tem os dois clubes/atleta/contrato/finanças consistentes; saldo deriva de abertura + lançamentos; classificação deriva dos resultados; estatísticas reconciliam com os eventos disponíveis. Nunca fabricar eventos detalhados para completar partidas CPU legadas que só têm placar.

Não exigir event sourcing integral como pré-condição: snapshot + diário incremental + revisões é um alvo viável. O armazenamento deve garantir atomicidade do agregado afetado; fila JavaScript por save não substitui transação ou compare-and-swap no backend.

## 7. Compatibilidade e migração

E2 precisa de adaptador puro `legacy → novo envelope`, schemaVersion e relatório de campos ausentes, sem atualizar CURRENT_CAREER_RULESET para apagar saves. IDs/histórico/elenco e clubes preservados; não aplicar coletas atuais como substituição automática. Backfill só de informação comprovável; campos desconhecidos não viram personalidade/reputação real inventada. Estados simulados futuros devem indicar origem e semente.

Testar snapshot legado/atual, sem nacionalidade, atleta promovido sem sourceId, empréstimo ativo/devolvido, partida pausada, negociação pendente, múltiplas carreiras e troca de clube. Migração repetida precisa ser idempotente. Nunca fazer migração parcial silenciosa em caso de falha de armazenamento.

## 8. Fronteira das APIs

Transfermarkt e cadastro pertencem ao Editor; auditar e remover gradualmente a exceção atual de consulta U20 na carreira, sem perder bases salvas. Gemini é um provedor opcional de decisão do universo simulado, autorizado conceitualmente pelo usuário, não uma fonte de dados reais nem substituto do Editor. Detalhes e segurança em [IA-HIBRIDA](IA-HIBRIDA.md).
