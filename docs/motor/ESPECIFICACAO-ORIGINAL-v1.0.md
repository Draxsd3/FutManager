# ESPECIFICAÇÃO GERAL DO MOTOR DE SIMULAÇÃO

## Regras, parâmetros e funcionamento do universo do jogo

**Documento-base para implementação pela IA desenvolvedora**\
**Escopo:** motor geral de um jogo de gerenciamento de futebol\
**Versão:** 1.0

------------------------------------------------------------------------

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

# 3. Modelo universal de entidades

O motor não deve depender de nomes ou clubes específicos. Cada entidade
deve ser identificada por um ID único e possuir dados estruturados.

## 3.1. Clube

Parâmetros recomendados:

-   Identificação: ID, nome, nome curto, país, região, cidade, fundação.
-   Identidade esportiva: reputação, prestígio, tradição, rivalidades e
    objetivos.
-   Estrutura: estádio, capacidade, centro de treinamento, base,
    instalações e equipe de apoio.
-   Torcida: tamanho estimado, engajamento, expectativa e impacto no
    ambiente.
-   Esporte: elenco, treinador, comissão, formação preferida, estilo e
    necessidades por posição.
-   Administração: diretoria, política de gestão, nível de
    profissionalização e tolerância a risco.
-   Finanças: caixa, receitas, despesas, dívidas, folha salarial,
    orçamento e compromissos futuros.
-   Mercado: capacidade de atração, política de compra e venda, limite
    salarial e perfil de contratação.
-   Histórico: temporadas, títulos, divisões, resultados, transferências
    e treinadores.

## 3.2. Jogador

Cada jogador deve possuir:

### Identificação e carreira

-   ID, nome, data de nascimento, nacionalidade e local de formação.
-   Clube atual, vínculo contratual, histórico de clubes e temporadas.
-   Posição principal e posições secundárias.
-   Pé dominante, altura e características físicas.

### Atributos técnicos

O conjunto deve ser configurável e suficientemente detalhado para
diferenciar atletas. Exemplos: - Finalização, passe, cruzamento, drible,
domínio, marcação, desarme, cabeceio, posicionamento, visão, técnica e
bolas paradas.

### Atributos físicos

-   Velocidade, aceleração, força, resistência, impulsão, agilidade e
    equilíbrio.

### Atributos mentais

-   Decisão, concentração, coragem, antecipação, compostura, trabalho em
    equipe, liderança e consistência.

### Características individuais

-   Traços de jogo, estilo, preferências táticas e tendências
    comportamentais.

### Potencial e desenvolvimento

-   Potencial estimado e potencial real interno, quando aplicável.
-   Ritmo de evolução, idade esportiva, capacidade de aprendizagem e
    resposta ao treinamento.
-   Potencial não deve garantir evolução: desempenho, treino, saúde,
    oportunidades e contexto influenciam o resultado.

### Personalidade

Cada traço deve ser representado por uma escala configurável, por
exemplo de 0 a 100: - Ambição. - Lealdade. - Profissionalismo. -
Ganância ou prioridade financeira. - Paciência. - Liderança. -
Temperamento. - Adaptabilidade. - Disciplina. - Busca por
protagonismo. - Tolerância à pressão. - Preferência por estabilidade.

### Estado atual

-   Moral, confiança, motivação, felicidade, condição física, fadiga,
    ritmo de jogo, entrosamento e satisfação com o clube.
-   Lesões, suspensões, advertências e restrições médicas.
-   Situação no elenco: titular, rotação, reserva, promessa, fora dos
    planos etc.

Os atributos e traços devem influenciar decisões e desempenho de forma
consistente. Evitar que um único atributo determine sozinho o
comportamento.

## 3.3. Treinador

Parâmetros:

-   Identificação, idade, nacionalidade e histórico profissional.
-   Reputação geral e reputação por país/competição.
-   Experiência, títulos, resultados e histórico de trabalho.
-   Competências táticas, técnicas, motivacionais, de gestão e
    desenvolvimento.
