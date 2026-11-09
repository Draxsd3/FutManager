# E7 — tática, partidas e disciplina

## Escopo do fechamento

Núcleo tático e disciplina automática v2 integrado ao ciclo real, sem redesign, alteração do arraste livre ou início da E8. O primeiro recorte foi entregue na PR #168. Este fechamento substitui suas limitações de CPU agregada aos 90 minutos e ausência de acúmulo de amarelos. Não significa reprodução integral de todas as decisões de arbitragem ou tribunais desportivos.

## Técnicos, escalação e decisões CPU

- `match-plans.ts` usa identidade/reputação dos técnicos E5 e força relativa ao adversário. Preferências são **simuladas**, não biografias táticas reais importadas. Sem técnico conhecido, registra `interim`, sem inventar uma identidade real.
- Forma XI por função/profundidade (4-3-3 ou 4-5-1), assegurando goleiro quando disponível, com elegibilidade E6 e suspensão na competição. Não preenche catálogo incompleto com pessoas fictícias.
- Mesmo `reviewCpu` no adversário assistido e nas partidas de fundo: decisões no intervalo, 60 e 75 minutos, além de indisponibilidade conhecida. Considera desgaste por posição/idade/minutos, amarelo, expulsão, placar e banco não utilizado. Não obriga cinco trocas sem motivo. Expulso sai sem reposição; lesionado indisponível sai mesmo sem troca legal disponível.
- Cinco substituições/três oportunidades como perfil padrão do jogo; intervalo não consome oportunidade. Interrupções no mesmo minuto são uma oportunidade nesta granularidade, não uma arbitragem de segundos. Sem reentrada, troca de expulso ou atleta já usado. CPU não utiliza a escalação/instruções do humano nem modifica seu posicionamento livre.
- Preparação `contractVersion: 2` guarda plano, XI ativo, entradas/saídas, motivos das trocas e marcos já revistos. Retomar preserva seed, clima, regras, CPU e eventos; não sorteia novamente. Estado CPU inconsistente é recusado antes de retomar, preservando o save. Preparações antigas continuam no contrato anterior.

## Granularidade e autoridade dos resultados

- **Assistida:** motor ao vivo existente, eventos por minuto; participação de todos os utilizados, não 90 minutos para os últimos onze. Plano CPU também registrado na súmula; instruções humanas continuam sendo as confirmadas na interface.
- **CPU/headless:** `tacticalFixture`, seis intervalos de 15 minutos, explicitamente `granularity: "15-minute-v2"`, seed `${season}|${fixture.id}|cpu-v2`. Gols, assistências, cartões e trocas pertencem às pessoas ativas; expulsão reduz participação e força nos intervalos seguintes. Forças das duas equipes são capturadas antes dos eventos do intervalo, sem atualização privilegiada de um lado.
- Contexto CPU inclui força, estilo, energia estimada, mando e número de jogadores. Poisson por intervalo; não há ramo identificando humano para favorecer resultados. Ausência de atributos não se transforma em atributo real da fonte. Notas CPU permanecem `null`, não avaliações inventadas de lances não observados.
- A prévia de jogos da rodada e sua liquidação usam **o mesmo relatório tático**, revelando gols apenas até o marco observado. Cache por banco/temporada/fixture não reescreve partidas jogadas. `backgroundFixtureScore` permanece API legada, não autoridade do novo ciclo.
- A granularidade reduz o custo em relação a executar todos os lances ao vivo para cada clube; não tem a mesma fidelidade espacial do jogo assistido. Não se inventam comentários minuto a minuto para CPU nem se reconstroem eventos de resultados antigos.

## Disciplina por competição

- `brazil-cards-v2`: três amarelos geram uma suspensão automática; vermelho gera uma. Amarelo anterior a vermelho direto permanece na série; terceiro amarelo + vermelho direto acumula duas partidas. Na expulsão por segundo amarelo, o par daquele jogo não entra na série acumulativa, preservando os amarelos anteriores. A estatística da partida contabiliza as duas advertências e uma expulsão.
- Cumprimento por partida da **mesma competição** do clube atual, mesmo fora do banco; outra competição não quita a pendência. Transferência não apaga suspensão. Pendências múltiplas são reduzidas uma partida por serviço registrado.
- Série D: reset dos amarelos após a primeira e a quarta fases, preservando suspensões já adquiridas. No calendário existente: grupos = fase 1; KO 0/1/2 = fases 2/3/4; reset antes do KO 3 (quartas), **não depois das quartas**. Sem novo reset na semifinal. Série B: reset ao entrar nos playoffs, também sem apagar pendências. A política não cria/reescreve calendários.
- Outras competições usam o perfil genérico contínuo de três amarelos/um vermelho; **não se presume uma zeragem estadual sem fonte/configuração específica**. Não apresentar essa cobertura como validação de todos os regulamentos das federações.
- `automatic-red-only-v1` permanece válido para súmulas antigas. Não somar amarelos retrospectivamente, alterar resultados históricos ou fabricar sanções passadas.

