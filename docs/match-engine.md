# Manual do motor de partidas

A configuração executável e o registro humano de regras estão em [`public/game-assets/match-engine-rules.md`](../public/game-assets/match-engine-rules.md). Esse é o documento canônico: não duplicar seus coeficientes aqui.

## Obrigação de leitura

`src/lib/game/match-rules.ts` busca o Markdown com `cache: "no-store"` antes de iniciar uma partida e antes de retomá-la. A configuração JSON dentro do Markdown é validada antes de chegar ao simulador. Falha de leitura ou validação bloqueia o início/retomada; não usar uma configuração alternativa silenciosa.

O save mantém uma fotografia das regras, clima, chave determinística e motivação usados na partida. Na retomada, o documento atual é lido novamente, mas o jogo mantém a fotografia original para não mudar clima, coeficientes ou resultados já ocorridos no meio do jogo.

## Fatores do cálculo

- **Atletas:** força geral, qualidades cadastradas, energia, adaptação à função mais próxima e desgaste conforme minuto/temperatura. Qualidades são categóricas na base atual; não apresentar valores numéricos inexistentes como dados reais.
- **Equipe:** ataque, meio-campo, defesa e goleiro são avaliados a partir das posições e atributos dos jogadores disponíveis. Meio-campo pesa na posse; ataque/defesa na criação; finalizador e goleiro na conversão.
- **Vontade:** no elenco do usuário, é estimada de forma reproduzível a partir de forma recente e energia. O adversário sem histórico de moral recebe uma estimativa neutra variada por semente, não uma moral “real”.
- **Táticas:** estilo ofensivo eleva criação e exposição; defensivo reduz risco/ofensividade; marcação pesada aumenta disputa, mas também faltas, risco disciplinar e desgaste; foco de ataque dá preferência contextual a jogadores compatíveis.
- **Clima:** condição, temperatura, chuva e vento são cenários de simulação, não previsão real. Chuva/vento alteram passe e chute; calor e pressão alteram fadiga. O clima fica fixo durante uma partida.
- **Acaso:** fluxo determinístico por chave de carreira/rodada/clubes/minuto. Superioridade aumenta a expectativa de desempenho, mas não garante vitória; azarões ainda podem vencer.
- **Coerência:** comentário, posse após o lance, evento de gol, pontuação, estatísticas e notas individuais derivam do mesmo evento. Energia é atualizada ao apito final com minutos jogados, pressão e calor.

## Testes e mudanças

`src/lib/game/match-rules.test.ts` verifica parsing, leitura sem cache e falha fechada. `src/lib/game/live-match.test.ts` cobre reprodutibilidade, força relativa, surpresas, posse, autoria, clima, desgaste, notas e resultados de outros jogos.

Ao alterar coeficientes, atualizar o arquivo canônico e rodar pelo menos esses testes mais a suíte geral. Não alterar coeficientes para que todo favorito vença: futebol continua probabilístico. Durante o jogo, a tela é somente textual, com estatísticas dos dois times e momentos importantes (sem listar passes rotineiros); não renderizar minicampo, jogadores ou animação de bola. No pós-jogo, mostrar abas de eventos, estatísticas e formações estáticas dos dois times, além dos placares da rodada ao lado.
