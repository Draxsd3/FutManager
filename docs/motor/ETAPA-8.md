# E8 — temporadas e sustentabilidade do universo

## Estado: em implementação, não concluída

Pedido: avançar para a última etapa do motor; **ao terminar, o jogo precisa estar jogável em produção**. Isso exige passagem anual integrada à interface, persistência segura, continuidade econômica/esportiva e evidência de múltiplas temporadas. Build verde, um arquivo novo ou uma simulação isolada não satisfazem esse aceite.

O recorte publicado é a infraestrutura de fechamento/arquivo. O recorte atual na branch da sessão acrescenta a virada anual na interface e correções de competições; **ainda não é E8 entregue e não comprova dez temporadas sustentáveis.** A infraestrutura foi publicada pela PR #173, merge `61de117295fe39022719d2efa31b63f8ed6422f7`, com produção Vercel READY/PROMOTED. Isso não significa entrega do ciclo anual.

## Primeiro recorte implementado

- `simulation/season-lifecycle.ts`: auditoria de calendário/resultados e comando puro `closeCareerSeason`, com revisão esperada, operação idempotente e evento `season-closed`. Atua em uma nova fotografia; publicação ainda deve usar CAS, como os demais comandos.
- Auditoria recusa IDs duplicados, ano divergente, clubes desconhecidos, partidas pendentes, placares/súmulas inválidos, vencedor de outro confronto, data futura e calendário vazio. Final de copa cancelada não é título nem encerramento válido. Fases eliminatórias precisam de vencedor confirmado.
- Arquivo `seasonHistory[ano]`, contrato `season-archive-v1`: calendário integral preservado, data de fechamento, sumário e títulos derivados dos resultados efetivamente concluídos. Não distribui prêmio financeiro inventado, não muda o relógio e não simula uma partida humana automaticamente.
- `assertMatchHistory` passa a coletar súmulas também no arquivo anual. A guarda preserva **o arquivo inteiro**, inclusive resultados legados sem súmula, sumário e títulos: não permite apagar ou alterar o arquivo para fazer a virada passar.
- Codec aditivo para o histórico, com leitores anteriores, quota original e limites de descompactação preservados. Não é evidência de que dez temporadas do universo completo cabem nesse formato; orçamento/persistência fria precisam ser validados antes de habilitar o fluxo anual.
- `createCareerSeason(..., "domestic-world")` permite calendário brasileiro completo explícito. O padrão continua `career`, compatível com a E7. O sumário mostra clubes nacionais ausentes, sem apresentar um calendário da carreira como universo inteiro simulado.
- Migração **aplicada em produção**: fonte `20261107080000_season_archive_guard.sql`, registrada remotamente como `20261109151600 season_archive_guard`. Amplia os coletores SQL (ativo, snapshots de emprego, arquivos anuais) e protege todo o arquivo. Aplicação atômica com assertions sintéticas; sem backfill/reset ou acesso a saves privados. Não reaplicar nem reescrever a migração.

## Bloqueios observados no código real

1. O calendário persistido por padrão filtra a liga/estadual do treinador e a copa. Não pode ser usado sozinho para afirmar acessos/rebaixamentos de todas as divisões.
2. A copa genérica monta rodadas futuras como projeção e cancela o caminho do humano eliminado. Sem propagação de confrontos pelos vencedores efetivos, uma final pode ficar cancelada. A auditoria nova impede transformar esse estado em campeão/ano concluído.
3. Ainda não existe comando anual integrado que encadeie fechamento, inscrições, movimentos de divisão, finanças/contratos/loans, população/base, calendário novo e checkpoint único.
4. Continuidade econômica e de elenco precisa de testes longos: salários/expiração/aposentadoria sem receitas e recomposição sustentáveis não equivalem a jogo jogável por dez anos. Não adicionar saldo, renovação ou jogadores arbitrários para fazer teste passar.
5. Histórico integral não pode gerar crescimento ilimitado, travamento a cada autosave ou aumento artificial de quota. Validar arquivamento/consulta sem apagar partidas.