### Fontes e limites da pesquisa

- [FGF, RGC 2026, arts. 57–58](https://fgf.com.br/Layout/documentos/69ab3adf80339rgc-fgf---2026.pdf): acúmulo, vermelho, segundo amarelo, cumulação de suspensões e manutenção da pendência. Fonte primária estadual; não prova isoladamente todos os regulamentos nacionais/estaduais.
- [CBF, Série B 2026, art. 14](https://stcbfsiteprdimgbrs.blob.core.windows.net/img-site/cdn/REC_Brasileiro_Serie_B_2026_85d55b9f72.pdf): reset para playoffs, preservadas suspensões automáticas adquiridas.
- [CBF, Série D 2026, art. 36](https://stcbfsiteprdimgbrs.blob.core.windows.net/img-site/cdn/REC_Brasileiro_Serie_D_2026_2def4ff8f2.pdf): reset após fases 1 e 4, sem extinguir suspensão pendente.
- [Manual CBF 2026](https://stcbfsiteprdimgbrs.blob.core.windows.net/img-site/cdn/Manual_de_Competicoes_CBF_2026_f5b02a4e04.pdf): referência geral; páginas disciplinares 81–83 não foram diretamente extraídas nesta pesquisa. Não afirmar auditoria artigo a artigo desse manual.
- [IFAB, opção permanente de cinco substituições](https://www.theifab.com/news/the-ifab-permanently-approves-five-substitute-option-in-top-level-competitions/) e [Lei 3 FA/IFAB 2026/27](https://www.thefa.com/-/media/files/thefaportal/governance-docs/laws-of-the-game/2026-27/law-3---the-players.ashx): organizador define o perfil; até cinco não é obrigação universal.

## Reinícios e parâmetros

- `restarts.ts` explicita saída inicial/segundo tempo/após gol, tiro livre direto/indireto, pênalti, tiro de meta, escanteio e lateral; posse e ponto inicial vêm do reinício. Gol não concede posse silenciosa ao autor; impedimento gera tiro indireto do adversário.
- Referências: IFAB [Lei 8](https://www.theifab.com/laws/latest/the-start-and-restart-of-play/), [11](https://www.theifab.com/laws/latest/offside/), [12](https://www.theifab.com/laws/latest/fouls-and-misconduct/), [13](https://www.theifab.com/laws/latest/free-kicks/), [14](https://www.theifab.com/laws/latest/the-penalty-kick/), [15](https://www.theifab.com/laws/latest/the-throw-in/), [16](https://www.theifab.com/laws/latest/the-goal-kick/), [17](https://www.theifab.com/laws/latest/the-corner-kick/).
- Tiro indireto não vira chute direto. Não há impedimento ao receber diretamente escanteio, lateral ou tiro de meta. Pênalti parte da marca, com evento único coerente de chute/gol/defesa/erro.
- Normalização geométrica assume campo de 105 × 68 m. Escanteio após desvio de defesa (22%), saída lateral por perda próxima da linha, conversão-base de pênalti (0,76), ponderação de energia, dispersão de força (30) e taxas de cartões são **heurísticas do jogo**, não regras IFAB, física contínua ou xG oficial.
- Relógio continua em 90 minutos, com a granularidade existente. Acréscimos/execução estendida após o relógio final, prorrogação, disputa narrada de pênaltis, abandono/decisão administrativa por menos de sete, tribunal, recursos e exceções estaduais não pesquisadas **não são modelados neste fechamento**. São limites explícitos, não recursos entregues ou conformidade universal com IFAB/CBF.

## Persistência e segurança

- `matches-v1` é o envelope de súmula; política disciplinar, preparação e granularidade distinguem versões da simulação. Placar, gols, assistências, cartões, identidades e minutos conciliam antes de publicar. Trocas são validadas contra participantes, limites e expulsões.
- Fixture reportada inteira imutável, tanto na temporada ativa quanto em snapshots de emprego. Sem backfill, reset de carreira ou reinterpretação de súmulas antigas. Preservados catálogo completo, universos independentes, codec, quota original e CAS.
- Migração aditiva `20261107072000_tactical_match_report.sql` aceita as duas políticas, valida formato dos metadados opcionais e mantém o índice de imutabilidade anterior. Nenhuma migração histórica reescrita; nenhum save privado lido. SQL não substitui todas as validações semânticas do domínio.
- Aplicação remota identificada como `20261109140214_tactical_match_report` (identificador do histórico do servidor; arquivo local segue a sequência das migrações anteriores). Probe SQL com transação/rollback e tabela temporária: `e7_v2_and_legacy_archives_immutable_passed`; duas súmulas sintéticas, antiga e moderna, cópia de arquivo aceita; alteração, remoção e política desconhecida recusadas.

## Comparação estatística e QA

- `match-plans.test.ts`: cenários fixos com dois elencos sintéticos de 18 jogadores, GER 82 × 55, energia 80/idade 30, 240 seeds por mando. Compara favorito em casa e fora; exige vantagem amostral e derrotas possíveis, não garante vencedor. Métricas `E7_CPU_SCENARIOS` no log; não são observações de campeonato real.
- Antes do ajuste de sensibilidade, esse cenário produziu 237 vitórias/1 derrota em casa e 233/0 fora, com 5,533 gols/jogo em casa: favorito excessivamente dominante. Dispersão ampliada de 22 para 30 e energia incorporada à força efetiva. Os resultados finais e a evidência de QA são registrados na entrega.

### Resultados dos cenários fixos

| Cenário | Jogos | Métricas medidas |
| --- | ---: | --- |
| CPU, favorito GER 82 × 55 em casa | 240 | 217 vitórias, 18 empates, 5 derrotas; 3,921 gols/jogo |
| CPU, mesmo favorito fora | 240 | 213 vitórias, 22 empates, 5 derrotas |
| Assistido, contrato legado | 1.000 | 1,879 gols; 14,839 chutes; 2,522 impedimentos/jogo; 73,99% passes completos |
| Assistido, reinícios v2 | 1.000 | 2,091 gols; 15,597 chutes; 2,234 impedimentos/jogo; 74,28% passes completos |

Os 1.000 jogos de cada versão assistida dividem-se em quatro cenários de 250: equilibrado, força desigual (88 × 65 com mando alternado), ofensivo e marcação pesada; clima firme de 24 °C, energia 95 e motivação 65 para ambos. Nos 250 de força desigual: favorito ganhou 206/perdeu 6 no legado e ganhou 209/perdeu 9 em v2. Ofensivo gerou mais chutes; marcação pesada, mais faltas. Não são as mesmas condições do experimento CPU nem um ajuste a estatística de campeonato real.

- 60 seeds adicionais verificam repetibilidade, cartões, trocas e soma de minutos = 990 menos o tempo perdido por expulsão. Testes de contexto/lesão, sem reentrada, snapshot/retomada, estado inválido, suspensões acumuladas/segundo amarelo, resets, reinícios e compatibilidade legada.
- Mantida a calibração existente de 1.000 jogos assistidos e acrescentada a mesma matriz de 1.000 com reinícios v2, além das regressões de força/tática/clima, carreira, finanças, mercado, empregos e armazenamento. Ela mede cenários distintos; não afirmar equivalência estatística das duas granularidades nem calibração por dados oficiais.
- Validação final, publicação e SHA exato de produção serão registrados na PR após execução e conferência. Não alegar suíte monolítica verde a partir de execuções parciais.

## Gemini e continuidade

Gemini continua **OFF**, sem chamada real nem ativação paga: chave Google utilizável/modelo/custo/habilitação ainda não disponíveis na configuração validada. A decisão E7 em produção é interna/determinística; não alegar integração de IA tática ativa. Mantidos opt-in, autorização, revisão, cache, quotas, circuito e fallback do piloto E4. A configuração de servidor do Supabase já existente foi preservada, sem segredos em código ou logs.

E8 não iniciada. Rollover deve preservar e ampliar os coletores do histórico, nunca apagar súmulas para contornar a guarda.
