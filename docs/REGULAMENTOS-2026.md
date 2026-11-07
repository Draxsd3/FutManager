# Formatos de competições — base 2026

Pesquisa realizada em 06/11/2026, **antes da correção do gerador**. Não confundir notícias do Mineiro 2027 publicadas em outubro de 2026 com o regulamento do jogo, que começa em 2026.

## Causa do erro

O gerador aplicava pontos corridos em turno e returno a todas as divisões, incluindo a D, e turno único a todos os estaduais. O catálogo confundia residência no estado com inscrição na primeira divisão estadual. O centro de competições não recebia os grupos; a galeria premiava o primeiro da tabela, mesmo em competições que exigiam uma final.

## Regulamentos pesquisados e traduzidos em regras

| Competição | Primeira fase | Classificação ao título | Jogos do mata-mata |
|---|---|---|---|
| Série D | 16 grupos A1–A16, 6 clubes; turno e returno; 10 jogos por clube (480 partidas) | 4 de cada grupo; 64 → 32 → 16 → 8 → 4 → 2 | Ida e volta em todas as fases; anexo B determina cruzamentos, com reordenamento acumulado nas quartas |
| Paulista | 16 clubes; 4 **potes de agendamento**, não grupos classificatórios; 8 jogos, 4 em casa | 8 melhores da tabela única | Quartas e semi únicas; final em ida/volta |
| Carioca | 2 grupos de 6; 6 jogos **contra o outro grupo** | 4 por grupo; quartas dentro do próprio grupo; sorteio da semifinal | Quartas únicas, semi ida/volta, final única |
| Mineiro | 3 grupos de 4; 8 jogos **contra os outros grupos**, 4 em casa | 3 líderes + melhor segundo; líderes ordenados antes do segundo | Semis ida/volta, final única |
| Gaúcho | 2 grupos de 6; 6 jogos contra o outro grupo | 4 por grupo; quartas dentro do grupo; semi reordenada por campanha acumulada | Quartas únicas; semi/final ida e volta |
| Paranaense | 2 grupos de 6; 6 jogos contra o outro grupo | 4 por grupo; quartas dentro do grupo; semifinais entre vencedores das duas quartas de cada grupo | Todas ida e volta |
| Catarinense | 2 grupos de 6; 6 jogos contra o outro grupo | 4 por grupo; quartas dentro do grupo; semifinais cruzam os grupos originais | Todas ida e volta |
| Goiano | 3 grupos de 4; 8 jogos contra os outros grupos | 8 melhores **da tabela geral**; semi reordenada por campanha acumulada | Todas ida e volta |
| Cearense | 2 grupos de 5; 4 jogos no próprio grupo (5 rodadas com folga); top 3 de A/B formam C/D | Segunda fase: 3 jogos contra outro grupo, pontos zerados; top 2 por grupo fazem semifinal dentro do próprio grupo | Semi/final ida e volta |

### Série D: acessos e mandos

- Quatro vencedores das quartas garantem acesso à Série C 2027.
- Os quatro perdedores das quartas são reordenados pela campanha acumulada e disputam os playoffs 1º × 4º / 2º × 3º; os dois vencedores também sobem: **seis acessos**, não os seis primeiros de uma tabela geral.
- Volta da segunda fase com o primeiro/segundo da fase inicial; demais fases com melhor campanha acumulada.
- Não há gol qualificado fora. Placar agregado decide; empate nos confrontos regulares é decidido por pênaltis.
- **Ressalva do REC:** art. 17 menciona pênaltis de forma geral, mas o art. 21 §5, específico dos playoffs, dá desempate por melhor classificação final depois de pontos/saldo. O motor adota o artigo específico nos playoffs.
- Registros persistidos: `promotedClubIds` (vagas conquistadas) e `serieDRetainedClubIds` (terceira fase, descontados promovidos). Não altera a divisão nem o elenco durante a temporada; o jogo ainda não tem uma virada plurianual completa das quatro divisões.

### Permanência estadual

- RJ: quatro últimos dos grupos, quadrangular ida/volta, último cai.
- RS: quadrangular ida/volta, dois últimos caem.
- SC: quadrangular ida/volta, melhor quinto inicia com 1 ponto; **três** caem. O bônus é levado ao registro do descenso, não contabilizado como gol ou partida.
- PR: quatro não classificados ranqueados; 1º × 4º / 2º × 3º em ida/volta, perdedores caem.
- CE: quadrangular turno único, dois caem.
- GO: 12º cai diretamente; 10º × 11º em ida/volta define o segundo rebaixado. Janela específica de 10/01 a 15/03 conforme calendário da FGF.
- MG: dois piores entre os últimos colocados de cada grupo; SP: dois últimos da tabela geral.

## Segurança dos dados e limites explícitos desta entrega

