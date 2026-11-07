# E6 — identidade, condição, treino e base

## Recorte entregue

Primeiro recorte funcional da E6, integrado ao ciclo real e ao motor headless, sem iniciar E7/E8. Política `players-v1`, aditiva ao checkpoint da carreira. Não altera catálogo/editor, aparência das telas, kits ou importações congeladas. Não consulta API de cadastro durante a carreira. Gemini continua desativado.

### Identidade e informação

- `worldMarket.population` guarda a pessoa por identidade canônica. IDs do catálogo são preservados; jogadores locais antigos usam a mesma chave financeira `local:<save>:<club>:<id>`. A numeração humana e o histórico não são renumerados.
- Promovidos passam a existir na população comum e no banco efetivo de mercado, adversários, contratos e temporadas. A identidade é exclusiva da carreira; não cria registro fictício na API/editor ou chave estrangeira externa.
- O catálogo não fornece personalidade real. Moral, saúde, potencial e decisões de desenvolvimento são **simulados**. O perfil identifica a origem cadastral e explicita que GER/traços são atributos do jogo. O potencial numérico permanece oculto no perfil; não é uma previsão real nem garantia de crescimento.
- Migração preserva energia/GER efetivamente salvos, estatísticas, contratos e base importada. Partidas anteriores à adoção não geram lesões ou cargas retroativas. Clientes incompatíveis não podem apagar identidades canônicas.

### Calendário comum

- Recuperação diária por idade, carga por minutos e posição (laterais mais exigidos, goleiros menos), desgaste etário, moral e evolução usam o mesmo serviço. Humanos usam minutos/energia reais da partida; CPU usa contribuições registradas, sem descontar duas vezes a fadiga humana.
- Desenvolvimento é sorteado deterministamente por pessoa/mês: idade até 27, saúde, energia, prática recente e teto potencial. Máximo de **2 pontos por ano**. Potencial pode nunca ser atingido. Declínio a partir de 32 anos, limitado a 2 pontos/ano e registrado.
- Data de nascimento conhecida determina idade/aniversário. Sem nascimento conhecido, idade original é ancorada na adoção e aumenta em 1 em cada virada civil; não inventamos aniversário.
- Aposentadoria a partir dos 42 na progressão diária, com evento e término do vínculo financeiro. Pessoa, estatísticas e histórico permanecem arquivados; não pode atuar ou aceitar novo vínculo.
- Sorteios são por namespace, pessoa e fixture/mês, não por render ou relógio real. Fixtures são marcadas como processadas. Dividir o calendário em vários avanços não muda a evolução diária/mensal sem intervenções externas.

### Saúde e relações

- Lesões detectadas ao fechar o lote de participações no checkpoint (sem invalidar retroativamente partidas CPU já concluídas): risco base 0,2%, 4% com carga acumulada acima de 150; 10 dias de afastamento. Retorno abre janela de recaída de 14 dias; recaída acrescenta 7 dias ao afastamento. Reabilitação reduz o componente de risco de retorno de 8% para 4%, sem cura instantânea ou bônus repetível por clique. Eventos registram lesão, retorno e recaída.
- Lesionado, suspenso, aposentado e inscrição pendente ficam fora de XI, banco elegível, início da partida e seleção CPU/treino. Esta etapa **consome suspensão datada**, mas não inventa cartões/tribunal; produção disciplinar completa pertence ao recorte de competição/partida.
- Moral é limitada a 0–100 e influencia força humana/CPU com peso pequeno. Compromisso explícito: 180 minutos em 30 dias no clube que prometeu; contabiliza somente participações registradas por esse vínculo. Cumprimento +8, quebra −12; duplicata pendente bloqueada. Tratamento e promessas são comandos revisionados publicados atomicamente. O recorte não finge uma rede social completa nem cria promessas CPU sem decisão registrada.

### Treino e base

