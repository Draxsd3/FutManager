# IA local de decisões de futebol — 03/11/2026

## Escopo e custo

Camada de decisões probabilísticas original em TypeScript, executada no navegador. Não usa LLM, API paga, modelo baixado, treinamento ou nova dependência. O armazenamento/hosting existente continua sujeito às cotas dos respectivos planos. Nenhuma tela, modal ou identidade visual foi redesenhada.

Aplica-se ao **motor ao vivo das partidas do clube controlado**. Os placares das outras partidas do calendário ainda usam a simulação simplificada de `season.ts`/`otherScore`; não são declarados como partidas completas desta IA.

## O que mudou

- **Estado da jogada:** `carrierId`, `targetId` e `ballAfter` acompanham o portador, o recebedor e a localização da bola. Não há troca silenciosa de posse por sorteio a cada minuto: perda de posse precisa de um evento correspondente. Gol reinicia no centro; cada equipe inicia um tempo, com a primeira saída derivada da semente da partida.
- **Decisão de passe:** seleção ponderada por avanço, distância, marcação próxima e canal de ataque escolhido. Recuar e conservar a bola continuam possíveis. As corridas automáticas procuram a linha de impedimento; erros de tempo ainda existem. Coordenadas manuais não são reescritas nem restringidas por posição.
- **Condução/drible:** alternativa ao passe, com progressão da bola; habilidade disponível, qualidades de drible, condição e oposição influenciam sucesso. Perder a disputa gera um desarme, com autoria e transferência de posse reais no registro.
- **Finalização:** quem está com a bola finaliza, sem trocar arbitrariamente por outro artilheiro. Distância/ângulo e pressão formam uma estimativa interna de qualidade de chance; finalização, defesa, goleiro, motivação, clima e mando ajustam a conversão. Não há finalização antes de chegar à zona mínima de ataque. Defesa do chute é atribuída ao goleiro efetivo, não a um atleta escolhido por sorteio de força.
- **Assistência:** somente o passe imediatamente anterior, para o jogador que realmente marcou, pode gerar assistência; não há autoassistência.
- **Adversário adaptativo:** a partir de 60 minutos, quem perde pode se tornar ofensivo; a partir de 75 pode pressionar mais. Quem vence no fim pode se proteger. Inferioridade numérica também afeta o plano. Essa política não altera as instruções do usuário nem exige estado adicional fora do save.
- **Trocas táticas:** pressão pesada/ofensividade avançam a linha defensiva; bloco defensivo recua. Isso altera espaço, pressão e risco de impedimento. Marcação pesada mantém o custo de faltas e os coeficientes existentes de fadiga.
- **Fadiga e substituições:** habilidades consideram energia inicial, minutos efetivamente jogados, clima e marcação. O controlador envia os minutos desde a entrada de cada atleta, evitando tratar um reserva recém-entrado como se tivesse jogado 85 minutos. O desconto persistente de energia pós-partida continua usando as regras existentes; não há nova recuperação diária/calendário implementada nesta etapa.

## Persistência e determinismo

A semente por partida/minuto e o clima persistido continuam sendo usados. O controlador fornece o placar salvo antes do próximo lance para reconstruir o plano rival. Os campos novos são opcionais: eventos antigos continuam legíveis, sem migração SQL. Os eventos já registrados não são reescritos; minutos ainda não disputados de uma partida antiga passam a usar o código atualizado. Não prometemos reprodução entre versões diferentes do algoritmo.

A repetição de uma mesma partida com a mesma versão, estado, regras, escalação, táticas e semente é idêntica, inclusive após serializar/restaurar os eventos. Conduções rotineiras não lotam o relato de melhores momentos nem contam como passes ou finalizações.

## Validação reproduzível

```sh
npx vitest run src/lib/game/football-decisions.test.ts src/lib/game/live-match.test.ts src/lib/game/football-calibration.test.ts
npm test
npm run lint
npm run build
```

O teste de calibração roda **1.000 partidas de 90 eventos**, em quatro grupos de 250: equipes equilibradas, força desigual (88×65 alternando lados), mandante ofensivo e mandante com marcação pesada. Usa elencos sintéticos com funções do fixture de teste, energia 95, motivação 65 e tempo firme; não dados de resultados reais nem uma previsão de campeonato.

Resultado desta revisão:

| Métrica | Resultado |
|---|---:|
| Gols por partida, todos os cenários | 1,839 |
| Finalizações por partida | 14,793 |
| Impedimentos por partida | 2,529 |
| Passes completos entre tentativas registradas | 73,89% |
| Vitórias do mais forte / mais fraco, em 250 confrontos desiguais | 206 / 5 |
| Finalizações do lado controlado, equilibrado / ofensivo, 250 jogos cada | 1.879 / 2.231 |
| Faltas do lado controlado, normal / pesada, 250 jogos cada | 411 / 776 |

Todas as partidas verificam autoria/contagem dos gols, soma de posse 100%, gols ≤ chutes no alvo ≤ finalizações. Outros testes verificam orientação espelhada, vantagem de chance próxima/central/livre, legado de save, continuidade de posse/portador, retomada idêntica, foco e entrada de reservas. A amostra permite detectar regressões e desequilíbrios; **não comprova fidelidade estatística a uma competição real**.

## Limitações deliberadas

Continua sendo uma simulação comprimida de gestão, com um evento representativo por minuto. Os totais de passes não representam todos os toques de uma partida real; não multiplicar eventos artificialmente para aparentar números reais. A qualidade de chance é uma heurística própria, **não xG oficial nem modelo treinado com dados reais**. Não existe física contínua, percepção por visão computacional ou aprendizado online. Escanteios, pênaltis, acréscimos e várias regras de reinício continuam com as limitações do motor anterior; esta camada não implementa todas as Leis da IFAB. Comparação com dados abertos reais, mais ações por minuto e simulação completa das demais equipes ficam como evolução futura.