## Próximos recortes e critério de liberação

- Resolver competições CPU e confrontos pendentes sem reescrever fixtures já publicadas; preservar controle humano até a eliminação/finalização real.
- Fonte/configuração explícita de inscrições/vagas/movimentos brasileiros; projeções futuras identificadas, não anunciadas como regulamento oficial de 2027 em diante. Preservar universos congelados e empregos anteriores.
- Comando anual idempotente/CAS integrado ao hub, com transição atômica e retomada após falha/reload. Não deixar o jogador preso em “temporada encerrada”.
- Processar economia, contratos, mercado, treinadores, envelhecimento, lesões e base por calendário, sem benefícios exclusivos ao humano. Não ocultar insolvência ou reposição insuficiente.
- Executar **dez temporadas com múltiplas sementes** pelo domínio real, registrando por ano: caixa/folha, negócios, vagas/participantes, idade/população, lesões, resultados e violações. Acrescentar regressão de armazenamento e arquivo, reload, duplicação, falha de publicação e carreira com troca de clube/desemprego.
- Smoke de produção: criar/continuar carreira, escalação/partida, resultado, avanço, encerramento, nova temporada e recarga; verificar o SHA exato publicado após PR/merge. Não fazer smoke destrutivo sobre saves reais de usuários.
- Registrar limites remanescentes com precisão. Gemini continua OFF; não ativar serviço pago para encobrir lacunas do domínio.

## Evidência desta fatia

- Regressão fora GameBoard: **631 testes/119 arquivos aprovados**, 167,13 s (incluía nove novos casos do fechamento).
- Suíte específica final: **11/11 aprovados**, acrescentando falha de quota sem perda do checkpoint e publicação CAS com rejeição do segundo escritor atrasado. Total fora UI: 633 casos únicos em execuções combinadas; não afirmar uma rodada monolítica dos 633.
- Integração GameBoard: **3/3 aprovados**, 61,49 s — autosave/retomada e término mandante/visitante com bilheteria. Os demais 28 casos de UI não foram reexecutados nesta fatia.
- TypeScript final, ESLint, build Next.js e `git diff --check` aprovados. Não se usou o QA histórico da E7 como prova destes arquivos.
- **Teste de dez temporadas e smoke da virada em produção ainda não executados.** Esta infraestrutura não constitui entrega funcional da E8.

## Ativação segura de produção — após PR #173

- Pedido: “habilite tudo o que for necessário para colocar o jogo em produção”. Ativada a guarda SQL pendente, sem liberar fluxos anuais incompletos nem serviços pagos.
- Probe reproduzível: `supabase/tests/season_archive_guard.sql`, `BEGIN`/`ROLLBACK`, apenas tabela temporária acionando a função instalada. Resultado: `season_archive_guard_passed`, três linhas sintéticas. Exercita políticas moderna/antiga, legado sem súmula, transferência para arquivo, cópia em snapshot de emprego, atualização não relacionada, rejeição de remoção/mutação de arquivo, proprietário inválido, array inválido e política não suportada; escrita rejeitada não modifica o estado. Não constitui smoke de save real ou da interface.
- RLS e trigger `game_save_match_report_checkpoint` confirmados ativos. Auth e banco saudáveis. REST apresentou falha em uma consulta de saúde e retornou `ACTIVE_HEALTHY` na rechecagem, sem intervenção; causa não determinada.
- Produção da PR #173 reconfirmada: deployment `dpl_5tXYpUhZ2KXXotjEMiQKg8pKCicg`, SHA `61de117295fe39022719d2efa31b63f8ed6422f7`, READY/PROMOTED, sem erro de alias.
- Gemini permanece OFF, sem credencial utilizável verificada. Não alterar autenticação, desabilitar RLS ou inventar credenciais para alegar prontidão.
- A ativação SQL não resolve os bloqueios acima. E8 continua incompleta; liberação funcional anual depende de implementação e aceite, não de uma flag de infraestrutura.

