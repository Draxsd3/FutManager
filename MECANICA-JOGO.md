# MECÂNICA-JOGO — referência de futebol e regras da simulação

**Objetivo:** orientar o desenvolvimento do motor e das decisões de carreira do FutManager com base nas regras do futebol e em princípios táticos observáveis. Esta é uma referência de projeto, não uma afirmação de que todas as mecânicas descritas já estão implementadas.

**Fontes consultadas:** Leis do Jogo da IFAB e análises técnicas da FIFA, consultadas em 29/10/2026. As regras podem mudar entre temporadas; regras de competição também variam. Antes de implementar um torneio específico, conferir o regulamento vigente dessa competição.

## 1. Princípios para interpretar este documento

1. **Separar lei, regulamento e modelo de jogo.** As Leis da IFAB definem o futebol; cada competição define formatos e algumas opções; o FutManager escolhe como simplificar a simulação.
2. **Não apresentar uma simplificação como regra oficial.** Ex.: cinco substituições são permitidas quando adotadas pelo regulamento aplicável; não se deve presumir a mesma quantidade, janelas ou procedimentos para todo torneio.
3. **Decisões do jogador devem ter consequências legíveis e equilibradas.** Tática, escalação, condição física e substituições precisam influenciar a partida por mecanismos consistentes, com vantagens e custos — não por bônus ocultos sem explicação.
4. **Uma partida tem várias soluções táticas válidas.** Não há uma formação ou estilo universalmente vencedor. O resultado deve emergir da interação entre equipes, contexto e acaso controlado.
5. **Dados e narrativa precisam concordar.** O mesmo evento deve explicar placar, estatísticas, comentário, minicampo e relatório final. Não criar estatísticas ou fatos de jogo que não vieram do motor.
6. **Preservar as decisões próprias do FutManager.** O centro tático mantém posicionamento livre, sem bloqueio por posição ou encaixe obrigatório. A função mais próxima do esquema pode informar a adaptação do atleta, mas não restringe onde o jogador pode ser colocado.

## 2. Regras oficiais que afetam uma partida

### Jogadores e duração

- Uma partida começa com até 11 atletas por equipe, incluindo um goleiro. Pela regra geral, não pode começar ou continuar se uma equipe tiver menos de sete jogadores, ressalvados os protocolos específicos das Leis.
- O tempo normal é dividido em dois tempos iguais de 45 minutos. O árbitro acrescenta o tempo perdido em cada etapa; o intervalo não pode exceder 15 minutos.
- O pontapé inicial começa cada tempo e reinicia o jogo depois de um gol. Em disputa eliminatória, prorrogação e disputa por pênaltis só devem ser usadas quando o regulamento da competição exigir.
- Um empate não significa automaticamente disputa por pênaltis. Em liga, o resultado pode permanecer empatado; em mata-mata, deve-se seguir o regulamento.

### Substituições

- Configurar o limite por competição. Nas competições oficiais que adotam até cinco substituições, a regra prevê três oportunidades durante o jogo e permite substituições no intervalo sem consumir uma dessas oportunidades.
- Regras de prorrogação, substituição adicional por concussão, retornos de atletas e protocolos de tempo limitado dependem das disposições aplicáveis. Não os aplicar globalmente sem configurar o torneio.
- No fluxo do jogo, contar separadamente atletas substituídos e oportunidades utilizadas. Várias substituições na mesma interrupção podem contar como uma oportunidade, conforme o regulamento.
- Uma substituição confirmada altera o elenco em campo e o histórico do jogo; cancelar a escolha não deve consumir substituição.

### Impedimento

- Estar em posição de impedimento não é, por si só, infração. A posição é avaliada no instante em que um companheiro joga ou toca a bola.
- A infração depende de participação ativa: jogar/tocar a bola, interferir com adversário ou obter vantagem nos casos previstos na Lei 11.
- Não aplicar a regra a recebimentos diretos de tiro de meta, arremesso lateral ou escanteio. Uma implementação completa deve avaliar linha da bola, segundo último adversário, metade adversária e participação — não apenas comparar uma coordenada do atacante.

### Faltas e disciplina

- Uma falta pode levar a tiro livre direto ou indireto, pênalti quando a infração direta ocorre na própria área penal, ou a outro reinício definido pelas Leis.
- A natureza da ação importa: uma disputa descuidada não exige cartão; ação temerária pode exigir amarelo; força excessiva pode exigir expulsão.
- A expulsão reduz o número de atletas da equipe: o substituto não entra no lugar do expulso. O motor deve impedir escalações inválidas e considerar a inferioridade numérica depois do cartão vermelho.
- Cartões e reinícios precisam ser eventos reais do motor e refletidos no placar de ocorrências e relatório. Não mostrar cartão aleatório sem uma infração correspondente.

