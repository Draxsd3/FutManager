# Tática, partidas, calendário e competições

Extração de leitura da especificação original v1.0, capítulos 13, 14, 15. Não significa funcionalidade implementada. O original prevalece em caso de erro de transcrição; a proposta de integração híbrida está em [IA-HIBRIDA](../IA-HIBRIDA.md). Situação real e evidências em [DIAGNOSTICO](../DIAGNOSTICO.md).

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
