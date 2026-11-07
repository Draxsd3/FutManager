# Etapa 2 — fundação executável do motor

## Entrega e recorte

Implementado o serviço de avanço **pós-partida**, com contrato de comando/checkpoint e adaptador real na tela Resultado. Não é reescrita de todos os módulos, integração Gemini, novo mercado ou nova economia. O diagnóstico da etapa 1 permanece um registro histórico da base auditada; este documento descreve a evolução.

### Arquivos

- `src/lib/game/simulation/foundation.ts`: configuração versionada, envelope, datas civis, migração aditiva, RNG por stream, agenda estável e contrato de política.
- `src/lib/game/simulation/advance.ts`: `advanceCareer` puro, `commitAdvance` e interface compare-and-swap para repositório; executável sem React, navegador, API ou relógio real.
- `src/lib/game/simulation/local-checkpoint.ts`: publicação local protegida por Web Locks, revisão e verificação de erro de armazenamento.
- `src/components/game-board.tsx`: gera comando estável por partida; calcula, publica checkpoint e somente então atualiza os estados de apresentação. Proteção de clique simultâneo e erro recuperável.
- `src/lib/game/persistence.ts`: índice local monotônico por revisão, cache posterior à publicação local, encadeamento de gravações de nuvem com token opaco por conta/save e detecção de conflito do banco.
- `supabase/migrations/20261106020000_game_save_checkpoint_cas.sql`: trigger transacional no agregado `game_saves`, sob RLS existente. Nenhum reset, nova permissão, exclusão de dados ou tabela de universo paralela.
- `supabase/tests/game_save_checkpoint_cas.sql`: verificação real da função usando tabela temporária e rollback; não lê nem altera saves do usuário.

## Estado e configuração

`CareerProgress.engine` contém schemaVersion, rulesVersion, revision, seed, date, streams/cursors, operações já aplicadas, eventos e decisões. A semente inicial deriva do ID da carreira; não depende de nome, hora atual ou coleta recente. Identidades, resultados, elenco e CURRENT_CAREER_RULESET não são trocados pela migração.

Reabrir migra apenas o envelope ausente; migração repetida produz o mesmo resultado. Versão desconhecida ou envelope incompatível interrompem com erro, sem tentar resetar. Carreiras antigas mantêm a normalização de calendário legada antes da adoção do envelope; com envelope, o carregamento não avança a data silenciosamente.

ENGINE_CONFIG centraliza a versão, o limite defensivo de intervalo e os valores já existentes de cadência/segurança de mercado: máximo seis negócios, mínimo vendedor 20, máximo comprador 30, cooldown 90 dias e fração de orçamento 0,25. Os números não foram recalibrados. Outros parâmetros de regras antigas continuam em seus módulos e serão migrados junto dos respectivos setores; o parser Markdown de partidas continua intacto.

Os novos streams RNG são isolados por domínio/cursor e sobrevivem à serialização. **Não foi trocado silenciosamente o algoritmo de partidas ou o Math.random do treino legado**. Determinismo aqui é do comando de avanço com mesma versão/estado e das novas APIs de streams, não promessa de toda ação antiga do jogo já ser determinística.

## Sequência real do comando

1. Validar carreira, identidade do comando, revisão e data de origem.
2. Detectar repetição; comando já aplicado não incrementa rodada/revisão nem gera ofertas novamente.
3. Calcular alvo usando o mesmo calendário; rejeitar datas inválidas, retrocesso e intervalo maior que 3.660 dias.
4. Copiar o estado de trabalho. Ordenar vencimentos por data civil, prioridade e ID. Empréstimos retornam no vencimento real; ofertas de emprego expiram no dia seguinte ao último dia válido. Pendências anteriores são resolvidas na data inicial, sem fingir que ocorreram historicamente em outro dia.
5. Aplicar mercado semanal legado na data final, com regras preservadas. Não simular milhares de transferências retroativas por um salto longo.
6. Derivar universo efetivo, reconciliar empréstimos/elenco, recuperar energia, remover referências de escalação/posições inválidas e gerar ofertas recebidas com a identidade da partida.
7. Registrar eventos tipados, decisões internas do mercado, operação e checkpoint. Produzir novo snapshot completo com revisão +1 e data alvo; o argumento de entrada não é modificado.
8. Publicar um checkpoint local completo. Só depois atualizar a tela e tentar sincronizar o mesmo agregado na nuvem.

Agenda por intervalo não significa que folha, lesões, contratos de trabalho e ciclos anuais inexistentes foram criados. Esses eventos receberão handlers nas etapas 3–8. O intervalo é uma transação de avanço inteira, não um worker que salva metade da rodada. Não há processamento diário artificial nem porcentagem inventada.