-   Filosofia de jogo, formações preferidas, intensidade, estilo e
    flexibilidade.
-   Capacidade de avaliar jogadores, gerir elenco, desenvolver jovens e
    lidar com pressão.
-   Personalidade, ambição, lealdade, profissionalismo, paciência e
    exigência.
-   Salário, contrato, duração, bônus, cláusulas e situação
    profissional.
-   Relação com diretoria, elenco, torcida e imprensa.

O treinador do usuário deve utilizar o mesmo modelo geral de treinador
dos demais clubes. A diferença é que suas decisões são controladas pelo
usuário.

## 3.4. Empresário/agente

Parâmetros:

-   Identificação, reputação, rede de contatos e carteira de clientes.
-   Especialização por país, posição ou faixa de mercado.
-   Personalidade, agressividade comercial e prioridade financeira.
-   Comissão desejada, capacidade de negociação e influência sobre
    representados.
-   Relação com clubes e histórico de negócios.
-   Objetivos de carreira dos jogadores/treinadores representados.

O empresário influencia, mas não controla automaticamente a decisão do
atleta.

## 3.5. Diretoria e dirigentes

Uma diretoria pode ser representada por um conjunto de dirigentes ou por
um perfil administrativo configurável.

Parâmetros: - Ambição, prudência financeira, paciência, exigência e
tolerância a risco. - Objetivos esportivos e financeiros. - Capacidade
de investimento e horizonte de planejamento. - Influência sobre
contratações, vendas, orçamento e treinador. - Relação com torcida,
patrocinadores e demais dirigentes.

## 3.6. Competição

Parâmetros configuráveis: - Identificação, nome, país, organizador e
temporada. - Formato: pontos corridos, grupos, eliminatória ou formato
híbrido. - Participantes, calendário, número de jogos e mando. -
Pontuação, critérios de desempate e regras de classificação. - Promoção,
rebaixamento, vagas continentais e fases. - Regras de inscrição,
substituições, estrangeiros e elegibilidade. - Premiação, direitos
comerciais e distribuição financeira. - Regulamento disciplinar e
critérios de suspensão.

------------------------------------------------------------------------

# 4. Personalidade, objetivos e tomada de decisão

Todos os agentes autônomos devem possuir um modelo de decisão
contextual.

## 4.1. Componentes da decisão

Cada decisão deve considerar:

1.  Atributos e personalidade do agente.
2.  Objetivos de curto, médio e longo prazo.
3.  Estado atual e histórico.
4.  Recursos e limitações.
5.  Relações com outros agentes.
6.  Oportunidades disponíveis.
7.  Riscos e consequências.
8.  Regras contratuais e regulamentares.

## 4.2. Sistema de avaliação

O motor deve avaliar opções possíveis por uma função de utilidade ou
pontuação ponderada. Exemplo conceitual:

`pontuação_da_opção = soma(peso_do_critério × avaliação_do_critério) - penalidades`

Os pesos variam conforme a personalidade, o contexto e o tipo de
decisão.

Não usar os mesmos pesos para todos os clubes ou jogadores. Um atleta
com prioridade financeira elevada deve dar mais peso ao salário; outro,
com ambição esportiva elevada, pode priorizar disputar títulos ou jogar
em uma liga mais forte.

A escolha final pode incluir uma variação probabilística controlada
entre opções semelhantes. A aleatoriedade não deve permitir que uma
opção claramente inviável vença uma opção muito superior sem
justificativa.

## 4.3. Objetivos e memória

Cada agente deve manter: - Objetivos ativos. - Objetivos concluídos ou
abandonados. - Acontecimentos relevantes. - Histórico de decisões. -
Relações e nível de confiança. - Expectativas e frustrações. -
Compromissos assumidos.

A memória deve ser estruturada em dados, não depender exclusivamente de
texto narrativo.

------------------------------------------------------------------------

# 5. Inteligência artificial dos clubes

