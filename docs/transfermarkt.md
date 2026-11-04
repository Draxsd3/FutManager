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

Transfermarkt não fornece overall/força, salário mensal em BRL, energia, estrelas ou estatísticas da carreira do FutManager. Preservamos valores anteriores quando há um único nome correspondente no mesmo clube; nos demais usamos defaults explicitamente de simulação. Ausência de camisa/pé/contrato usa o default do jogo, não uma afirmação factual. Não converter EUR para BRL sem taxa datada: `marketValueEur` fica na fonte e o valor BRL do jogo continua simulado. Estatísticas da nova carreira iniciam zeradas.

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
