# E8 — temporadas e sustentabilidade do universo

## Estado: em implementação, não concluída

Pedido: avançar para a última etapa do motor; **ao terminar, o jogo precisa estar jogável em produção**. Isso exige passagem anual integrada à interface, persistência segura, continuidade econômica/esportiva e evidência de múltiplas temporadas. Build verde, um arquivo novo ou uma simulação isolada não satisfazem esse aceite.

A presente fatia é a infraestrutura de fechamento/arquivo. **Não habilita virada de ano na interface, não foi tratada como E8 entregue e não comprova dez temporadas.** O estado produtivo anterior continua sendo a E7 até a publicação validada dos próximos recortes.

## Primeiro recorte implementado

- `simulation/season-lifecycle.ts`: auditoria de calendário/resultados e comando puro `closeCareerSeason`, com revisão esperada, operação idempotente e evento `season-closed`. Atua em uma nova fotografia; publicação ainda deve usar CAS, como os demais comandos.
- Auditoria recusa IDs duplicados, ano divergente, clubes desconhecidos, partidas pendentes, placares/súmulas inválidos, vencedor de outro confronto, data futura e calendário vazio. Final de copa cancelada não é título nem encerramento válido. Fases eliminatórias precisam de vencedor confirmado.
- Arquivo `seasonHistory[ano]`, contrato `season-archive-v1`: calendário integral preservado, data de fechamento, sumário e títulos derivados dos resultados efetivamente concluídos. Não distribui prêmio financeiro inventado, não muda o relógio e não simula uma partida humana automaticamente.
- `assertMatchHistory` passa a coletar súmulas também no arquivo anual. A guarda preserva **o arquivo inteiro**, inclusive resultados legados sem súmula, sumário e títulos: não permite apagar ou alterar o arquivo para fazer a virada passar.
- Codec aditivo para o histórico, com leitores anteriores, quota original e limites de descompactação preservados. Não é evidência de que dez temporadas do universo completo cabem nesse formato; orçamento/persistência fria precisam ser validados antes de habilitar o fluxo anual.
- `createCareerSeason(..., "domestic-world")` permite calendário brasileiro completo explícito. O padrão continua `career`, compatível com a E7. O sumário mostra clubes nacionais ausentes, sem apresentar um calendário da carreira como universo inteiro simulado.
- Migração **preparada, ainda não aplicada**: `20261107080000_season_archive_guard.sql`. Amplia os coletores SQL (ativo, snapshots de emprego, arquivos anuais) e protege todo o arquivo. Não reescreve migrações aplicadas nem faz backfill/reset. Exige probe transacional antes de aplicação.

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
- **Teste de dez temporadas, probe/aplicação SQL e smoke da virada em produção ainda não executados.** Esta infraestrutura não constitui entrega funcional da E8.
