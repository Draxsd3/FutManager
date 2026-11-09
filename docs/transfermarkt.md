# Importação ao vivo no jogo — 2026

Em **Configurações → Transfermarkt → Rodar importação — Séries A/B/C/D**, a aplicação consulta a instância fornecida pelo usuário: `https://transfermarkt-api-umber.vercel.app` (API 5.0.0). Não exige pesquisas manuais, Docker local, aprovação individual de 156 vínculos nem publicação prévia de snapshot.

## Operação

1. Conta autenticada por email/senha. Navegador chama somente `/api/transfermarkt/live`; servidor valida a sessão Supabase e consulta host fixo, sem URL arbitrária ou credenciais de serviço no browser.
2. Manifesto profissional fixo, conferido na pesquisa real da fonte: BRA1/A20, BRA2/B20, BRA3/C20, BRA4/D96. Para cada competição, resolver nome de temporada **2026** pelo endpoint `/seasons`. A fonte atualmente devolve **ID 2025** nas quatro divisões. Não inferir isso para outras temporadas.
3. Conferir membros, contagens e ausência de clube em mais de uma divisão. Buscar perfil e elenco completos de cada membro com o ID de temporada resolvido. Perfil é atual, não um perfil histórico garantido.
4. Progresso na tela, solicitações curtas e sequenciais com intervalo, timeout e três tentativas em erros transitórios. Manter Configurações aberta: **não é worker autônomo**. Pausar/fechar aborta a coleta. IndexedDB guarda a etapa por conta/dispositivo por até 24h; Rodar retoma clubes concluídos. Checkpoint é removido depois de salvar o catálogo.
5. Validação integral (156 clubes, Brasil, IDs únicos, 11–200 jogadores/clube e goleiro). Idade ausente é calculada do nascimento na data da coleta; sem ambos ou posição reconhecida, falha explícita, não elimina jogador silenciosamente. Um erro de clube/jogador é registrado como pendência, sem parar a consulta dos outros clubes. Depois de tentar todos os membros, uma única passagem final tenta novamente os pendentes. Persistindo falhas, um relatório consolidado lista clube e motivo; Rodar retoma somente os clubes ainda não validados. O checkpoint preserva todos os clubes válidos e as pendências, mas não aplica catálogo parcial. Pausar interrompe imediatamente, não é uma pendência de dados. Falha de armazenamento também interrompe.
6. Confirmação final com número de clubes/jogadores antes de aplicar. Preservar UUIDs, cores/uniformes existentes, outros clubes e carreira ativa. Mudanças ficam no catálogo para novas carreiras ao retornar ao menu inicial. Clubes ausentes são criados; clubes novos usam cores da fonte quando disponíveis.

## Dados e modelagem

Identidade externa, nascimento, EUR original e data da coleta ficam em `transfermarkt` no catálogo. UUIDs continuam locais por conta. Vínculo externo tem prioridade sobre nome; fallback só aceita correspondência única por nome normalizado/nome curto. Homônimos ambíguos bloqueiam aplicação. IDs duplicados de atletas entre elencos também bloqueiam.

Modelo **provisório** `provisional-national-v1`: bases A74/B64/C54/D46, variação determinística pelo ID (−6 a +6, apenas diversidade de simulação, não evidência de habilidade), ajuste de idade e sinal logarítmico opcional do mercado, guarda 35–90. Notas anteriores são preservadas. Qualidades variam por função. Salário é estimado pela engine. Valores EUR conhecidos são convertidos com a cotação fixa documentada em [cotação de mercado](cotacao-mercado.md); EUR ausente permanece null e conserva a estimativa em BRL. Fallbacks obrigatórios (contrato/pé/camisa) ficam identificados como estimados. Esse modelo não equivale a scouting calibrado; detalhes conceituais em [modelo inicial](transfermarkt-modelo-inicial.md).

## Banco e limitações verificadas

Para persistir toda a carga **na nuvem**, aplicar as migrações, em ordem:
- `supabase/migrations/20261103235900_complete_imported_squads.sql` — guarda de 200, não 35.
- `supabase/migrations/20261104050000_transfermarkt_origin.sql` — colunas JSONB opcionais de identidade/proveniência.

