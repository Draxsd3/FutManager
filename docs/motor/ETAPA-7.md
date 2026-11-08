# E7 — partidas e disciplina: primeiro recorte

## Escopo

Contrato comum de resultados, estatísticas, participação e elegibilidade para partidas assistidas e de fundo. Preserva o motor ao vivo, o arraste livre, a aparência e os universos independentes. **Não é a conclusão de toda a E7 nem início da E8.**

## Contrato e ciclo real

- `SeasonFixture.report`, versão 1, política `matches-v1`: origem `live`/`background`, seed, gols, cartões e suspensões cumpridas. Novos resultados são validados antes da publicação: placar inteiro não negativo, gols/contribuições/cartões conciliados, identidades e adversários válidos, participação de 0–90 minutos, soma por equipe até 990, sem duplicatas de pessoa/equipe e sem jogador inelegível conhecido.
- A partida humana registra os dois elencos por **ID canônico e clube real**, não pelo índice numérico da camisa. O lado `home` do motor é o time controlado; a projeção para o mandante real considera `userIsHome`. IDs numéricos iguais em equipes diferentes não compartilham amarelos nem expulsões.
- Participação encerrada na expulsão; não gera 90 minutos fictícios para o expulso nem reentrada após substituição. Um segundo amarelo registra expulsão sem contar um vermelho como dois eventos de expulsão.
- A prévia CPU e a liquidação usam a mesma força por data/competição e elegibilidade. Condição E6 e suspensões entram também na seleção CPU e na preparação humana. Não se transforma favorito em vencedor garantido. Não é um novo modelo estatístico calibrado nem xG oficial.
- O relatório CPU continua agregado: gols distribuídos entre participantes disponíveis; amarelo com probabilidade interna de 10% e vermelho de 0,2% por participante, deterministicamente. Cartões CPU são fechados aos 90: **não alegamos simulação contextual da expulsão, cronologia real ou redução retroativa da força durante o jogo CPU**. Catálogo incompleto não recebe autores/atletas fictícios para preencher gols.
- Partidas antigas sem relatório continuam válidas; não reconstruir cartões, suspensões, minutos nem eventos passados. Preparação `contractVersion: 1` identifica as novas regras; preparação antiga retomada conserva o contrato anterior. Retomar usa seed, eventos, participantes, substituições e versão salvos, não relógio real.

## Disciplina e substituições