Todos os clubes não controlados pelo usuário devem atuar autonomamente
como organizações esportivas.

## 5.1. Planejamento de elenco

Em intervalos configuráveis, cada clube deve: - Avaliar quantidade e
qualidade por posição. - Identificar titulares, reservas, jovens e
jogadores fora dos planos. - Detectar carências e excesso de atletas. -
Projetar aposentadorias, vencimentos de contrato e possíveis saídas. -
Considerar calendário, competições e objetivos. - Definir prioridades de
contratação e desenvolvimento.

## 5.2. Estratégia de gestão

Cada clube deve possuir uma identidade de gestão que influencia
decisões, mas não as determina rigidamente.

Exemplos de tendências: - Formar e vender jovens. - Contratar jogadores
experientes. - Investir em atletas de alto potencial. - Buscar
oportunidades de baixo custo. - Priorizar estabilidade financeira. -
Investir agressivamente para conquistar títulos. - Reconstruir o elenco
após crise.

A estratégia pode mudar por causa de resultados, troca de diretoria,
investimento, crise financeira, rebaixamento ou mudança de treinador.

## 5.3. Ciclo de decisão

Quando uma necessidade surgir, o clube deve:

1.  Detectar o problema.
2.  Avaliar soluções internas.
3.  Consultar orçamento e limites.
4.  Pesquisar o mercado.
5.  Comparar atletas e custos totais.
6.  Priorizar alvos.
7.  Iniciar negociações.
8.  Avaliar alternativas se a negociação falhar.
9.  Atualizar planejamento após a decisão.

Exemplo: ao vender seu centroavante titular, o clube avalia o elenco,
verifica se existe substituto interno e, se necessário, procura atletas
no mercado. Não deve simplesmente vender e ignorar a lacuna.

------------------------------------------------------------------------

# 6. Mercado de transferências

O mercado deve ser um sistema autônomo de oferta e demanda, com
interesses diferentes entre clube vendedor, clube comprador, jogador e
empresário.

## 6.1. Avaliação de mercado

O valor estimado de um jogador deve considerar: - Idade e potencial. -
Atributos e desempenho recente. - Posição e escassez de atletas
semelhantes. - Reputação e demanda. - Duração do contrato. - Salário e
custo total. - Importância para o elenco. - Situação financeira do clube
vendedor. - Interesse do atleta em sair. - Histórico de lesões. -
Condições do mercado e poder de compra dos clubes.

O valor de mercado é uma estimativa, não um preço obrigatório. Cada
clube deve ter sua própria avaliação e preço mínimo aceitável.

## 6.2. Propostas

Uma proposta pode incluir: - Valor fixo. - Parcelamento e datas de
pagamento. - Bônus por jogos, gols, títulos ou metas. - Percentual de
venda futura. - Troca de jogadores. - Empréstimo com opção ou obrigação
de compra. - Condições adicionais permitidas pelo regulamento.

O motor deve verificar a capacidade financeira e a legalidade de cada
proposta.

## 6.3. Decisão do clube vendedor

O vendedor considera: - Valor oferecido versus avaliação interna. -
Importância do jogador. - Existência de substituto. - Momento da
temporada. - Necessidade financeira. - Duração do contrato. - Interesse
do jogador. - Relação entre os clubes. - Risco esportivo de perder o
atleta.

Pode aceitar, recusar, pedir mais, propor condições ou aguardar outras
ofertas.

## 6.4. Decisão do jogador

O jogador deve avaliar: - Salário líquido ou bruto conforme padrão
adotado. - Luvas, bônus e duração. - Papel esperado no elenco. - Chance
real de jogar. - Reputação e ambição do clube. - Nível da competição. -
Possibilidade de títulos. - Localização, adaptação e idioma. -
Estabilidade financeira. - Relação com treinador e clube. -
Personalidade e objetivos pessoais.

O salário deve ter peso relevante, mas não absoluto. Um jogador pode
aceitar menos para atuar em um clube maior ou disputar títulos. Também
pode preferir uma proposta salarial superior de um clube menos
prestigiado.

