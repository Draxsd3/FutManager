# Fundação, tempo, integridade e parâmetros

Extração de leitura da especificação original v1.0, capítulos 1, 2, 20, 21, 22, 23. Não significa funcionalidade implementada. O original prevalece em caso de erro de transcrição; a proposta de integração híbrida está em [IA-HIBRIDA](../IA-HIBRIDA.md). Situação real e evidências em [DIAGNOSTICO](../DIAGNOSTICO.md).

# 1. Objetivo e princípio fundamental

Este documento define as regras gerais, os parâmetros e o funcionamento
do motor de simulação do jogo. Ele deve ser tratado como uma
**especificação funcional e técnica**, não como uma sugestão de
funcionalidades.

O motor deve simular um universo de futebol coerente, persistente e
autônomo. O usuário controla um treinador e sua carreira em um clube.
Todos os demais clubes, treinadores, jogadores, empresários, diretorias
e demais agentes do universo devem agir de maneira independente, tomando
decisões de acordo com seus próprios atributos, objetivos, condições e
interesses.

O realismo deve resultar de regras, dados, fórmulas, probabilidades
controladas e decisões consistentes. O motor não pode depender de
acontecimentos aleatórios sem justificativa, nem de uma IA generativa
inventando resultados ou decisões sem respeitar o estado do jogo.

## 1.1. Regras inegociáveis

1.  O mundo continua funcionando mesmo quando o usuário não está
    acompanhando determinado clube, jogador ou competição.
2.  Todos os agentes relevantes possuem objetivos, atributos, limitações
    e memória de acontecimentos.
3.  Toda decisão deve considerar o contexto atual e produzir
    consequências coerentes.
4.  Nenhum agente pode agir fora das regras financeiras, esportivas,
    contratuais e regulamentares configuradas.
5.  O motor deve preservar a continuidade entre dias, janelas,
    temporadas e anos.
6.  Resultados, contratos, transferências, finanças, estatísticas e
    históricos precisam ser persistentes.
7.  O mesmo estado inicial, com a mesma configuração e a mesma semente
    aleatória, deve produzir a mesma simulação. Isso permite reproduzir
    e investigar erros.
8.  A aleatoriedade deve ser controlada, limitada e contextualizada. Ela
    representa incerteza do futebol, não substitui a lógica.
9.  O motor deve ser independente da quantidade de clubes, países ou
    competições cadastrados.
10. Regras específicas de um país ou competição devem ser dados
    configuráveis, não código fixo espalhado pelo sistema.
11. A simulação deve evitar decisões absurdas, como clubes sem recursos
    oferecendo salários incompatíveis, jogadores assinando contratos
    impossíveis ou equipes realizando contratações sem necessidade ou
    planejamento.
12. A interface apenas apresenta e permite controlar o jogo. As regras
    oficiais da simulação devem estar centralizadas no motor, e não
    duplicadas em telas.

------------------------------------------------------------------------

# 2. Arquitetura conceitual do motor

O motor deve ser dividido em sistemas especializados, coordenados por um
**orquestrador central de simulação**.

## 2.1. Orquestrador central

Responsabilidades:

-   Controlar a data e a hora simuladas.
-   Avançar o universo em unidades de tempo definidas.
-   Disparar os sistemas na ordem correta.
-   Processar partidas, treinamentos, contratos, mercado, finanças e
    eventos.
-   Garantir que cada evento seja processado uma única vez.
-   Resolver dependências entre sistemas.
-   Salvar checkpoints e permitir retomada segura.
-   Registrar logs e motivos das decisões importantes.

O orquestrador não deve conter toda a lógica de negócio. Ele coordena
módulos independentes.

## 2.2. Módulos lógicos

O motor deve possuir, no mínimo, os seguintes módulos:

1.  Tempo e calendário.
2.  Universo, países e regras esportivas.
3.  Clubes e administração.
4.  Jogadores e carreira.
5.  Treinadores e carreira profissional.
6.  Diretorias e governança.
7.  Empresários e agentes.
8.  Contratos e registro de atletas.
9.  Mercado e negociações.
10. Finanças e economia.
11. Elencos e planejamento esportivo.
12. Treinamento e desenvolvimento.
13. Condição física, saúde e lesões.
14. Tática e preparação de partidas.
15. Simulação de partidas.
16. Competições e classificação.
17. Categorias de base e geração de novos atletas.
18. Arbitragem, disciplina e regulamentos.
19. Notícias e eventos.
20. Estatísticas, recordes e histórico.
21. Reputação, relações e moral.
22. Persistência, auditoria e integridade dos dados.

Os módulos devem trocar informações por interfaces claras e eventos de
domínio. Evitar dependências circulares e regras duplicadas.