- Inscrições usam identidades dos clubes do **universo da carreira**, incluindo clubes sem divisão nacional quando inscritos no estadual. Nenhuma coleta de API, jogador ou clube saudável é sobrescrito.
- Caso um inscrito oficial esteja ausente do universo, ele não é inventado nem substituído por qualquer clube do mesmo estado. A tela informa os nomes ausentes e a simulação fica identificada como inscrição incompleta. Universos personalizados pequenos mantêm o formato simplificado.
- Carreiras antigas sem partida disputada recebem o novo gerador automaticamente. Carreiras já disputadas conservam calendário e resultados originais e exibem aviso de formato legado; não há reset nem reinterpretação retroativa.
- Datas são projeções dentro das janelas, **não reprodução da tabela oficial nem dos horários**. Adversários do Paulista seguem a distribuição de potes, não a reprodução do sorteio real. Novas temporadas são projeções baseadas nas regras de 2026.
- As outras **19 federações** continuam identificadas como formato simplificado; esta entrega não certifica os 27 estaduais.
- Taça Rio, Taça Guanabara, Troféus Farroupilha/Inconfidência, Taça ACESC e jogos estaduais de posicionamento/terceiro/quinto lugar ainda não são competições separadas no motor. Não conceder títulos/vagas fictícios dessas taças.
- Critérios classificatórios básicos são pontos, vitórias, saldo e gols; confronto direto entre dois empatados quando aplicável (D/MG/CE) e sorteio determinístico residual. Critérios disciplinares/sorteios oficiais não são integralmente representados pelo registro atual de partidas. Não declarar aderência integral a todos os artigos dos RECs.
- Regulamento do Goiano tem resumos conflitantes na imprensa. Foi adotada a estrutura de 8 jogos + 3 fases em ida/volta (14 datas), corroborada pela tabela e calendário da FGF. Jogos secundários de posicionamento goianos ainda não estão nesta entrega.

## Fontes

Fontes primárias consultadas:

- CBF, REC Série D 2026, arts. 6, 13–21 e anexo B: https://stcbfsiteprdimgbrs.blob.core.windows.net/img-site/cdn/REC_Brasileiro_Serie_D_2026_2def4ff8f2.pdf
- FMF, REC Mineiro 2026, arts. 8–17: https://esumula.fmf.com.br/Arquivos/ArquivosCompeticao/1899/Arquivo_18992870.pdf
- FGF, REC Gaúcho 2026, arts. 9–19: https://fgf.com.br/Layout/documentos/693c9f182f677gaucha%CC%83o-superbet-2026---rec.pdf
- FPF-PR, REC Paranaense 2026, arts. 8–14: https://federacaopr.sfo3.digitaloceanspaces.com/wp-content/uploads/2023/09/19162139/REC-1a-Divisao-2026.pdf
- FCF-SC, conselho técnico, grupos e permanência: https://fcf.com.br/catarinense-fort-atacadista-2026-comeca-em-07-de-janeiro/
- FCF-SC, REC (chaves das quartas/semis): https://fcf-sc.s3.sa-east-1.amazonaws.com/wp-content/uploads/2025/11/20124600/REC.-Camp.-Cat.-Fut.Prof_.Serie_.A.2026.pdf

Fontes complementares (não substituir REC por resumos genéricos):

- Grupos Série D: https://www.band.com.br/esportes/serie-d-comeca-hoje-veja-grupos-onde-assistir-e-novo-regulamento
- Carioca: https://www.cnnbrasil.com.br/esportes/futebol/campeonato-carioca/entenda-o-regulamento-do-campeonato-carioca-2026/
- Carioca, sorteio das semifinais: https://www.gfesporte.com.br/noticias/futebol/guia-do-carioca-2026-saiba-tudo-sobre-o-campeonato-que-comeca-neste-domingo/26284/
- Paulista: https://www.lance.com.br/futebol-nacional/campeonato-paulista-2026-conheca-o-regulamento-participantes-e-datas.html
- Cearense: https://ge.globo.com/ce/futebol/campeonato-cearense/noticia/2026/01/06/guia-do-cearense-2026-saiba-tudo-sobre-campeonato-e-times.ghtml
- Goiano: https://portalgo.com.br/goias/serie-b-do-goias-molda-goianao-de-2026 e https://goianaoesportes.com.br/goianao-2026/

- FGF-GO, calendário oficial (Goianão 10/01–15/03): https://www.fgf.esp.br/pt/conteudo/?q=1&sc=14
- Goiano, tabela e descenso 12º direto / playoff 10º×11º: https://ge.globo.com/go/futebol/campeonato-goiano/noticia/2025/11/26/veja-a-tabela-do-goianao-2026.ghtml

## Correções identificadas na auditoria posterior

O [REC goiano](https://www.fgf.esp.br/assets/uploads/176833012335.pdf), arts. 19–20, condiciona o playoff de permanência à diferença de até seis pontos e considera os pontos da primeira fase na decisão; a volta pode ser dispensada. A descrição anterior de descenso deve ser lida com essa ressalva. O [REC cearense](https://www.srgoool.com.br/downloads.php?id_anexo=1573), art. 13, não inclui confronto direto nos desempates de grupo ou permanência; a cópia deve ser confrontada com o original e eventuais revisões. Esses pontos requerem verificação no motor antes de considerar a implementação fiel. Veja também [competições.md](competições.md).