## 6.5. Negociação real

-   Propostas podem ser recusadas.
-   Clubes podem apresentar contrapropostas.
-   Jogadores podem exigir condições diferentes.
-   Empresários podem solicitar comissão ou melhorar condições.
-   Negociações podem ser interrompidas.
-   Um jogador pode escolher outro clube.
-   Uma proposta não garante contratação.
-   Clubes podem competir pelo mesmo atleta.
-   A negociação deve respeitar janelas e regras de registro.

## 6.6. Concorrência e oportunidades

O mercado deve permitir: - Disputa por jogadores. - Jogadores livres. -
Pré-contratos quando permitidos. - Empréstimos nacionais e
internacionais. - Renovações preventivas. - Jogadores listados para
transferência. - Pedidos de transferência. - Jogadores insatisfeitos. -
Ofertas recebidas sem o clube ter anunciado interesse.

O sistema não deve criar transferências apenas para movimentar o
mercado. Cada negócio precisa ter justificativa esportiva, financeira ou
estratégica.

------------------------------------------------------------------------

# 7. Contratos de jogadores e treinadores

## 7.1. Contratos de jogadores

Campos mínimos: - Data de início e término. - Salário e periodicidade. -
Luvas. - Bônus. - Cláusulas de rescisão, quando aplicáveis. - Opção de
renovação. - Papel prometido no elenco. - Condições especiais. -
Agente/empresário. - Situação de registro.

O motor deve controlar vencimentos, pré-contratos, renovações, rescisões
e consequências de descumprimento.

## 7.2. Renovações

O jogador avalia: - Salário atual e proposta. - Tempo de contrato. -
Importância no elenco. - Projeto esportivo. - Reputação do clube. -
Relação com treinador e diretoria. - Interesse de outros clubes. - Idade
e objetivos de carreira.

O clube avalia: - Importância técnica. - Idade e projeção. - Custo
total. - Limite salarial. - Alternativas no elenco e no mercado. - Risco
de perder o jogador gratuitamente.

## 7.3. Contrato do treinador do usuário

O usuário deve estar submetido às mesmas regras gerais dos demais
treinadores.

O contrato pode incluir: - Salário. - Duração. - Bônus por metas. -
Objetivos esportivos. - Objetivos financeiros ou de desenvolvimento. -
Cláusulas e condições de rescisão. - Expectativas da diretoria.

O treinador pode: - Receber propostas. - Negociar salário e duração. -
Pedir demissão. - Aceitar outro clube. - Recusar propostas. - Ser
demitido. - Ficar sem clube. - Construir reputação e histórico.

## 7.4. Avaliação e demissão

A diretoria avalia o treinador considerando: - Resultados e
desempenho. - Cumprimento de objetivos. - Evolução do elenco. - Situação
financeira. - Relação com jogadores e diretoria. - Expectativa da
torcida. - Reputação e histórico. - Contexto e dificuldade do
calendário.

Uma sequência ruim não deve provocar demissão automática sem contexto.
Paciência, recursos, expectativas e histórico influenciam a decisão.

------------------------------------------------------------------------

# 8. Empresários e agentes

Empresários devem funcionar como agentes com interesses próprios.

Podem: - Buscar clubes para seus representados. - Apresentar jogadores a
equipes. - Solicitar aumento ou renovação. - Recomendar transferência. -
Negociar salários, bônus e comissões. - Influenciar a decisão do
jogador. - Manter relações com clubes. - Priorizar oportunidades
melhores para sua carteira.

A influência do empresário deve depender da personalidade do jogador e
da relação entre ambos. O atleta mantém poder de decisão.

------------------------------------------------------------------------

# 9. Finanças e economia dos clubes

O sistema financeiro precisa ser consistente e impedir dinheiro infinito
ou operações sem lastro.

## 9.1. Receitas

