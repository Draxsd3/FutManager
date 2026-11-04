# Modelo inicial da importação nacional — proposta para validação

Data: 04/11/2026. **Modelagem, não execução de carga.**

Este documento delimita a primeira importação e propõe como transformar dados reais em atributos do FutManager. As faixas e métodos de simulação abaixo ainda precisam de calibração em uma prévia antes de virar regra do importador. Nenhuma cotação ou habilidade foi obtida da fonte nesta etapa.

## 1. Escopo fechado da primeira carga

- Temporada de referência: **2026**, mantendo a escolha anterior do usuário.
- Somente equipes profissionais das **Séries A, B, C e D** do Brasil.
- Referência de conferência: A 20, B 20, C 20, D 96 = **156 clubes**. Verificar participantes e contagens na fonte da temporada; divergência bloqueia publicação e exige revisão, não preenchimento com times inventados.
- Importar todos os jogadores do elenco da temporada selecionada, sem corte em 35. A guarda técnica atual de 200 deve rejeitar uma resposta maior, nunca truncá-la.
- Não buscar estaduais, regionais, sub-20, divisões estrangeiras ou outras competições nesta fase.
- Atualizar clubes existentes e criar os ausentes. Não apagar os demais clubes do catálogo legado: não fazer parte da carga não significa autorização para exclusão.
- Não sobrescrever carreiras existentes. A base revisada será disponibilizada para novas carreiras.
- Distinguir **temporada de participação do clube** de **data da coleta do elenco**. Perfil atual não deve ser rotulado como perfil histórico de 2026 sem evidência.

## 2. Dados reais, estimados e ausentes

| Entidade | Dados da fonte, quando disponíveis | Dados de simulação do jogo |
| --- | --- | --- |
| Clube | ID Transfermarkt, nome, país, competição/temporada, estádio, capacidade, técnico | Nível, orçamento inicial, caixa, capacidade de investimento |
| Jogador | ID Transfermarkt, clube, nome, nascimento/idade na data de referência, nacionalidade, posição detalhada, camisa, pé, contrato, valor de mercado EUR | Força/overall, estrelas, qualidades, salário estimado, energia inicial, potencial futuro |

Não inventar nacionalidade, pé, camisa, data contratual, estado ou fundação como se fossem dados oficiais. Campo ausente deve continuar identificado na camada de origem. Quando a interface ou engine exigir um fallback, registrar que é fallback de simulação, separado do dado real.

Gols, assistências e avaliações **da carreira** começam zerados/nulos. Estatísticas históricas, se vierem a ser coletadas, devem ficar em outra camada; não contam como partidas já disputadas na nova carreira.

A API não fornece um overall equivalente ao do FutManager nem salários BRL confiáveis. Preço de mercado não deve ser apresentado como habilidade ou dinheiro disponível no caixa.

## 3. Identidade e atualização

- Cada competição, clube e jogador deve manter seu ID externo e proveniência, além do UUID local por perfil.
- O vínculo precisa sobreviver ao cache, Supabase e próxima sincronização. Nome é dado editável, não chave definitiva.
- Clube já vinculado: conservar UUID local, cores, uniformes e personalizações, a menos que o usuário autorize substituir um campo específico.
- Nome semelhante é candidato para revisão, não autorização para unir homônimos automaticamente. Um mesmo ID externo não pode criar dois times na mesma base.
- Jogador transferido: resolver a identidade e o clube na mesma data de referência, sem duplicá-lo em dois elencos ou confundir um elenco histórico com um atual.
- Em sincronizações posteriores, distinguir valores calculados de edições manuais. Não apagar ajustes manuais silenciosamente.

**Lacuna atual:** o importador ainda usa nome como fallback de correspondência e IDs externos não estão persistidos de ponta a ponta no banco do editor. Resolver isso antes de atualizar toda a base repetidamente.

## 4. Força individual — proposta, não nota oficial

Escala do jogo: **1 a 99**. Para a primeira calibração, trabalhar principalmente no intervalo **35 a 90**, sem atribuir 99 por ser o atleta mais caro da amostra.

| Divisão | Faixa orientativa da maioria dos profissionais |
| --- | --- |
| Série A | 65–85 |
| Série B | 55–75 |
| Série C | 45–65 |
| Série D | 35–60 |

Essas faixas **não são pisos ou tetos obrigatórios por divisão**. Um destaque da B pode superar um reserva da A; um jovem sem experiência da A não recebe força de titular por pertencer ao clube. Contratações e acesso/rebaixamento não devem recalcular a força automaticamente só por trocar de divisão.

### Ordem de construção da nota

1. Se existir uma nota revisada por scout/edição manual, preservá-la, com origem identificada.
2. Para a primeira importação sem nota, usar uma base calibrada pela competição e evidências individuais disponíveis.
3. Usar valor de mercado como **sinal auxiliar**, em escala logarítmica e comparado a jogadores de mesma função. Não aplicar uma relação linear preço → força.
4. Considerar que idade e posição afetam o preço: promessa cara não é necessariamente melhor hoje; veterano ou goleiro barato não é necessariamente fraco. Não penalizar idade duas vezes (via preço e desconto direto na nota).
5. Se houver minutos/participações de uma coleta futura, usar como contexto de experiência e papel, sem tratar ausência desses dados como zero partidas.
6. Fonte sem valor ou detalhes suficientes: produzir nota provisória, indicar baixa confiança e encaminhar à revisão; não zerar nem eliminar o jogador.
7. Atributos de função devem diferenciar goleiros, laterais, zagueiros, meias e atacantes. Não dar a todos as mesmas qualidades genéricas.