## Recorte atual — fluxo anual e competições (ainda sem aceite E8)

Pedido reforçado pelo usuário: **FINALIZAR a etapa 8 completamente, sem deixar remendos ou pendências disfarçadas**. Não apagar saves, arquivos, testes ou evidências de falha para aparentar conclusão.

### Implementado na branch da sessão

- Copa genérica agora tem ligações explícitas entre confrontos (`cupHomeSource`/`cupAwaySource`). O vencedor real ocupa o próximo confronto, mesmo após eliminar o humano; não cancela o campeonato nem simula resultados privados para projetar vencedores. Recuperação de feeders legados pelos IDs estáveis evita ressuscitar o humano em rodadas posteriores. Resultados publicados não são reescritos.
- `settleSeasonThrough`: conclui partidas CPU datadas pelo mesmo executor de resultado/súmula/disciplina, interrompendo antes de partida humana disponível. O driver headless, somente no teste, assume deliberadamente todos os clubes.
- `completeDomesticCalendar`: mantém datas/resultados existentes e procura datas adicionais para os compromissos sem data, reservando os possíveis classificados da chave. Cada complemento é marcado **projection**, não tabela oficial da CBF. Não cancela jogos impossíveis para passar na auditoria. A Agenda diferencia projeção de jogo ainda sem data.
- Novas carreiras da interface adotam `domestic-world`. Carreira legada pode arquivar seu calendário parcial sem inventar resultados de competições ausentes; o calendário seguinte adota o mundo doméstico completo. O construtor puro mantém o padrão anterior para seus consumidores legados.
- `transitionCareerSeason`: valida revisão/data/partida em andamento, conclui CPU restante ou devolve a próxima partida humana, audita/arquiva, processa o calendário civil até janeiro e cria a próxima temporada. A interface publica o snapshot inteiro sob CAS antes de exibir o novo ano. Falha de gravação conserva o checkpoint anterior.
- Overlay `worldMarket.divisions` preserva o catálogo congelado e o editor. Trocas futuras entre divisões usam uma **política projetada do jogo**, conservando o tamanho de cada divisão; D usa os acessos efetivamente apurados quando disponíveis. Grupos futuros da D com 96 clubes vêm das divisões da carreira, não da ressurreição da lista de 2026. Não é implementação de todas as vagas estaduais/regionais, nem certificação de regulamento futuro.
- `seasonHistory` agora faz parte do estado reconstruído/autosave do GameBoard, inclusive reload e ações financeiras. Fluxo de desemprego encaminha o cruzamento anual ao mesmo comando, em vez de deixar a temporada ativa num ano anterior.
- Resultados CPU restantes passam também pela rotina idempotente de receitas/mercado dos técnicos quando o humano está empregado. Mantém a política econômica existente, sem crédito de fechamento ou saldo inventado.
- Projeção financeira em lote, equivalente à consulta individual, evita varrer todo o livro para cada plano CPU. Liquidação continua revalidando caixa/reservas individualmente, sem cache sobre agregados mutáveis e sem flexibilizar compromissos.

### Evidência e limites da execução