Categorias configuráveis: - Bilheteria. - Sócios e associados. -
Patrocínios. - Direitos de transmissão. - Premiações. -
Transferências. - Produtos e licenciamento. - Receitas comerciais. -
Outras receitas.

## 9.2. Despesas

-   Salários de jogadores.
-   Salários da comissão e funcionários.
-   Encargos e bônus.
-   Parcelas de transferências.
-   Manutenção de estádio e instalações.
-   Viagens e logística.
-   Categorias de base.
-   Departamento médico.
-   Comissões.
-   Juros e dívidas.
-   Outras despesas operacionais.

## 9.3. Orçamento

O motor deve diferenciar: - Caixa disponível. - Orçamento de
transferências. - Limite de folha salarial. - Compromissos futuros. -
Dívidas vencidas e a vencer. - Receitas previstas. - Restrições
financeiras.

Uma contratação deve considerar o custo total, não apenas o valor da
transferência.

## 9.4. Consequências financeiras

Problemas financeiros podem causar: - Redução do orçamento. - Atraso de
pagamentos, se a regra do universo permitir. - Perda de moral e
confiança. - Dificuldade para renovar contratos. - Necessidade de vender
jogadores. - Restrição de inscrições. - Endividamento e juros. - Mudança
na estratégia de gestão.

O motor não deve criar crises financeiras arbitrárias. Elas devem
resultar de receitas, despesas, decisões e eventos justificáveis.

------------------------------------------------------------------------

# 10. Elenco e gestão esportiva

O motor deve acompanhar: - Quantidade de jogadores por posição. -
Hierarquia do elenco. - Titulares e reservas. - Jovens em
desenvolvimento. - Jogadores fora dos planos. - Jogadores emprestados. -
Suspensos e lesionados. - Insatisfação e conflitos. - Necessidades de
reposição.

A composição do elenco deve influenciar decisões de mercado, escalação,
treinamento e finanças.

Promessas de titularidade e papel no elenco devem ser registradas. O
descumprimento pode afetar moral e satisfação.

------------------------------------------------------------------------

# 11. Treinamento e desenvolvimento

A evolução deve ser individual e contextual.

Fatores: - Idade. - Potencial. - Qualidade e intensidade do
treinamento. - Qualidade da estrutura. - Competência da comissão
técnica. - Tempo de jogo. - Motivação e profissionalismo. - Saúde e
fadiga. - Posição e características do atleta. - Consistência e contexto
de carreira.

O desenvolvimento não deve ser linear nem garantido. Jogadores podem
evoluir muito, pouco, estagnar ou regredir.

O treinamento também deve influenciar: - Condição física. -
Entrosamento. - Familiaridade tática. - Ritmo de jogo. - Recuperação. -
Risco de lesão, conforme carga e condição.

------------------------------------------------------------------------

# 12. Condição física, lesões e suspensões

## 12.1. Condição física

Controlar: - Energia/condição. - Fadiga acumulada. - Ritmo de jogo. -
Recuperação. - Carga de treinamento. - Necessidade de descanso.

## 12.2. Lesões

Cada lesão deve possuir: - Tipo. - Gravidade. - Tempo estimado de
recuperação. - Evolução do tratamento. - Risco de recaída. - Possíveis
sequelas. - Impacto temporário ou permanente nos atributos.

Lesões devem considerar idade, histórico, carga, fadiga, contato e
fatores probabilísticos.

## 12.3. Suspensões

Controlar cartões, acúmulo, expulsões, punições e regras específicas de
cada competição. Suspensões devem ser aplicadas apenas às competições e
partidas previstas pelo regulamento.

------------------------------------------------------------------------

# 13. Tática e preparação de partidas

Cada clube deve possuir uma abordagem tática configurável, influenciada
pelo treinador e pelas características do elenco.

Parâmetros possíveis: - Formação. - Estilo de jogo. - Mentalidade. -
Intensidade. - Pressão. - Linha defensiva. - Ritmo e largura. -
Construção de jogo. - Transições. - Marcação. - Bolas paradas. - Funções
e instruções individuais.

