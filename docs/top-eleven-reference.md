# Pesquisa de referência: Top Eleven

**Consultada em 29/10/2026.** Esta pesquisa usa documentação pública e entrevistas. A implementação interna do motor da Nordeus é proprietária; não há uma descrição pública completa de seus algoritmos, fórmulas ou código. Portanto, este documento registra comportamentos observáveis e princípios de produto, não afirma reproduzir o motor do Top Eleven.

## O que as fontes públicas permitem afirmar

- O guia de formação publicado pela comunidade oficial do Top Eleven descreve escalações fluidas: os jogadores de linha podem ser colocados em diferentes áreas do campo, e o total e a qualidade dos jogadores em uma zona também influenciam zonas vizinhas. Naquele guia, o goleiro é exceção e aparece com posição estática.
- A comunicação oficial da atualização de 2025 para as partidas 3D diz que a animação deve mostrar as táticas tomando forma e melhorar a leitura do efeito estratégico. Também menciona maior variedade de ações e aplicação mais rápida de mudanças táticas aos movimentos da equipe.
- Na entrevista de 2022, o game lead da Top Eleven diz que a Nordeus desenvolveu um motor de futebol próprio para refletir as decisões táticas em tempo real. Ele descreve trabalho especializado em IA, animação, gráficos e engenharia; não publica as regras internas do motor.
- O suporte oficial explica em alto nível que resultados dependem de múltiplos fatores — formação, escalação adequada, condição/moral e resposta às ações do adversário — e que não existe uma formação vencedora universal. Não revela pesos ou equações.

## Implicações para o FutManager

1. A formação é uma **estrutura de equipe**, não uma grade que mantém cada jogador parado em uma casa. A localização inicial comunica espaçamento, linhas, largura, profundidade e cobertura.
2. A animação deve acompanhar a ação: quem conduz aproxima-se da bola; o recebedor oferece uma linha e chega ao ponto do passe; companheiros se movem para apoio, largura ou profundidade; sem posse, a equipe desloca o bloco e um jogador pode pressionar enquanto os demais cobrem.
3. O movimento parte da escalação e das posições manuais, mas pode atravessar as faixas originais de posição. As coordenadas persistidas representam a escolha do treinador e não devem ser substituídas pelo deslocamento temporário.
4. A mesma fotografia de posições deve orientar bola, jogadores e, quando aplicável, cálculos simplificados como escolha do próximo participante e impedimento. Isso evita que a bola pareça passar para alguém que visualmente está longe do local do lance.
5. Goleiros têm função especial de proteção da meta, mas também reagem ao ângulo e à posição da bola; a função pode reduzir/proporcionar movimento diferente, não congelar o goleiro em um pixel.
6. O movimento desenvolvido aqui é uma aproximação 2D, determinística e testável para a visualização do FutManager. Não equivale à inteligência artificial, animação 3D ou cálculo proprietário da Nordeus.

## Referências

- Top Eleven, [guia oficial de formação fluida](https://forum.topeleven.com/tutorials-guides/52408-%5Boffical%5D-new-formation-screen-guide.html) — posicionamento livre no campo, exceção do goleiro e influência territorial das zonas. Publicado originalmente em 2017; pode não descrever todas as regras da versão atual.
- Top Eleven, [novidades de 3D e partidas ao vivo — março de 2025](https://forum.topeleven.com/top-eleven-general-discussion/84304-%5Bofficial%5D-top-eleven-3d-whats-new-march-27th.html) — movimentos animados que refletem as táticas e aplicação mais rápida das mudanças táticas.
- Serbian Games Association, [entrevista sobre a nova era 3D do Top Eleven](https://sga.rs/en/old-news/new-era-of-top-eleven-in-3d/) — entrevista de 2022 com Marko Jevtić, game lead, sobre o motor proprietário, suas equipes e integração em tempo real.
- Top Eleven, [Help Center](https://www.topeleven.com/old-site/help/) — alterações de posicionamento por arraste, formações customizáveis e ordens táticas. É uma documentação antiga, consultada como fonte de princípios, não de regras atuais.
- Nordeus, [por que posso perder mesmo com equipe mais forte?](https://nordeus.helpshift.com/a/top-eleven-be-a-soccer-manager/?s=live-match-1597149943&f=i-lost-a-game-but-my-team-was-stronger-why&l=en&p=web) — recomenda adaptar formação, jogadores e condição, sem prometer resultado garantido nem divulgar a fórmula interna.
