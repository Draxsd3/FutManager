# Coleta brasileira recebida em 04/11/2026

As seis partes foram concatenadas, decodificadas e descompactadas em um JSON íntegro (SHA-256 `9c1b260b320159dcf0624e80054e956166105a524867f6a6b71720873934e41e`). A origem registra `generatedAt` em 04/11/2026 e `playerSquadSeason: current`: **os elencos refletem o momento da coleta, não a abertura da temporada de 2026**.

Foram encontrados 156 clubes (20/20/20/96), 4.208 jogadores únicos e 134 treinadores. Uma projeção compacta foi incluída em `src/data/transfermarkt/brasileirao-2026-novembro.json` para o importador existente: participantes, elencos, identidade, posição, idade, nascimento, camisa, pé, contratos, valores em euros, dados de clube/estádio/técnico e conquistas de clube. Não estão incorporados os recursos extensos de histórico, lesões, fotos e outras informações sem integração neste fluxo; o arquivo original completo permanece com o usuário, não é substituído por esta projeção.

A auditoria do importador identifica 69 clubes com elencos válidos e 87 com pendências; 207 jogadores têm campos obrigatórios ausentes ou inválidos (neste arquivo, posição ausente). Há também elencos com menos de 11 jogadores. Nenhum dado ausente foi inventado; a coleta é preparada em staging e não altera o catálogo até a conclusão e confirmação. O fluxo de retomada exige que a API retorne todos os IDs dos jogadores do arquivo para um clube pendente, evitando a exclusão silenciosa de atletas; divergências permanecem como pendência. A API de empréstimos existente consulta a situação em 22/01/2026, não na data dos elencos desta coleta; isso deve ser considerado antes de usar o resultado como retrato de novembro.

A opção **Importar JSON** prepara um arquivo compatível e substitui a coleta em andamento apenas após confirmação. A opção **Consultar API** retoma a coleta preparada e depende de API, autenticação, persistência local e de a fonte preencher os dados pendentes. A conclusão não é garantida. Carreiras salvas e uniformes personalizados não são substituídos. A validade de 24 horas do staging é calculada a partir da preparação, enquanto a data real de coleta é preservada como proveniência.

## Aplicação ao catálogo

Os seis arquivos originais, na ordem recebida, estão em `dados-originais/transfermarkt-2026-11/`. Para reconstruir e verificar o original em ambiente Unix:

```sh
cat dados-originais/transfermarkt-2026-11/parte-*.txt | base64 -d | gzip -dc > coleta.json
sha256sum coleta.json
# 9c1b260b320159dcf0624e80054e956166105a524867f6a6b71720873934e41e
```

Contas novas começam com a projeção incorporada. Contas existentes devem usar **Editar universo → Dados e importação → Atualizar** e confirmar a substituição dos elencos reconhecidos; o salvamento pode ficar pendente de sincronização. Carreiras salvas e uniformes não são atualizados. Os campos não suportados pelo modelo permanecem nos originais, não no catálogo do jogo.

A tentativa de consultar a API neste ambiente falhou por restrição de conexão (SSL_ERROR_SYSCALL); nenhuma posição foi obtida dela nesta execução. As 207 posições ausentes são distribuídas provisoriamente entre as funções menos preenchidas no elenco, sinalizadas como estimadas e corrigíveis no editor. Três clubes têm menos de 11 atletas e outro está sem goleiro mesmo após a estimativa: não foram criados atletas fictícios. Esses quatro elencos precisam de revisão e podem não permitir partidas completas. A ação de coleta ao vivo permanece separada e utiliza a referência de empréstimos de janeiro.

### Sincronização da atualização

O botão Atualizar aguarda a confirmação do salvamento na nuvem e tenta novamente em falhas transitórias. Se a nuvem não confirmar, mantém a cópia local quando possível e informa que é preciso tentar novamente; não declara sucesso. Para implantar, é necessário aplicar também `supabase/migrations/20261105000000_full_catalog_constraints.sql` no projeto Supabase, na ordem das migrations. O esquema anterior rejeita capacidades de estádio desconhecidas e camisas repetidas, ambas presentes na coleta; a migration permite preservar os dados sem omitir jogadores. A migration não é aplicada automaticamente pelo deploy do aplicativo.