A eficácia tática depende de: - Adequação dos jogadores às funções. -
Atributos individuais. - Familiaridade e treinamento. - Entrosamento. -
Condição física. - Qualidade do treinador. - Estratégia adversária.

A formação escolhida não pode ser tratada como garantia de resultado. O
comportamento tático deve produzir vantagens e vulnerabilidades.

------------------------------------------------------------------------

# 14. Simulação de partidas

A partida deve ser simulada por um modelo coerente, com eventos e
estatísticas derivados do desempenho das equipes.

## 14.1. Fatores de desempenho

-   Qualidade individual.
-   Força coletiva.
-   Adequação tática.
-   Entrosamento.
-   Condição física.
-   Moral e confiança.
-   Qualidade do treinador.
-   Mando de campo.
-   Estratégia adversária.
-   Contexto da competição.
-   Eventos durante a partida.

## 14.2. Eventos

O motor pode gerar: - Finalizações. - Gols. - Defesas. - Escanteios. -
Faltas. - Cartões. - Impedimentos. - Lesões. - Substituições. -
Pênaltis. - Disputas e duelos. - Erros individuais.

Cada evento deve ter causa e consequência. Um gol deve resultar de uma
sequência plausível de jogo, e não de uma escolha aleatória
desconectada.

## 14.3. Equilíbrio

-   Favoritos devem ter vantagem estatística, não vitória garantida.
-   Azarões podem vencer.
-   Goleadas devem ser possíveis, mas não frequentes sem justificativa.
-   Resultados precisam refletir qualidade, tática, forma e contexto.
-   Não favorecer artificialmente o clube do usuário.
-   Não manipular resultados para criar drama.
-   Estatísticas da partida devem ser coerentes com os eventos gerados.

## 14.4. Substituições e ajustes

Treinadores controlados pela IA devem avaliar: - Fadiga. - Lesões. -
Cartões. - Desempenho. - Necessidade de resultado. - Adequação tática. -
Opções disponíveis no banco.

As substituições devem respeitar o regulamento da competição.

------------------------------------------------------------------------

# 15. Competições, calendário e temporadas

O motor deve ser independente de formatos específicos.

Cada competição define seu próprio regulamento, calendário e
participantes.

O sistema deve controlar: - Inscrição e elegibilidade. - Rodadas e
confrontos. - Mando de campo. - Classificação. - Critérios de
desempate. - Fases eliminatórias. - Promoção e rebaixamento. - Vagas em
outras competições. - Premiação. - Suspensões por competição. -
Encerramento e histórico da temporada.

O calendário deve considerar: - Datas disponíveis. - Descanso mínimo
configurável. - Conflitos entre competições. - Viagens e logística,
quando simuladas. - Janelas de transferência. - Datas de inscrição. -
Períodos de preparação.

A passagem de temporada deve atualizar divisões, participantes,
contratos, idade, aposentadorias, premiações, objetivos e históricos sem
apagar dados anteriores.

------------------------------------------------------------------------

# 16. Categorias de base e geração de jogadores

O sistema deve conseguir gerar novos jogadores ao longo do tempo,
mantendo a renovação do universo.

Parâmetros: - Idade de entrada. - Nacionalidade e região. - Posição. -
Atributos iniciais. - Potencial. - Personalidade. - Características
físicas. - Capacidade de evolução. - Clube formador. - Histórico de
desenvolvimento.

A geração deve respeitar distribuição plausível de talentos. Não criar
quantidade excessiva de jogadores extraordinários.

Clubes com estrutura de base melhor devem ter vantagens, mas não
garantia de produzir craques.

O motor também deve permitir: - Promoção ao profissional. - Empréstimos
para desenvolvimento. - Evolução em diferentes ambientes. - Dispensar
jovens. - Perder promessas para outros clubes, quando regras permitirem.

------------------------------------------------------------------------

# 17. Carreira, reputação e relações

## 17.1. Jogadores

