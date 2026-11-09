# Persistência de histórico e checkpoint ativo

## Contrato implementado

- Páginas de até **256.000 bytes UTF-8**, SHA-256 de `tipo:JSON`, contagem e tamanho conferidos na leitura e no PostgreSQL. Um registro não é dividido. Registro individual excessivo falha sem substituir o checkpoint anterior.
- IDB: `futmanager-history-v1`, chave conta/carreira/hash, payload comprimido; checkpoint ativo continua no índice compatível com os saves existentes. Páginas primeiro, ponteiro por último, sob o mesmo Web Lock/CAS. Uma falha pode deixar uma página não referenciada reutilizável, nunca um ponteiro parcial.
- Nuvem: tabela `career_archive_pages`, RLS por proprietário, sem permissão de UPDATE/DELETE. Upload em lotes de quatro páginas (no máximo ~1 MB bruto por lote); só hashes ausentes são enviados. Publicação RPC mantém os guards existentes de revisão, ancestral, população, treinador e súmulas. Não carregar todas as páginas em memória para sincronizar.
- Ledger: arquivar prefixos completos; conservar os últimos 256 lançamentos após ultrapassar 512. `ledgerCount` mantém a sequência dos ajustes legados, mesmo após recarga.
- Competências fechadas: original integral arquivado, inclusive valor/pagamento já ocorrido. Obrigações não desaparecem: índices por vínculo/pagador mantêm o total ainda devido. Intervalos de alocação atribuem cada centavo dos pagamentos posteriores às competências individuais, na ordem anterior. Episódios totalmente pagos podem sair do índice; um episódio futuro tem outro ID. Pagamentos permanecem no ledger. Competência aberta não é consolidada.
- Histórico de vínculos: integral nas páginas; contratos atuais e recibos de idempotência permanecem ativos.
- Temporadas encerradas: metadados/resumos, hashes de súmulas e referências ficam ativos; partidas completas ficam nas páginas. Ao converter um arquivo legado, guard local compara sua conversão exata; guard SQL reconstrói a temporada e executa as validações preexistentes. Arquivo já frio não é reexpandido em cada autosave; somente quando resultados deixam o calendário ativo durante uma transição.
- Avanço preserva referências aos arquivos anuais imutáveis, em vez de cloná-los junto do estado mutável. Cache IDB separa o universo congelado por hash, gravando só o head nas atualizações seguintes e preservando reparos estruturais com um novo hash.
- Finanças/História oferecem consulta paginada, com até 50 registros visíveis e uma página física carregada por vez. Página indisponível/corrompida é erro explícito, nunca histórico vazio silencioso.

## Compatibilidade e falhas

Nenhum reset/backfill de carreira, aumento do limite de 64 milhões ou mudança no catálogo. Carreiras legadas **legíveis** são compactadas antes das migrações que copiam finanças/população. Saves já corrompidos ou previamente ilegíveis não são reconstruídos com dados inventados. Falhas de IDB/quota, CAS obsoleto, conta errada, hash adulterado e exclusão/reordenação de referências preservam o checkpoint anterior.

Arquivos em `jobClubSnapshots` que ainda participam do calendário/retorno a um clube são estado ativo, não temporadas encerradas; permanecem completos para a lógica de empregos atual. A criação/continuidade de novas temporadas pertence à etapa 2, não é simulada pelo armazenamento.

## Evidências reproduzíveis

- `finance-archive.test.ts`: 24 competências com escassez de caixa e recuperação parcial; comparar todas as contas individuais e disponibilidade contra o motor sem arquivo; conferir todas as linhas de ledger na compactação; reabrir por JSON a cada intervalo; episódio pago seguido de nova dívida.
- `local-pages.test.ts`: contas/carreiras isoladas, conversão de legado, recarga, recusa de remoção de histórico, falha IDB e quota sem publicação/mutação parcial, retry.
- `cloud-pages.sql.test.ts`: PostgreSQL real em WASM (PGlite), executando a migração e CAS anteriores; RLS, hash/tamanho/contagem, ausência de página, imutabilidade, CAS e conversão de arquivo esportivo; temporada previamente fria pode sair do calendário ativo sem perder proteção.
- `scale-checkpoint.test.ts`: **16.248 contratos / 714 clubes / 12 meses financeiros**; avanço, publicação local, recarga a cada mês, leitura/verificação de TODAS as páginas ao final. Primeiro ensaio: 390.410 linhas frias, 80.436.897 bytes históricos, estado financeiro ativo máximo 5.338.957 bytes; 195.690 lançamentos + 194.976 competências preservados (256 lançamentos ainda ativos). Executar novamente após alterações.
- `career-history-browser.test.tsx`: erro/retry e paginação de 50 sem download de outras páginas.

Esses números são um teste de persistência financeira, **não** uma temporada esportiva completa, nem dez temporadas/sementes da etapa 3. A E8 não está encerrada por este documento.