**Migrações preparadas, não executadas remotamente nesta sessão.** Se o Supabase rejeitar a gravação, a interface informa nuvem pendente; catálogo continua no dispositivo/IndexedDB, não afirma sincronização remota. Não alterar triggers/credenciais por uma rota pública. A persistência remota não é uma transação única: não interpretar erro como sucesso completo na nuvem.

Verificados via consultas reais: quatro listas de temporadas, membros das Séries A/D e perfil/elenco do Flamengo. Testes automatizados cobrem manifesto de 156 clubes com fixtures, retomada, fonte incompleta, idade por nascimento, UUIDs, autenticação, proxy fechado e preservação de carreira. **Não foi executada a carga real completa autenticada na conta do usuário**, nem prometida disponibilidade contínua da fonte. `src/data/transfermarkt-snapshot.json` continua vazio; não é mais usado pelo botão Rodar.

Termos/licenças: a licença MIT do código da API não concede direitos sobre os dados do Transfermarkt. Não contornar bloqueios ou CAPTCHA. Limites/indisponibilidade da fonte são reportados como erro com retomada.

---

## Coletor administrativo/legado

As seções abaixo descrevem o fluxo antigo de snapshot publicado, não o novo botão. O script Python recebe IDs internos em `--season`; não usá-lo com ano de exibição sem resolver a temporada. `/api/transfermarkt` e `prepareTransfermarktSync` permanecem para compatibilidade, mas a UI usa `prepareLiveTransfermarktSync`.

## Referência do modo legado v1 (apenas clubes vinculados)

# Transfermarkt: coleta controlada dos clubes já cadastrados

## API analisada

Fonte: https://github.com/felipeall/transfermarkt-api, commit analisado
`71aa75ecd708e5c8c283c4af5968dd370777b3f8`.
README e modelos `schemas/clubs/{search,profile,players}.py` e `schemas/base.py`.

- Versão 4: FastAPI/Python SDK assíncrono, dados da API JSON interna do Transfermarkt, não uma API oficial/garantida.
- REST retorna **camelCase** (`shirtNumber`, `marketValue`, `updatedAt`); valores ausentes são `null`.
- Descoberta: `GET /clubs/search/{nome}?page_number=1` (10 resultados por página).
- Perfil: `GET /clubs/{id}/profile`; elenco: `GET /clubs/{id}/players`.
  Omitir `season_id` para elenco atual. `--season 2026` pede a temporada específica; não confundir isso com a organização nacional 2026 do jogo, que não será alterada.
- O serviço público `https://transfermarkt-api.fly.dev` é de teste e limitado a 2 requisições/3 segundos/IP. Preferir instância própria para volume (706 clubes, pelo menos 1.412 chamadas só de perfil/elenco).
- 404/422: erro de cadastro/parâmetro; 429: limite do serviço; 502/503/504: resposta inválida/bloqueio/timeout upstream. A coleta usa timeout, espaçamento mínimo 1,6s e até três tentativas para erros transitórios; sem paralelismo agressivo. Cache local de sucesso: 10 minutos.
- `updatedAt` é a data mais antiga da coleta upstream usada na resposta, não a data de transferência do atleta. `fetchedAt` registra a nossa coleta.
- Licença MIT do código **não concede licença sobre os dados**. Verificar termos do Transfermarkt e condições de redistribuição antes de coleta/publicação contínua. Não contornar bloqueios/CAPTCHA nem baixar imagens automaticamente.

## Escopo e segurança

`src/data/brazil-clubs.json` é a lista permitida (706 clubes neste momento).
`scripts/transfermarkt/clubs.json` contém uma entrada por `source`, com nome/estado locais e vínculo pendente. **Nenhum ID foi inventado ou aprovado por semelhança de nome.**

Descoberta registra candidatos; aprovação é manual, conferindo país, estado/cidade e equipe profissional, principalmente América, Nacional, Botafogo, Operário e outros homônimos. Nenhuma busca de competições adiciona clubes ao jogo.

A aplicação valida esquema, ID do clube nas duas respostas, país Brasil, posição reconhecida, idade, ao menos 11 atletas e um goleiro. Rejeita duplicação de IDs de jogadores/clubes, inclusive transferências que deixariam o mesmo jogador em dois elencos. Falha por clube conserva o último elenco bom; não apaga clube em erro, com elenco vazio ou retorno bloqueado. Trocar um vínculo aprovado descarta o snapshot antigo daquele ID. O relatório mostra pendências/erros; nunca tratar execução parcial como sucesso completo.