## Concorrência, atomicidade e falhas

- Core: valida revisão e retorna snapshot privado; `commitAdvance` exige repositório com CAS atômico. Os testes injetam rejeição, falha de disco e dois escritores.
- Adaptador real local: lock por conta/save cobre comparação de revisão e publicação de um índice localStorage. Escritor antigo não pode publicar revisão inferior pelo adaptador. Sem Web Locks, o avanço falha de forma explícita; não há fallback que finja exclusão mútua. É necessário navegador moderno em contexto seguro.
- Falha de quota local impede a mudança da tela/estado e não atualiza o cache antes do índice. Cache grande continua sendo otimização assíncrona existente; não é a autoridade que autoriza um avanço.
- Nuvem: cada escrita envia token novo e token-pai conhecido. O trigger compara com o estado atual da linha sob a transação PostgreSQL; outra aba/dispositivo com pai antigo recebe SQLSTATE 40001. Revisão do motor menor também é rejeitada. Isso funciona até para clientes legados tentando regravar uma linha já adotada pelo protocolo.
- O cliente encadeia somente antecessores reconhecidos das próprias gravações confirmadas; uma linhagem externa antiga não é promovida silenciosamente para o token atual. Atualizar metadado de confirmação local usa o mesmo Web Lock do checkpoint.
- Conflito é diferente de falha de rede: não fazer retry infinito nem sobrescrever remoto à força. A mensagem pede reabrir o save. Uma falha de rede pode deixar checkpoint íntegro no dispositivo e nuvem anterior; não declara sincronização bem-sucedida.

**Limite da extração:** Web Locks/CAS de domínio estão ligados ao avanço pós-partida. Ações antigas de UI ainda não foram todas convertidas em comandos com revisão própria; autosaves locais antigos não constituem um sistema genérico de edição colaborativa. A proteção remota é por gravação completa do save, e não por cada projeção em `career_players`/`career_player_seasons`. A unificação transacional de transferências, finanças e projeções continua E3/E4. Não há atomicidade distribuída entre navegador e nuvem nem mesclagem automática de conflitos offline.

## Auditoria e política de IA

Eventos persistidos: retorno de empréstimo, expiração de oferta de emprego, processamento do mercado, novo negócio CPU concluído e checkpoint. Possuem ID, operationId, data, tipo, entidades e revisão. Operações ficam no save para impedir reaplicação após reload.

Decisões guardam setor, modo, ação, versão, revisão anterior, opções fornecidas, razão técnica e eventos associados. A política legada não avalia uma shortlist contextual rica: o registro identifica sua ação e negociação existente, sem inventar alternativas que não foram avaliadas. A auditoria não usa o feed limitado de 100 notícias como fonte de verdade.

`DecisionPolicy` e `chooseDecision` oferecem interno, assistido e comparação com provedor injetado. Ação inválida, ausência, erro ou timeout retornam fallback interno. Comparação guarda a sugestão, mas mantém uma única ação executável. Provedores falsos são testados; **não existe endpoint, chave, chamada ou cobrança Gemini**. E4 fará autenticação, quota e integração real após E3 garantir o executor financeiro/contratual.

## Verificações executadas

- Suíte completa: **513 testes aprovados / 104 arquivos**.
- Após complemento de auditoria e lock do metadado: **30 testes aprovados / 4 arquivos** (fundação, publicação local, persistência e mercado).
- Build de produção, TypeScript, ESLint e diff-check aprovados.
- Integração GameBoard cobre avanço após resultado, retorno de atleta, preservação da escalação e checkpoint persistido com revisão/data. Suíte geral inclui retomada, universos independentes, emprego, ofertas recebidas e base.
- Migração aditiva aplicada ao projeto Supabase do FutManager. Teste da função em tabela temporária confirmou adoção legada, rejeição de escritor antigo, rejeição de downgrade de revisão/cliente e aceitação do sucessor correto; `cas_checks_passed = true`, com rollback.
- Não foram executados testes concorrentes reais de navegador/múltiplos dispositivos, campanha plurianual ou avaliação Gemini. Os conflitos são cobertos por repositório injetado e pelo teste real da função PostgreSQL, sem manipular dados privados.

## Continuação

A fundação pós-partida pode receber os comandos de E3 sem reintroduzir regra em React. Próxima etapa: caixa/reserva/compromissos, contrato/registro e liquidação comum aos dois lados. Os riscos financeiros e a divergência da venda humana identificados em E1 **não foram declarados corrigidos** por esta extração.