A carreira deve evoluir por temporadas, com: - Desempenho. -
Transferências. - Títulos. - Prêmios. - Convocações, se o sistema de
seleções existir. - Lesões. - Evolução e declínio. - Mudanças de
papel. - Aposentadoria.

## 17.2. Treinadores

A reputação deve considerar: - Resultados. - Títulos. - Desempenho em
relação às expectativas. - Desenvolvimento de jogadores. - Gestão
financeira, quando relevante. - Experiência e histórico. - Desempenho em
diferentes níveis e competições.

Clubes devem avaliar treinadores conforme suas necessidades, reputação,
estilo e capacidade financeira.

## 17.3. Relações

O motor deve registrar relações relevantes entre: - Jogadores e
treinadores. - Jogadores e diretoria. - Jogadores entre si. -
Treinadores e diretoria. - Empresários e clubes. - Clubes e outros
clubes.

Relações podem influenciar confiança, negociação, ambiente do elenco e
decisões futuras, sem substituir os demais fatores.

------------------------------------------------------------------------

# 18. Notícias e acontecimentos

As notícias devem ser consequência dos eventos reais registrados no
motor.

Exemplos: - Contratação. - Venda. - Renovação. - Pedido de
transferência. - Demissão. - Lesão. - Crise financeira. - Descoberta de
promessa. - Conquista de título. - Rebaixamento. - Aposentadoria. -
Recorde. - Conflito interno.

Cada notícia deve apontar para um evento real e possuir data, entidades
envolvidas e contexto.

A geração textual pode utilizar IA generativa, mas a IA deve receber os
dados do evento e não pode inventar fatos, valores, resultados ou
participantes.

------------------------------------------------------------------------

# 19. Estatísticas e histórico

Registrar dados suficientes para sustentar telas, notícias, recordes e
análises.

## 19.1. Jogadores

-   Jogos, titularidades e minutos.
-   Gols e assistências.
-   Cartões.
-   Lesões e suspensões.
-   Notas ou avaliações de desempenho, se utilizadas.
-   Estatísticas por competição e temporada.
-   Histórico de clubes e contratos.

## 19.2. Clubes

-   Jogos, vitórias, empates e derrotas.
-   Gols marcados e sofridos.
-   Títulos e posições.
-   Histórico por temporada.
-   Transferências.
-   Receitas e despesas.
-   Treinadores.

## 19.3. Treinadores

-   Jogos e aproveitamento.
-   Títulos.
-   Histórico de clubes.
-   Tempo em cada cargo.
-   Metas e avaliações.
-   Contratos e propostas.

As estatísticas devem ser calculadas a partir dos eventos oficiais da
simulação, evitando contadores independentes que possam divergir.

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

# 24. Uso de inteligência artificial generativa

A IA generativa pode auxiliar em: - Redação de notícias. - Textos de
entrevistas. - Comunicados. - Narrativas de acontecimentos. - Descrições
de jogadores e treinadores. - Apresentação de relatórios.

Ela não deve ser a autoridade final para: - Resultado de partidas. -
Cálculo de classificação. - Valores financeiros. - Validade de
contratos. - Regras de transferência. - Elegibilidade. - Estatísticas. -
Evolução de atributos. - Decisões que alterem o estado oficial sem
validação do motor.

Toda saída generativa que será exibida como fato deve ser baseada em
dados reais do estado da simulação.

------------------------------------------------------------------------

# 25. Testes e critérios de qualidade

O motor não deve ser considerado pronto apenas porque o jogo abre ou
porque uma temporada pode ser iniciada.

Deve ser testado em simulações automatizadas de várias temporadas,
inclusive sem interação do usuário.

## 25.1. Testes funcionais

-   Contratação e venda.
-   Renovação e término de contrato.
-   Empréstimo e retorno.
-   Demissão e contratação de treinador.
-   Lesão e recuperação.
-   Suspensão.
-   Promoção e rebaixamento.
-   Encerramento de temporada.
-   Aposentadoria.
-   Geração e evolução de jovens.