## 3. Como entender a tática

A formação é uma referência inicial de ocupação do espaço, não uma posição fixa durante os 90 minutos. A equipe muda de forma conforme tem a bola, defende e transita entre essas situações. Para projetar o motor, considerar quatro momentos:

1. **Com a bola:** oferecer linhas de passe, progredir por dentro, por fora ou sobre a pressão, criar largura e profundidade, entrar na área e proteger-se contra o contra-ataque.
2. **Sem a bola:** proteger o gol e os espaços centrais, manter cobertura e compactação, decidir quando pressionar e quando recuar.
3. **Transição para o ataque:** após recuperar a bola, avaliar se há espaço para avançar rapidamente ou se é melhor conservar a posse e reorganizar.
4. **Transição para a defesa:** após perder a bola, pressionar em conjunto para recuperar ou atrasar o ataque rival, enquanto os demais protegem espaços perigosos.

### Instruções devem ter trocas compreensíveis

- **Pressão alta:** pode recuperar a bola mais perto do gol adversário e gerar ataques rápidos; requer coordenação e energia, e pode deixar espaço atrás da linha de pressão.
- **Bloco médio/baixo e defesa compacta:** tende a proteger o espaço e reduzir a progressão central do adversário, podendo ceder posse e depender de transições para atacar.
- **Ataque pelos lados ou pelo centro:** muda onde a equipe tenta progredir e quem participa das jogadas; não garante cruzamentos ou chances automaticamente.
- **Ritmo e risco de passe:** podem aumentar a velocidade de progressão, mas também o risco de perda da bola.
- **Marcação/agressividade:** pode aumentar a disputa e a possibilidade de recuperação, mas deve vir acompanhada de custos coerentes, como faltas e risco disciplinar.
- **Laterais, pontas, meio-campistas, atacantes e goleiro** podem assumir comportamentos diferentes conforme o esquema e a fase. Por exemplo, o goleiro pode participar da saída de bola; laterais podem avançar, dar largura ou entrar no meio; atacantes podem pressionar ou oferecer profundidade.

Nenhuma dessas relações deve ser tratada como determinismo. A FIFA documenta contrapressão, blocos baixos, pressão alta, transições rápidas, rotações pelos lados e participação do goleiro como tendências e soluções diferentes — não como uma única receita vencedora.

## 4. Diretrizes para um motor de partida coerente

### Antes do jogo

O cálculo deve partir de dados realmente disponíveis: escalação, jogadores, atributos cadastrados, energia/condição, posições escolhidas, instruções táticas, adversário, mando e regras da competição. Se uma característica não existe nos dados, não inventar um valor realista aparente; indicar que o modelo está simplificado.

A adaptação à posição serve para estimar o impacto esportivo, não para proibir escalações personalizadas. A composição precisa ser válida segundo o regulamento (por exemplo, o número de atletas), mas o centro tático pode continuar permitindo que o usuário experimente posições livres.

### Durante o jogo

- Simular uma sequência causal: posse e contexto → ação → resultado da ação → próximo estado da partida.
- Usar probabilidades de sucesso condicionadas por atributos relevantes, condição física, posição, pressão, distância/ângulo, cobertura defensiva e qualidade do goleiro, na medida em que esses dados existirem.
- Separar **criação da chance** de **conversão da chance**. Um chute não deve virar gol com a mesma probabilidade independentemente de sua qualidade; a qualidade depende do contexto e não só do overall médio do time.
- Usar o acaso para representar incerteza, mas evitar que ele substitua as decisões táticas. Uma equipe mais forte pode ter vantagem sem vencer sempre.
- Quando uma ação altera posse, placar, cartão, substituição ou reinício, atualizar os dados uma única vez e derivar as telas do mesmo evento.
- As estatísticas devem ser calculadas dos eventos: posse de ações de jogo, finalizações dos chutes, gols dos eventos de gol, desarmes dos eventos de desarme, cartões das sanções e substituições das confirmações.
- Se a partida for salva e retomada, preservar minuto, placar, eventos, escalação, tática e mudanças efetuadas. Retomar pausada para não avançar o relógio sem decisão do jogador.

### Depois do jogo e na competição

- Fechar o resultado uma única vez; aplicar pontos, saldo, classificação e estatísticas segundo o formato configurado da competição.
- Não inventar calendário, participantes, inscrições, fases, prorrogação ou disputa por pênaltis quando os dados/regulamento não os definirem.
- O relatório deve ser uma síntese dos eventos que realmente ocorreram: gols, cartões, substituições, estatísticas e resultado. Público, renda, lesões ou notas só devem aparecer como simulação identificada quando houver um modelo para calculá-los.