- `automatic-red-only-v1`: vermelho gera uma partida de suspensão **na mesma competição**, cumprida na próxima partida registrada do clube atual. Não depende de o atleta constar no banco. Transferência não apaga a pendência; não contam jogos de outra competição. Perfil exibe texto neutro, sem cápsula/redesign.
- **Não implementados neste recorte:** três amarelos, zeragem por fase, sanção disciplinar judicial, recursos ou regras específicas de todas as federações. Não apresentar esta política reduzida como reprodução integral do Manual CBF.
- Padrão explícito de cinco substituições e três oportunidades, com intervalo fora das oportunidades. Trocas registradas no mesmo minuto contam como uma oportunidade nesta granularidade; é aproximação de interrupção, não arbitragem completa de segundos. Não permite substituir expulso, reentrada, atleta já utilizado ou exceder cinco. Não altera posição por arraste livre.
- A regra IFAB permite ao organizador definir até cinco; **cinco não é obrigação universal**. Prorrogação, abandono por menos de sete atletas e exceções por competição não são implementados por este recorte.
- Fonte primária: [IFAB, aprovação permanente da opção de cinco substituições](https://www.theifab.com/news/the-ifab-permanently-approves-five-substitute-option-in-top-level-competitions/) (13/06/2022). Três oportunidades e intervalo separado. Lei 3 de referência 2026/27: [FA/IFAB](https://www.thefa.com/-/media/files/thefaportal/governance-docs/laws-of-the-game/2026-27/law-3---the-players.ashx).

## Persistência, isolamento e desempenho

- Relatório publicado torna **a fixture inteira imutável**, incluindo identidade, competição, placar, contribuições, eventos e metadados. Comparação local canônica ordena chaves, sem depender da ordem JSON. Guarda inclui temporada ativa e `jobClubSnapshots`; troca de emprego preserva o resultado e rejeita cópia contraditória.
- Migrações aditivas `match_report_guard` e `match_report_index`: valida estrutura/placar/gols e impede remoção/reescrita no SQL. Sem backfill, reset ou novas permissões. O segundo passo indexa as súmulas por ID uma vez por escrita, evitando revarrer todo o array para cada resultado antigo, e recusa IDs contraditórios. Validações semânticas detalhadas de minutos/cartões/participantes permanecem no módulo de domínio; não alegar equivalência integral do SQL com TypeScript.
- O cache de descompactação local passa de quatro entradas com limpeza total para LRU limitado a 64 milhões de caracteres descompactados. Metadados do envelope também são verificados em hits. Leituras públicas continuam clonadas; apenas a guarda interna, somente leitura, pode consultar a cópia em cache sem clonar todo o universo a cada autosave. **Não aumenta a quota local de 5 milhões nem remove CAS/guardas.**
- Antes de E8 arquivar/remover temporadas de outros modos, ampliar os coletores local/SQL. Apagar histórico reportado para permitir rollover não é solução.

## Gemini

A credencial de servidor do Supabase foi configurada diretamente como variável **sensível, somente produção**, na Vercel, após conferir o projeto da URL pública. Nenhum segredo em código, docs, browser ou logs. A chave Google anteriormente mencionada não está disponível nesta sessão/configuração consultada. Faltam chave utilizável, modelo explícito com custo/entitlement verificado e habilitação: **Gemini ainda desligado; nenhuma chamada real efetuada.** Não ativar flag para mascarar falta de credencial nem assumir gratuidade.

Mantidos autorização, revisão/opt-in da carreira, cache, quotas de seis/minuto e 50/dia UTC por conta, circuito e fallback. O piloto E4 pode decidir ações legais de mercado; este recorte não transforma Gemini em árbitro, gerador de placares ou substituto do motor.

## Próximo recorte da E7

Planos derivados dos técnicos E5, substituições CPU contextuais e sua granularidade, disciplina completa por regulamento e reposições/parâmetros pesquisados. Manter instruções e movimentação livre humanas. Só então avaliar fechamento da E7; não iniciar E8 automaticamente.

## Validação

- 622 casos únicos em 117 arquivos exercitados. Execução completa: **620 aprovados, dois timeouts** (estádio/ofertas automáticas) em 1.219,64 s, sem falhas de asserção. Ambos reexecutados no mesmo código de aplicação em processo limpo: **2/2 aprovados**, 131,22 s. Portanto todos os casos passaram em execuções combinadas; **não alegar uma execução monolítica toda verde**.
- 17 casos novos: 15 de súmulas/seleção/disciplina/atomicidade/duplicação/arquivo/codec/isolamento e dois do cache, todos aprovados. Fixture antiga E6 agora herda uma fixture válida com identidade de competição; não enfraquece a validação para acomodar o teste.
- 30 cenários reais do GameBoard aprovados nas execuções combinadas: retomada, intervalo, substituição, empregos, empréstimos, treino/base, isolamento, término mandante/visitante com gols e participação dos dois clubes, bilheteria e ofertas após reload.
- A comparação isolada da E6 sem alterações também excedeu 30 s no intervalo e 60 s em empregos. Prazos de testes de universo completo foram adequados à carga medida; nenhuma asserção, elenco/universo, limite do motor ou quota de armazenamento foi removido/aumentado. O processo longo da UI aproximou-se do heap de 3 GB; dois cenários finais passaram isolados. Não interpretar esta execução como teste de sustentabilidade plurianual E8.
- Duas carreiras completas + avanço de mercado passaram dentro da quota original de 5.000.000 de unidades.
- SQL aplicado e testado com transações/rollback e tabelas temporárias: `match_report_guard_passed`, `indexed_match_guard_passed`, `legacy_and_archive_passed`; lote de 1.000 súmulas sintéticas, cópias idênticas aceitas e alterações/remoções/contradições rejeitadas. Nenhum save privado lido.
- Comandos: `NODE_OPTIONS=--max-old-space-size=3072 npx vitest run --maxWorkers=1 --testTimeout=30000 --reporter=verbose`; reexecução: `npx vitest run src/components/game-board.test.tsx -t 'persists sector prices|receives automatic club offers' --testTimeout=30000`.
- Build de produção Next.js, TypeScript, ESLint e `git diff --check` finais aprovados. Publicação e SHA exato de produção registrados no PR após merge/verificação.