## 25.2. Testes de comportamento

-   Clubes com perfis diferentes tomam decisões diferentes.
-   Clubes financeiramente frágeis não gastam como clubes ricos.
-   Jogadores valorizam salário e projeto esportivo de acordo com sua
    personalidade.
-   Jogadores insatisfeitos podem pedir saída.
-   Clubes repõem posições importantes quando possível.
-   Treinadores recebem propostas compatíveis com sua reputação.
-   Diretorias reagem de maneira coerente a resultados e finanças.
-   O mercado não fica artificialmente parado nem movimentado em
    excesso.

## 25.3. Testes de equilíbrio

-   Distribuição de títulos e resultados.
-   Frequência e valores das transferências.
-   Evolução média de jogadores.
-   Idade de aposentadoria.
-   Crescimento e endividamento dos clubes.
-   Folhas salariais.
-   Frequência de lesões.
-   Quantidade de jovens gerados.
-   Estabilidade das competições.

## 25.4. Testes de integridade

-   Nenhum jogador duplicado ou em dois clubes.
-   Nenhum contrato ou transferência em estado inválido.
-   Nenhuma partida duplicada.
-   Nenhuma divergência entre resultados e classificação.
-   Nenhum saldo financeiro inconsistente.
-   Nenhuma estatística divergente dos eventos.

Os testes devem produzir relatórios e permitir identificar a causa dos
problemas.

------------------------------------------------------------------------

# 26. Diretrizes de implementação

A IA desenvolvedora deve:

1.  Analisar a arquitetura atual antes de modificar o projeto.
2.  Identificar quais sistemas já existem e quais estão incompletos.
3.  Mapear entidades, banco de dados, serviços e fluxos existentes.
4.  Preservar funcionalidades e dados válidos.
5.  Evitar duplicar regras ou criar sistemas paralelos.
6.  Implementar a lógica de negócio em módulos reutilizáveis.
7.  Manter parâmetros configuráveis e centralizados.
8.  Criar migrações seguras quando o modelo de dados precisar mudar.
9.  Implementar logs e testes automatizados.
10. Não simular funcionalidades apenas na interface.
11. Não substituir regras reais por valores aleatórios ou textos
    fictícios.
12. Validar o funcionamento com simulações completas.
13. Documentar decisões técnicas e limitações.
14. Não considerar um módulo concluído sem testes de integração com os
    sistemas relacionados.

## 26.1. Compatibilidade com a base atual

O jogo atualmente possui clubes e campeonatos nacionais brasileiros
cadastrados. O trabalho inicial deve aperfeiçoar o motor utilizando esse
universo existente.

Não é objetivo deste documento solicitar o cadastro imediato de outros
países ou clubes.

Entretanto, o motor deve ser preparado para receber novos países, ligas,
clubes e regulamentos futuramente por configuração e dados, sem depender
de alterações estruturais em toda a lógica.

------------------------------------------------------------------------

# 27. Resultado esperado

O resultado deve ser um universo de futebol vivo, persistente e
autônomo.

O usuário deve sentir que: - Os clubes possuem projetos e estratégias
próprias. - Os jogadores têm personalidades e objetivos individuais. -
As negociações são disputadas e imprevisíveis, mas coerentes. - Os
contratos possuem consequências reais. - Os treinadores constroem
carreiras. - As diretorias têm expectativas e limites. - O dinheiro
influencia as decisões. - Os resultados esportivos alteram o futuro dos
clubes. - O mercado continua funcionando sem intervenção do usuário. - O
mundo evolui de temporada em temporada. - As notícias refletem
acontecimentos reais. - Nenhum clube existe apenas para servir de
adversário ao usuário.

**Regra final:** o jogo não deve simular apenas partidas de futebol.
Deve simular o funcionamento de todo o ecossistema profissional do
futebol, no qual cada entidade possui interesses próprios e suas
decisões afetam as demais.