## Operação

Requer Python 3.10+ (somente biblioteca padrão). Não precisa instalar a API dentro do Next.js. Serviço próprio segue as instruções do repositório da API (SDK requer Python 3.12/3.13).

```bash
# Primeira pesquisa limitada, sem disparar 706 buscas:
npm run transfermarkt:discover -- --club flarj
# Instância própria, se necessário:
TRANSFERMARKT_API_URL=https://sua-api.example npm run transfermarkt:discover -- --club flarj
```

1. Revisar `.cache/transfermarkt/candidates.json` (contém candidatos da primeira página, não toda a busca). Se faltar clube, conferir ID diretamente na fonte; não aprovar resultado aproximado.
2. Em `scripts/transfermarkt/clubs.json`, preencher **apenas após conferir**:
   `transfermarktId` (string numérica), `approved: true`, `evidenceUrl` (URL consultada).
3. Rodar simulação:

```bash
npm run transfermarkt:sync -- --club flarj
# Dados históricos opcionais em outro arquivo, sem misturar temporadas:
npm run transfermarkt:sync -- --season 2026 --output .cache/transfermarkt/2026.json
```

4. Revisar `.cache/transfermarkt/report.json` e `preview.json`.
5. Publicar snapshot local explicitamente:

```bash
npm run transfermarkt:sync -- --club flarj --apply
# Todos os vínculos aprovados (nunca todos os resultados de busca):
npm run transfermarkt:sync -- --apply
npm run transfermarkt:test
npm test
npm run build
```

`--refresh` ignora cache. `--work-dir` muda cache/relatórios. Sem `--apply`, não altera os dados servidos pelo jogo. Em execução parcial com `--apply`, grava os clubes válidos, preserva o último snapshot dos demais e sai com código 2. Revisar antes de commit/deploy. Erros globais/duplicidades impedem publicação. Arquivos de saída são gravados por renomeação atômica. Nunca usar o snapshot de produção como `--output` de descoberta.

## Integração no jogo e saves

`importBrazilDatabase` monta o catálogo existente e chama `applyBundledTransfermarkt`.
`applyTransfermarktSnapshot` é uma função pura: atualiza **somente clubes que já estão no banco fornecido e no catálogo, com o vínculo aprovado**. Conserva ID local, nome, estado, divisão 2026, cores e uniformes. Atualiza estádio/técnico quando informados e elenco validado (limite do jogo: 35, mantendo goleiros). O snapshot preserva o elenco bruto normalizado completo.

Não há consulta externa no navegador, no início da partida ou a cada minuto. O Next.js/Vercel serve apenas o snapshot validado versionado. Não foi aberto endpoint público de importação nem incluída credencial de serviço no cliente.

**Bancos locais/em nuvem já existentes e carreiras em andamento não são migrados automaticamente.** A atualização vale quando o catálogo é importado/inicializado; preservar o banco de cada perfil é intencional. Aplicação futura ao banco do editor deve ser uma ação explícita, com backup, e nunca tocar `CareerProgress`, escalação, lesões, negociações ou jogadores do save. Não há alteração de schema Supabase nesta entrega.

## Dados reais versus simulação

Reais, quando retornados: nome, idade, posição, camisa, pé, contrato, clube, estádio, técnico e valor em **EUR**. Proveniência, IDs externos, valores EUR e datas ficam no snapshot auditável; os IDs locais continuam UUIDs por conta (compatíveis com Supabase).

Transfermarkt não fornece overall/força, salário mensal em BRL, energia, estrelas ou estatísticas da carreira do FutManager. Preservamos valores anteriores quando há um único nome correspondente no mesmo clube; nos demais usamos defaults explicitamente de simulação. Ausência de camisa/pé/contrato usa o default do jogo, não uma afirmação factual. O valor original `marketValueEur` fica na fonte; o valor em BRL é convertido com a taxa fixa datada descrita em [cotação de mercado](cotacao-mercado.md), ou mantido como simulado quando EUR estiver ausente. Estatísticas da nova carreira iniciam zeradas.

