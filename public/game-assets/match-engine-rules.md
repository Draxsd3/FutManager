# Regras do motor de partidas — FutManager

> **Arquivo obrigatório do simulador.** O jogo lê este Markdown com `cache: no-store` antes de iniciar cada partida e antes de retomar uma partida pausada. Se o arquivo estiver indisponível ou inválido, a partida não começa/retoma; não existe fallback silencioso para números diferentes.

As regras abaixo definem a simulação do FutManager, inspirada em futebol real e em relatos textuais de jogos de gerenciamento. Elas não são regras oficiais da IFAB nem uma cópia do algoritmo proprietário de outro jogo.

## Princípios do resultado

1. Técnica, força coletiva, condição física e motivação influenciam posse, criação e execução. São avaliadas as habilidades disponíveis nos dados do atleta, sua adaptação à função, energia e posição escolhida.
2. A equipe mais forte/motivada deve produzir mais e melhores ações **em média**, sem vitória garantida. Futebol tem variância: uma equipe inferior pode vencer, mas não deve superar repetidamente um adversário superior sem explicação estatística.
3. Escalação/formação organizam o time; não bloqueiam posições escolhidas pelo treinador. Posições livres afetam adaptação e relações entre setores, não impedem a escalação.
4. Estilo, pressão/marcação e foco de ataque têm efeitos e custos explícitos. Ofensividade cria mais risco e chances; marcação pesada disputa mais bolas e aumenta faltas/desgaste; foco central/lateral desloca a seleção de ações.
5. Clima é um **cenário simulado e reproduzível**, não previsão meteorológica real. Chuva afeta controle/passes, vento afeta bolas longas e finalizações, calor eleva desgaste. O cenário e seus efeitos aparecem no relatório.
6. Cada lance atualiza posse, placar, estatísticas, cartões, notas e texto a partir do mesmo evento. O comentário nunca inventa um lance separado do resultado.
7. Força baseia-se em atributos reais disponíveis. Quando a base só registra força geral e qualidades categóricas, o motor não finge conhecer 20 atributos numéricos separados; usa força geral, posição, energia e as qualidades cadastradas.
8. O minuto da simulação é estável ao salvar/retomar: o acaso usa uma semente derivada da carreira, rodada e minuto. Retomar não rerrola gols já ocorridos nem altera clima no meio da partida.

## Fluxo da partida

- 90 minutos, com um relato por minuto e estatísticas cumulativas. O relógio pausa no intervalo e no fim; mudanças táticas/substituições só entram após confirmação.
- Posse e qualidade de meio-campo determinam com que frequência cada equipe ataca. Qualidade de ataque, defesa, goleiro, energia, motivação, tática e clima ajustam a criação e a conversão das chances.
- Uma finalização usa finalização/qualidade do atacante contra defesa e goleiro, além do ângulo/contexto simplificados. Ela termina em gol, defesa ou para fora; não é gol por sorteio independente.
- Passe pode ser completado ou interceptado segundo passe do atleta, pressão, marcação, foco, condição e clima. Uma interceptação transfere a posse.
- Desarme, falta, impedimento e cartão só aparecem quando há evento compatível. Cartão é condicionado à gravidade e à agressividade; não é sorteado sem falta. Expulsões retiram o atleta das escolhas e reduzem o desempenho coletivo pelo restante do jogo; uma nova advertência do mesmo atleta pode gerar segundo amarelo e expulsão.
- Gols são contabilizados uma vez, registram o autor e reiniciam a posse. Estatísticas de posse, finalizações, defesas, desarmes, erros, faltas e cartões derivam dos eventos registrados.
- O relatório pós-jogo inclui o cenário climático, resultado, melhores momentos, estatísticas e notas individuais calculadas do desempenho real dos eventos.

## Limitações explícitas

O motor é uma simulação estatística de gestão, não física contínua nem uma reconstrução de partidas reais. Se não houver dados de atributos, moral ou escalação do adversário, a aproximação deve ser neutra e identificada — nunca substituir ausência de dados por valores apresentados como reais. Não usar serviço externo de clima sem dados/localização e consentimento de integração.

## Configuração executável

O bloco JSON abaixo é lido deste mesmo arquivo em cada início/retomada. Valores são coeficientes do modelo, não porcentagens de vitória, e devem mudar acompanhados de testes de equilíbrio.

<!-- MATCH_ENGINE_JSON_START -->
```json
{
  "version": 1,
  "durationMinutes": 90,
  "homeAdvantage": 3.2,
  "possessionStrengthWeight": 0.006,
  "possessionMin": 0.32,
  "possessionMax": 0.68,
  "shotBaseRate": 0.15,
  "shotAttackWeight": 0.0018,
  "shotDefenseWeight": 0.0011,
  "offensiveStyleShotBonus": 0.035,
  "defensiveStyleShotPenalty": 0.025,
  "passBaseAccuracy": 0.78,
  "passSkillWeight": 0.0026,
  "markingWeight": 0.0018,
  "heavyPressTurnoverBonus": 0.055,
  "heavyPressFoulBonus": 0.035,
  "goalBaseChance": 0.115,
  "finishingWeight": 0.0034,
  "keeperWeight": 0.0031,
  "motivationWeight": 0.0012,
  "goalMinChance": 0.035,
  "goalMaxChance": 0.42,
  "rainPassPenalty": 0.075,
  "rainShotPenalty": 0.018,
  "windPassPenaltyPerKmh": 0.0018,
  "windShotPenaltyPerKmh": 0.0011,
  "heatFatiguePerDegree": 0.0018,
  "baseFatiguePerMinute": 0.00075,
  "heavyPressFatiguePerMinute": 0.00042,
  "yellowCardBaseChanceOnFoul": 0.12,
  "heavyMarkingCardBonus": 0.16,
  "weatherOptions": [
    { "id": "seco", "label": "Tempo firme", "weight": 34, "tempMinC": 20, "tempMaxC": 30, "rainIntensity": 0, "windMinKmh": 0, "windMaxKmh": 10 },
    { "id": "nublado", "label": "Nublado", "weight": 26, "tempMinC": 18, "tempMaxC": 27, "rainIntensity": 0.1, "windMinKmh": 2, "windMaxKmh": 12 },
    { "id": "chuva", "label": "Chuva", "weight": 20, "tempMinC": 15, "tempMaxC": 24, "rainIntensity": 0.75, "windMinKmh": 4, "windMaxKmh": 18 },
    { "id": "vento", "label": "Vento forte", "weight": 10, "tempMinC": 17, "tempMaxC": 27, "rainIntensity": 0.05, "windMinKmh": 18, "windMaxKmh": 32 },
    { "id": "calor", "label": "Calor", "weight": 10, "tempMinC": 29, "tempMaxC": 37, "rainIntensity": 0, "windMinKmh": 0, "windMaxKmh": 12 }
  ]
}
```
<!-- MATCH_ENGINE_JSON_END -->
