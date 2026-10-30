# Referência de mecânicas: primeira exploração do Brasfoot

Registro de referência funcional para o FutManager, não especificação de uma interface a copiar. Não reutilizar textos, imagens, layout ou outros ativos do Brasfoot.

## Loop principal da carreira

1. Consultar elenco, calendário e próximo adversário.
2. Montar o time: formação, titulares, banco e instruções táticas.
3. Simular a partida acompanhando placar, eventos e estatísticas ao vivo.
4. Decidir no intervalo (substituições e ajustes táticos).
5. Ler o relatório final, absorver eventos de mercado e avançar na agenda.

## Partida no Brasfoot — observações funcionais da exploração

- Preparação mostra condição do gramado e adversário, escalação em campo, banco e jogadores disponíveis.
- A formação preenche os 11 titulares; sem eles, a partida não começa.
- Instruções antes e durante o jogo: estilo, intensidade da marcação e foco dos ataques.
- A tela ao vivo apresenta minuto, placar, autores dos gols/cartões, posse, finalizações, desarmes e erros de passe; também exibe os demais resultados da rodada.
- O intervalo é uma tela decisória com notas/energia, substituições restantes, dados do rival e os mesmos controles táticos.
- O relatório final consolida placar, escalações, notas, gols, cartões, substituições, público, renda e o panorama da rodada.

Esses pontos registram o fluxo funcional observado; não autorizam copiar aparência, redação ou ativos, nem afirmam que a simulação do FutManager deve reproduzir fórmulas proprietárias.

## Gestão do clube

- Calendário unifica partidas futuras e passadas com data, rival, competição, público e renda.
- Mercado usa filtros de posição, lado, atributos, nacionalidade, força, idade, valor e disponibilidade (venda/empréstimo/estrela).
- Navegador de clubes organiza país > liga > clube; cada clube expõe elenco, finanças, confiança e ficha/carreira do atleta.
- Leilões de jogadores aparecem como eventos entre partidas, exigindo decisão de compra ou recusa antes de seguir.
- Amistosos permitem escolher data disponível, adversário, mando e envio de proposta.
- A academia tem vagas limitadas, desenvolvimento, potencial, valor e salário; os jovens podem ser promovidos ou dispensados.

## Direção para o FutManager

- Priorizar um hub de carreira com o próximo jogo, situação financeira, moral/confiança e atalhos para decisões pendentes.
- Tratar a partida como um fluxo em três atos: preparação, acompanhamento/intervalo e relatório final.
- Tornar os dados acionáveis: cada tabela deve levar à ficha, comparação ou decisão, em vez de ser apenas informativa.
- Manter o visual próprio do FutManager: usar estes padrões de produto, sem imitar a interface ou os ativos de terceiros.

## Situação atual do FutManager (30/10/2026)

- A visão gráfica de campo durante a partida está temporariamente removida. A partida é acompanhada por comentário textual, placar, estatísticas, clima simulado, disciplina e resultados da rodada; o pós-jogo também é um relatório textual.
- A formação organiza o XI inicial. As posições funcionam como referências para adaptação e leitura tática, nunca como fronteiras rígidas de movimentação.
- Antes de iniciar ou retomar uma partida, o jogo precisa carregar e validar as regras canônicas em [`../public/game-assets/match-engine-rules.md`](../public/game-assets/match-engine-rules.md). Falha de leitura/validação bloqueia a partida; a lógica de leitura está em `src/lib/game/match-rules.ts` e o resumo de implementação em [`match-engine.md`](match-engine.md).
- O motor considera força e qualidades disponíveis dos atletas, energia, motivação estimada, tática, clima e aleatoriedade reproduzível. O favorito tem vantagem estatística, não vitória garantida. Motivação do adversário sem dados próprios é uma estimativa, não um atributo factual.
- Eventos estruturados alimentam relato, placar, estatísticas e notas. Não inventar números de público/renda, atributos ou eventos que o modelo atual não calcula; a simulação é própria e simplificada, não uma reprodução do Brasfoot ou do futebol real.