- Sessão humana usa data civil, não apenas rodada: cada dia escolhido só pode ser aplicado uma vez e cada pessoa no máximo duas sessões por data. Treino custa/recupera energia como antes; **não concede GER instantâneo**. A prática entra na avaliação mensal limitada. CPU treina leve uma vez por semana civil quando saudável e com energia suficiente, pelo mesmo efeito de carga/energia e desenvolvimento mensal.
- Base nova é fictícia, determinística por carreira/clube/ano, sem fabricar atletas reais a partir de lacunas. Primeiro elenco é materializado sob demanda; virada anual materializa coortes dos clubes brasileiros de divisão nacional, envelhece a base fictícia e acrescenta quatro candidatos/ano às bases existentes (limite 40). Cadastros importados são mantidos, não substituídos por resposta externa.
- Promoção idempotente, contrato de 12 meses a partir da data da carreira, salário e vínculo no mesmo livro financeiro. Requer caixa livre para cobrir um ano de salário; não cria recursos. CPU pode promover até um candidato por clube na rotina anual quando elenco tem menos de 20, usando o mesmo executor financeiro. Base e profissionais continuam separados.
- Política brasileira/nacional do recorte não afirma cobrir divisões estrangeiras ou toda a estrutura multianual de calendários (E8).

## Persistência, concorrência e operação

- População usa codec local `players-dictionary-deflate-v1`; mercado completo, temporada, base e snapshots de clubes também têm codecs próprios. Dicionário reversível de tokens JSON antes de zlib nível 6 (identidades longas repetidas fora da janela de 32 KiB do zlib), dentro da quota original, sem aumentar artificialmente armazenamento. O binário comprimido usa 15 bits por unidade UTF-16 segura (sem controles, aspas ou surrogates), com comprimento/padding validados; isso é exclusivo do índice local. Leitura base64 dos codecs antigos permanece compatível. Nuvem continua recebendo o snapshot JSON íntegro.
- Treino, promoção, tratamento e promessas usam a fronteira CAS/Web Locks já existente; publicação só após escrita durável. Aba atrasada, quota e erro preservam checkpoint anterior.
- Migrações SQL `20261107060000_player_checkpoint_guard.sql` e `20261107060100_player_checkpoint_civil_column.sql` acrescentam validação de versão/relógio, conservação de identidades e revisão para alteração de condição. Não atualiza saves existentes, não amplia permissões e não toca cadastros privados.

## Evidências

Guarda SQL aplicada/testada com `player_guard_passed: true` / `actual_cloud_row_shape_passed: true`, em transação com rollback e tabela temporária. Teste de capacidade usa o universo brasileiro completo/novembro, duas carreiras e avanço de mercado dentro da quota original de 5.000.000 de unidades, sem alterar a configuração do navegador. Validação local final: **605 testes em 115 arquivos**, incluindo os 30 cenários completos de GameBoard; build de produção, TypeScript, ESLint e diff-check aprovados. Produção e revisão de merge registradas no PR desta etapa. Testes de integração de UI com universo completo usam heap de 3 GB e orçamento próprio de 30 s (60 s nos fluxos de vários checkpoints), sem alterar o orçamento dos testes de unidade ou retirar asserções. Fixture pré-reset não contém a população E6 que ainda não existia. A seleção com escudos da main (PR #165) é preservada e seu fluxo é exercitado na regressão de uniformes. Testes específicos cobrem adoção/legado, aniversário/virada, CPU/humano, replay, lesão/retorno/recaída, inelegibilidade, granularidade, teto/declínio/aposentadoria, limites de treino, promoção única, finanças, base importada/anual, promessa por participação, reload, falha e escritor atrasado.

## Limites explícitos

Lesão é resolvida no fechamento do lote de resultados no checkpoint, não uma interrupção clínica minuto a minuto. Não há diagnóstico médico real, perfis psicológicos reais, agentes reais inventados, treinamento individual técnico por atributo, promessa salarial complexa ou calendário mundial multianual completo. Estatísticas preservadas não significam geração retroativa de jogos ausentes. Essas limitações não são apresentadas como implementação completa de todos os subitens futuros do plano.