**Determinismo:** mesmos dados + mesma versão do modelo = mesma nota. Não sortear novamente em cada sincronização.

**Lacuna atual:** para um atleta novo, o código usa `40 + nível do clube × 2`. Isso pode gerar vários jogadores com a mesma força. É um fallback antigo, **não o modelo final aprovado para a carga nacional**. O cálculo individual precisa substituir esse fallback antes da carga em massa.

## 5. Valor de mercado e finanças

### Valor de mercado

- Conservar `valorOriginalEur`, data do valor/coleta e origem.
- Para o campo BRL do jogo: `valorBrl = valorEur × cotacaoEurBrl`.
- A cotação precisa de valor, data e fonte. Usar uma cotação fixa registrada por lote para que a mesma importação seja reproduzível.
- **Não escolher uma cotação fictícia nem usar EUR como se fosse BRL.** Sem taxa aprovada, conservar EUR e bloquear a conversão factual; qualquer valor necessário à simulação deve estar marcado como estimado.
- Valor ausente é desconhecido, não zero. Uma estimativa, caso necessária, usa força, idade e posição e fica separada do valor real.
- Valor de negociação durante a carreira pode variar por contrato, desempenho e interesse; não alterar o valor de origem para simular uma oferta.

### Salário

Salário mensal em BRL é **estimado** quando não houver fonte específica. Calibrar por força, divisão e papel no elenco; usar idade/contrato apenas como ajustes limitados. Validar a distribuição e a folha do clube, evitando que um jovem caro receba automaticamente salário de estrela.

Não tratar salário atual de simulação como salário real do Transfermarkt. Percentuais, pisos e tetos de salário ainda serão calibrados na prévia, não definidos arbitrariamente nesta etapa.

### Clube

- Força/nível: derivar de uma escalação titular coerente por posição e da profundidade do banco, não só do atleta mais caro nem da média de todos os jovens cadastrados.
- Valor do elenco: soma dos valores individuais conhecidos; registrar cobertura quando faltarem valores.
- Caixa/orçamento inicial: parâmetros de jogo compatíveis com folha e escala do clube, separados do valor de mercado total.
- Prévia deve mostrar folha mensal, custo anual e reserva de caixa sugerida, para evitar clubes insolventes ao começar o jogo.

## 6. Potencial, estrelas e condições iniciais

- Estrelas devem derivar da nota/relevância no modelo, sem serem cópia do preço.
- Potencial, se adicionado, é previsão de jogo, não fato da fonte. Não confundir potencial com força atual.
- Energia inicial: padrão de nova carreira. Lesão real não deve ser inventada; sincronização não deve curar ou zerar condições de um save.
- Não sortear lesão, contrato, nacionalidade ou características pessoais e rotulá-los como importados.
- A primeira versão pode priorizar força, valor e salário; atributos novos que exigirem mudança na engine terão especificação e testes próprios.

## 7. Fluxo de revisão antes da carga em massa

1. Identificar na busca as quatro competições profissionais e validar temporada/participantes.
2. Fazer uma **prévia sem publicação** de um clube por divisão, quando a fonte estiver acessível.
3. Gerar relatório por atleta com: ID, nome, idade, posição, valor EUR, valor BRL/taxa, força proposta, salário proposto, origem/confiança e campos ausentes.
4. Conferir diferenças dentro do mesmo clube, veteranos, goleiros, promessas, atletas sem preço e sobreposição entre divisões.
5. Conferir por clube: total de jogadores, presença de goleiros, preservação acima de 35, média do XI, força por setor, folha e valores.
6. Ajustar e aprovar o modelo/versão. Só depois preparar A/B/C/D completas.
7. Revisar uma prévia integral dos 156 clubes esperados, duplicidades e cobertura dos elencos. Erro de participante, identidade ou elenco incompleto impede a publicação do lote inicial.
8. Fazer backup, publicar uma versão identificada e aplicar pelo botão de Configurações. Reimportar o mesmo lote deve ser idempotente.

A prévia de quatro clubes é uma recomendação para revisão, **não uma carga iniciada ou uma aprovação implícita para publicar dados reais agora**.

## 8. Pendências antes da primeira carga

- Acesso funcional à API: a coleta real anterior falhou no transporte TLS do serviço público.
- Migração Supabase que permite elencos acima de 35: preparada, aplicação remota ainda pendente.
- Persistência de IDs externos e proveniência por campo; política para preservar edições manuais.
- Cálculo individual de força, salário e nível do clube; calibração das faixas propostas.
- Cotação EUR/BRL datada e aprovada para o lote.
- Relatório de prévia comparável e validações da carga integral.

**Resultado desta etapa:** escopo e proposta registrados; nenhum jogador/time novo importado, nenhum snapshot publicado e nenhuma fórmula de produção substituída sem revisão.