## Estado desta entrega

A chamada ao serviço público neste ambiente falhou no transporte TLS; acesso externo aqui é restrito. Assim **nenhum elenco atualizado foi coletado nesta execução**. O snapshot inicial está vazio e o catálogo anterior permanece intacto. Não há dados de testes, exemplos fictícios nem snapshots históricos apresentados como atualizados.

Para efetivar a carga: executar descoberta/revisão/coleta em ambiente com acesso à API (ou instância própria), aprovar os vínculos e versionar o snapshot revisado antes da publicação. É uma dependência operacional pendente, não um erro mascarado como importação concluída.

## Botão nas Configurações

Em **Configurações → Transfermarkt → Sincronizar Transfermarkt**, o usuário pode
aplicar a última coleta **aprovada e publicada** ao catálogo de seu perfil.
`GET /api/transfermarkt` serve apenas dados públicos validados, sem cache e sem
credenciais, consultas externas ou escrita no banco. Não é coleta ao vivo nem
aprova vínculos. A interface explica essa diferença e mostra erro quando ainda
não há snapshot publicado.

O botão bloqueia cliques duplicados, valida a resposta, preserva todos os clubes
não abrangidos e salva nos armazenamentos da conta. Falha da nuvem é apresentada
como sincronização pendente, não como salvamento remoto concluído. O catálogo
carregado pela carreira continua em memória sem alterações; a versão atualizada
fica disponível ao retornar ao menu inicial. Elenco, escalação, negociações e
progresso salvos da carreira não são reimportados.

## Arquivo brasileiro 2026 enviado pelo usuário

`src/data/transfermarkt/brasileirao-2026.json` preserva os 156 clubes e 4.497 jogadores do anexo original. O botão Rodar agora aproveita esse arquivo antes de consultar a API: 74 elencos completos validados (2.222 jogadores) entram no staging; somente os 82 clubes pendentes precisam de consultas adicionais. Não são 82 clubes importados parcialmente: nenhum jogador incompleto é apagado para forçar validação.

Auditoria: 202 jogadores sem posição, 1 sem idade/nascimento; ABECAT com apenas 7 atletas. `/api/transfermarkt/seed?report=1` expõe o relatório de todos os jogadores e clubes pendentes. A data upstream não veio no arquivo e permanece desconhecida; `processedAt` é a data do processamento do anexo, não uma garantia de atualização dos elencos na fonte.

Manifesto/IDs/duplicidades e campos de cada atleta são validados antes de usar o arquivo. Checkpoint existente compatível mantém seus clubes já validados na API e recebe apenas os clubes válidos que faltam no arquivo. Manifesto divergente bloqueia a mesclagem. Sem perfis de clubes no arquivo, não se fabricam estádio, técnico ou cores: valores ausentes continuam nulos na origem.

## Corrigir pendências manualmente

Em **Configurações → Transfermarkt → Corrigir pendências**, pesquise o clube/jogador, veja o nascimento/posição originais e preencha somente os campos desejados. Disponíveis: nascimento **ou** idade, posição, camisa, pé e fim do contrato. Campos vazios mantêm a origem. Salvar valida a prévia e informa novas contagens; depois feche o modal e clique em Rodar para continuar. Remover correção manual restaura a fonte na próxima revalidação.

Os overlays são guardados por conta no IndexedDB **deste dispositivo**, não na API e não no arquivo original. Os campos/data da intervenção acompanham a proveniência do jogador quando o catálogo for aplicado. Não afirmar que o que foi digitado é fato oficial do Transfermarkt. Datas inválidas/futuras ou fora de 14–65 anos, posições desconhecidas, identidades de fora do arquivo e duplicidades são rejeitadas.

O POST do seed só calcula uma prévia com o conjunto de correções enviado; não publica ou grava dados remotamente. A revisão muda quando as correções mudam: o coletor revalida clubes corrigidos e descarta o staging manual removido, sem perder os outros clubes. A lista de edição cobre as pendências do arquivo enviado e intervenções já salvas. Elencos com menos de 11 atletas continuam pendentes de coleta real; corrigir data não completa elenco e não autoriza excluir/jogar fora jogadores.