- Calendário do universo brasileiro real: **2.463 partidas concluídas, zero pendências de auditoria, zero clubes nacionais ausentes**, pelo executor real. É teste esportivo de uma temporada, **não** prova econômica de dez anos.
- Integração anual GameBoard: passagem pelo hub, arquivo após reload/autosave e falha de quota sem publicação parcial aprovados (2 casos). Autosave/retomada de partida existente aprovado isoladamente (1 caso, 30 restantes desse arquivo não reexecutados nesta rodada).
- Regressão intermediária fora `game-board.test.tsx`: **640/640, 121 arquivos**, 197,13 s. Após alterações finais, suítes específicas de domínio, finanças, técnicos, forecast, Agenda e integração anual foram reexecutadas. Registrar a rodada integral final separadamente quando concluída; não somar execuções sobrepostas como testes novos.
- A primeira execução conjunta de integração pesada e diagnóstico plurianual pressionou a RAM de 4 GB; processos foram interrompidos, sem qualquer execução sobre dados de usuários. A integração isolada passou. O diagnóstico passou a ter comando/configuração próprios; não confundir interrupção por recursos com resultado aprovado.
- `npm run test:seasons`: auditoria separada, duas seeds fixas, dez anos por padrão, métricas anuais de resultados/caixa/folha/obrigações/vínculos/população/idade/lesões/slots de elenco e tamanho do save, usando os serviços reais. Exige calendário íntegro, elencos nacionais jogáveis, ausência de salários vencidos sem cobertura, reload e quota inalterada. `E8_YEARS=1` é somente diagnóstico reduzido, nunca aceite de dez anos. `E8_REPORT` pode apontar para relatório JSONL fora do Git.
- **Aceite ainda bloqueado:** auditoria plurianual completa/sustentável e orçamento de armazenamento não aprovados; política completa de inscrições estaduais/regionais e reposição econômica/contratual ainda não entregues. Não publicar como E8 finalizada apenas pelos testes acima. Não aumentar quota, cancelar final, apagar histórico, renovar sem cobertura ou gerar dinheiro/jogadores para mascarar falhas.

### Falha concreta do diagnóstico longo

Uma execução isolada reduzida (`E8_YEARS=1`, seed terminada em `0011`, heap de 2.048 MB) abortou por **JavaScript heap out of memory**, após 761 s, antes de processar dezembro de 2026. Não produziu um ano aprovado, tampouco dez anos. Esta execução começou antes das otimizações finais da projeção em lote; é diagnóstico da falha observada, não resultado do código final otimizado. A configuração mantém os limites de save/descompactação originais. A rechecagem da versão otimizada deve ser registrada pelo resultado real, sem converter uma tentativa em aprovação.

Na rechecagem com forecast em lote, o livro `managerMarket` chegou a **66.245.076 caracteres em março** e **89.710.074 em abril**, acima do limite de leitura de 64.000.000. O diagnóstico foi interrompido antes de iniciar nova pressão de memória; não aprovou o ano. Evidência sintética resumida em `relatorios/e8-diagnostico.json`.

Foi encontrado também um risco de persistência: o encoder antigo podia escrever um agregado que o decoder recusaria por tamanho. O encoder agora valida o mesmo limite **antes** de substituir o save legível, inclusive o tamanho UTF-8 do payload. É falha fechada, não aumento de quota nem solução fictícia do armazenamento longo. Arquivamento frio/paginado do livro e dos resultados ainda precisa de implementação e validação para concluir a etapa.

### QA final do recorte (não aceite E8)
- Regressão integral padrão fora do arquivo pesado `game-board.test.tsx`: **645/645, 123 arquivos, 154,97 s**. Inclui as duas integrações anuais novas; não inclui a auditoria longa, cuja configuração é separada e não foi aprovada.
- Build Next.js de produção, TypeScript, lint dos arquivos alterados e diff-check aprovados. Retomada de partida do arquivo pesado passou isoladamente; 30 casos restantes desse arquivo não foram reexecutados nesta rodada.
- Proteção do encoder separada na PR #177, merge `9fa3c4df8d64fcda65b9da19670a0a72e525a69f`. O fluxo anual/CPU deste recorte permanece separado da produção enquanto não houver aceite de sustentabilidade/armazenamento.

### Publicação desta execução
- PR #177: **somente proteção do encoder**, produção `dpl_2rdMrhNjiN1H99DorKxvC6Qk2rDL`, SHA `9fa3c4df8d64fcda65b9da19670a0a72e525a69f`, READY/PROMOTED, sem erro de alias.
- PR #178: fluxo anual/copa/diagnósticos em **draft**, não promovido. Preserva a atualização de mercado da PR #175 integrada da main. Após essa integração, 54/54 casos em sete arquivos relevantes, tipos/lint/diff-check aprovados. O build local registrado acima antecede essa integração; o build do preview deve ser tratado separadamente. Nenhum smoke de virada anual em produção alegado.