## 5. Estado observado do motor do FutManager

Esta seção descreve o código consultado em 29/10/2026, não uma regra de futebol nem uma promessa de funcionalidades futuras.

- `src/lib/game/live-match.ts` gera ações ao longo do relógio e define as categorias pass, shot, goal, tackle, foul, discussion e offside. A escolha de ação é probabilística; uma finalização tem probabilidade de gol influenciada pela força da equipe.
- `src/components/game-board.tsx` calcula a força a partir de overall, energia e adaptação à posição. Essa força influencia a probabilidade de qual equipe recebe o próximo evento e a conversão de finalizações.
- `src/lib/game/live-positioning.ts` trata formação e posições personalizadas como organização inicial: a estrutura acompanha bola e posse, com movimentos de apoio, avanço e cobertura, sem raio rígido que prenda os jogadores. O snapshot posicional é compartilhado com a ação seguinte e com o impedimento simplificado; o adversário continua genérico e o movimento é heurístico, não física contínua.
- Os eventos alimentam o placar, estatísticas e visualização; resultados de outros jogos são calculados separadamente de modo determinístico por rodada/minuto.
- A tela salva e apresenta estilo, marcação e foco tático, mas esses parâmetros ainda não são argumentos de `simulateAction`. Portanto, não afirmar que já alteram os eventos da partida.
- O conjunto de ações atual não representa integralmente regras de impedimento, reinícios, faltas/cartões, expulsões e inferioridade numérica; também não implementa tempo adicional oficial ou limites completos de janelas de substituição.
- Essas são limitações do motor atual. Não são motivo para inventar eventos ou dados nas telas: novas mecânicas devem ter regra, efeito no jogo, persistência e testes definidos.

## 6. Invariantes e critérios para mudanças futuras

- No máximo 11 atletas de cada equipe em campo; a composição segue o regulamento da competição.
- Resultado, eventos, estatísticas, classificação e relatório não podem divergir.
- Substituições confirmadas respeitam limites configurados e não duplicam atletas; cancelamentos não alteram o time.
- Um gol incrementa o placar uma única vez e reinicia a partida conforme a regra.
- Partida pausada ou carregada não avança sozinha; progresso e decisões permanecem salvos.
- Aleatoriedade deve ser injetável/seeded nos testes para permitir reproduzir bugs e verificar equilíbrio.
- Mudanças táticas precisam ter testes que provem seu efeito e seus trade-offs; controles sem efeito persistido não devem ser apresentados como funcionais.
- A formação e as coordenadas manuais descrevem a organização inicial; não impor raio fixo de deslocamento aos atletas nem regravar essas coordenadas com o movimento da partida. A função do goleiro pode modular seu comportamento sem congelá-lo.
- Não remover liberdade de posição definida pelo projeto para simular futebol real: usar a posição como contexto informativo e de cálculo, não como bloqueio de interface.

## 7. Fontes

### Regras oficiais

- IFAB, [Law 3 — The Players](https://www.theifab.com/laws/latest/the-players/) — jogadores, substituições e procedimentos.
- IFAB, [Law 7 — The Duration of the Match](https://www.theifab.com/laws/latest/the-duration-of-the-match/) — tempos, intervalo, tempo perdido e partida abandonada.
- IFAB, [Law 8 — The Start and Restart of Play](https://www.theifab.com/laws/latest/the-start-and-restart-of-play/) — pontapé inicial e reinícios.
- IFAB, [Law 10 — Determining the Outcome of a Match](https://www.theifab.com/laws/latest/determining-the-outcome-of-a-match/) — resultado e disputa por pênaltis.
- IFAB, [Law 11 — Offside](https://www.theifab.com/laws/latest/offside/) — posição, participação e sanção de impedimento.
- IFAB, [Law 12 — Fouls and Misconduct](https://www.theifab.com/laws/latest/fouls-and-misconduct/) — faltas e disciplina.

### Tática e análise técnica

- FIFA, [relatório técnico da Copa do Mundo de 2026](https://inside.fifa.com/talent-development/technical-study-group/media-releases/comprehensive-post-tournament-report-fifa-world-cup-2026) — análise dos 104 jogos, transições, contrapressão, blocos defensivos, construção e goleiro.
- FIFA Training Centre, [Transição para o ataque](https://www.fifatrainingcentre.com/en/practice/elite-sessions/transition-to-attacking/transition-into-attack.php) — progressão rápida depois da recuperação, apoio, compactação e exploração de espaço.
- FIFA Training Centre, [Contrapressão](https://www.fifatrainingcentre.com/en/practice/elite-sessions/transition-to-defending/counter-pressing.php) — reação coordenada à perda, pressão do atleta mais próximo e proteção do centro.