------------------------------------------------------------------------

# 20. Motor de tempo e ciclo de simulação

O tempo deve ser centralizado e controlado pelo orquestrador.

## 20.1. Unidades de processamento

O motor pode processar: - Eventos imediatos. - Horas ou dias. -
Treinamentos. - Recuperação física. - Decisões periódicas dos clubes. -
Rodadas e partidas. - Fechamentos financeiros. - Fim de temporada.

Não é necessário recalcular todos os sistemas a cada instante. Cada
módulo deve possuir frequência de atualização adequada, respeitando
dependências e prazos.

## 20.2. Ordem geral de processamento

A ordem exata deve ser definida tecnicamente, mas precisa respeitar
dependências. Um ciclo diário pode contemplar:

1.  Atualizar data e eventos agendados.
2.  Verificar contratos, prazos e elegibilidade.
3.  Atualizar condição física, recuperação e lesões.
4.  Processar treinamento.
5.  Atualizar moral, satisfação e relações.
6.  Executar decisões de clubes e agentes agendadas.
7.  Processar negociações e respostas.
8.  Atualizar finanças e compromissos.
9.  Verificar partidas e eventos competitivos.
10. Atualizar estatísticas, notícias e histórico.
11. Validar integridade e persistir o estado.

Partidas devem disparar os eventos pós-jogo necessários antes de
decisões que dependam do resultado.

## 20.3. Velocidade e pausa

O usuário deve poder avançar o tempo em velocidades definidas e pausar a
simulação. A pausa deve impedir a execução de novos ciclos, sem perder
eventos já processados.

Eventos importantes podem gerar interrupções configuráveis para decisão
do usuário, como propostas, renovação, lesão ou cobrança da diretoria.

------------------------------------------------------------------------

# 21. Integridade, consistência e prevenção de erros

O motor deve aplicar validações para impedir estados impossíveis.

Exemplos: - Um jogador não pode estar registrado por dois clubes
simultaneamente. - Um jogador não pode atuar se estiver suspenso ou
inelegível. - Um contrato não pode ser utilizado após encerramento sem
renovação ou regra válida. - Uma transferência não pode ser concluída
sem cumprir condições financeiras e regulamentares. - Um clube não pode
escalar jogador que não pertence ao elenco ou não está elegível. - Uma
partida não pode ser processada duas vezes. - Uma rodada não pode ser
encerrada com partidas duplicadas. - Uma competição não pode ter
classificação incompatível com seus resultados. - Uma receita ou despesa
não pode ser contabilizada duas vezes. - Estatísticas precisam
corresponder aos eventos registrados. - Datas e temporadas devem ser
consistentes.

Operações críticas devem ser transacionais: ou todas as alterações
relacionadas são concluídas, ou nenhuma é aplicada parcialmente.

------------------------------------------------------------------------

# 22. Persistência, logs e rastreabilidade

O motor deve salvar: - Estado atual do universo. - Estado dos clubes e
agentes. - Contratos e negociações. - Finanças e lançamentos. -
Calendários e competições. - Resultados e eventos. - Estatísticas e
históricos. - Objetivos e memórias estruturadas. - Configurações e
parâmetros da simulação. - Semente aleatória e versão das regras.

Toda decisão importante da IA deve possuir um registro de auditoria
com: - Agente responsável. - Data. - Contexto considerado. - Opções
avaliadas. - Critérios relevantes. - Decisão tomada. - Consequências.

Isso permite entender por que um clube contratou, vendeu, recusou uma
proposta ou demitiu um treinador.

------------------------------------------------------------------------

# 23. Parâmetros configuráveis e balanceamento

Valores de balanceamento não devem ficar espalhados no código. Devem
existir em configurações centralizadas e versionadas.

Exemplos de parâmetros: - Escalas dos atributos. - Pesos de decisão. -
Frequência de avaliação dos clubes. - Limites de orçamento. - Regras de
fadiga e recuperação. - Probabilidades de lesão. - Taxas de evolução e
declínio. - Influência da idade. - Pesos de reputação. - Fatores de
mando de campo. - Regras de negociação. - Critérios de aposentadoria. -
Parâmetros de geração de jovens.

Cada parâmetro deve possuir: - Nome. - Descrição. - Tipo. - Valor
padrão. - Limites válidos. - Unidade ou escala. - Sistema responsável. -
Impactos conhecidos.

O motor deve permitir ajustar parâmetros sem precisar reescrever os
módulos.

**Importante:** não inventar números definitivos sem testes. Valores
iniciais devem ser calibrados por simulações de várias temporadas e
comparados com comportamentos plausíveis do futebol.

------------------------------------------------------------------------
