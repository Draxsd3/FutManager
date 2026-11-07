# Entidades, personalidade e relações

Extração de leitura da especificação original v1.0, capítulos 3, 4, 17. Não significa funcionalidade implementada. O original prevalece em caso de erro de transcrição; a proposta de integração híbrida está em [IA-HIBRIDA](../IA-HIBRIDA.md). Situação real e evidências em [DIAGNOSTICO](../DIAGNOSTICO.md).

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
