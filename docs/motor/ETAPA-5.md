# E5 — técnicos, diretorias e emprego humano

Implementação incremental sobre E2–E4. Sem redesenho das telas e sem habilitar chamadas Gemini.

## Modelo e adoção

- `simulation/coaches.ts`: `CoachState` versionado `coaches-v1` dentro de `managerMarket.staff`; identidade de técnico independente do emprego, origem catálogo/humano/simulado, reputação, contrato e trajetória. O nome em `managerMarket.clubs` continua uma projeção compatível com as telas antigas.
- Adoção na criação/abertura da carreira, depois de finanças: mantém save, universo congelado, clubes, jogadores, seed, caixa e resultados. Começa o contrato simulado na data salva, sem retroagir folha ou inventar empregos reais. Jogos já processados não viram retrospectivamente avaliação do novo vínculo.
- O humano tem identidade própria, inclusive quando homônimo de um técnico da base. Sem identificador universal de treinador na base do editor, nomes normalizados repetidos **entre clubes do catálogo** são tratados como uma identidade de simulação: preserva-se o primeiro vínculo na ordem estável de IDs e os demais ficam vagos. Isso é uma política de adoção, não prova de identidade civil. IDs permanecem estáveis depois da adoção.
- Biografias conhecidas continuam sendo referência datada da fonte original; salário, reputação, objetivos e empregos da carreira são explicitamente simulados. Novos candidatos sem fonte têm nome “Treinador simulado …”, nunca biografia real inferida.

## Regras do jogo, não regras trabalhistas oficiais

Os parâmetros são política inicial centralizada em `COACH_RULES` e auxiliares do mesmo módulo:

| Tema | Política implementada |
|---|---|
| Escala de nível | 1–20, a mesma do editor; reputação nessa escala |
| Objetivo | nível ≥15: disputar títulos; ≥10: parte superior; demais: consolidar clube |
| Expectativa-base | `clamp(0,8 + nível/10; 0,9; 2,4)` pontos por jogo |
| Expectativa por confronto | `clamp(1,5 + 1,5 × (base própria − base adversária); 0,6; 2,4)` |
| Avaliação | últimos 8 jogos conhecidos; no mínimo 5; soma de pontos / soma esperada |
| Demissão | rendimento abaixo de 55% da expectativa, **somente** com caixa livre para rescisão |
| Salário mensal | R$ 2.500 + R$ 150 × nível, simulado e não calibrado como salário real |
| Contrato | 12 meses; sem renovação automática oculta; expiração cria vaga |
| Contratação | luvas de um salário + cobertura livre para 12 salários, além das obrigações E3 |
| Rescisão pela diretoria | até dois salários, limitada ao restante estimado do contrato (mês de 30 dias para esta multa simulada) |
| Saída voluntária | encerra vínculo antigo sem multa nesta política inicial; não transfere caixa ou elenco |
| Vaga CPU | permanece aberta ao menos 7 dias simulados; proposta humana válida preserva seu prazo |
| Proposta humana | 7 dias, versão da vaga, revalidação de propriedade da vaga e finanças ao aceitar |
| Técnico demitido | 14 dias antes de nova contratação; vale também para o humano |

Não é uma reprodução de cláusulas legais ou valores do mercado real. Diretoria e torcida não foram transformadas em personalidades reais presumidas. O indicador legado de confiança do hub continua informativo; a decisão empregatícia usa a avaliação E5, explicitada na diretoria, e não uma proteção escondida do humano.

## Executor e finanças

`hireCoach` e seu executor de snapshot privado são comuns ao humano e CPU. Validam emprego exclusivo, vaga, data de disponibilidade, caixa, payables, reservas e horizonte salarial. A CPU processa seu lote no snapshot do avanço, sem copiar/acumular toda a folha novamente para cada contratação. O aceite humano calcula o snapshot inteiro antes de publicar o checkpoint sob Web Lock/CAS.

Contratos têm chave `coach:<id>` e `personKind: coach` no livro E3: competência civil, pagamento e obrigação salarial usam exatamente o mesmo serviço dos atletas; técnicos não recebem inscrição de jogador. Luvas e rescisão são lançamentos `coach-fee`, uma vez. Falta de caixa adia demissão/contratação, sem descoberto artificial. Contrato adotado não cobra luvas nem períodos anteriores.

Avaliação ocorre no avanço atômico pós-partida; os resultados vêm dos fixtures realmente concluídos na carreira. Ao mudar de clube, resultados anteriores à chegada são marcados conhecidos, não atribuídos ao novo técnico. Propostas de outros clubes são encerradas ao aceitar uma vaga; clubes/finanças da carreira e demais saves permanecem separados.

## Desemprego jogável e projeções

- Demissão/expiração encerra emprego e trajetória humana. `save.clubId` retém o último clube como referência de compatibilidade, **não** como autorização: o vínculo canônico está em `staff.coaches[humanId].clubId`.
- Hub sem clube apresenta a central de empregos e “Avançar uma semana”; não exige partida, adversário ou escalação. O antigo clube passa a CPU, inclusive para seu mercado e resultados do calendário existente. Não há controle de elenco, obras, treinos ou finanças enquanto desempregado; o serviço financeiro de ações também recusa negociações humanas.
- Aceitar proposta retorna ao mesmo save com calendário/elenco/orçamento do destino. O contrato do eventual novo CPU do antigo clube não é removido pelo retorno do humano ao mercado de empregos.
- Tela Técnicos projeta identidades canônicas, incluindo desempregados, salário/contrato simulados, reputação, objetivo e trajetória. Mantém layout, filtros, CSS e biografias existentes.

## Persistência e testes

- Cache de universos em memória libera apenas carreiras removidas do índice da própria conta, sem despejar universos ativos ou alterar outra conta. Teste específico cobre remoção e isolamento. A correção evita reter snapshots de carreiras apagadas indefinidamente.
- `staff-deflate-v1` no índice local, objeto normal no domínio/nuvem. Compressão nível 6 mantém a rodada com o universo completo dentro da quota de armazenamento; não aumenta quota de testes nem descarta histórico para fazer o save caber. Codecs anteriores continuam legíveis.
- Migração SQL aditiva `20261107050000_coach_checkpoint_guard.sql`: complementa CAS E2/E4, recusa remoção/downgrade de identidades e empregos ativos incompatíveis/duplicados. Nenhum backfill, leitura de saves privados ou reset. Aplicada no projeto FutManager; teste temporário com rollback retornou `coach_guard_passed: true`.
- `simulation/coaches.test.ts`: adoção repetível, homônimo humano, expectativas distintas, demissão/caixa, competência mensal, expiração, contratação CPU, atraso de oferta, exclusividade, reload, replay e CAS recusado.
- `unemployment-screen.test.tsx`: desemprego visível, erro de avanço recuperável e projeção canônica do técnico sem clube.
- `game-board.test.tsx`: avanço semanal real sem fixture, reload e revisão única; fluxo de emprego existente agora cria vaga por expiração e verifica desconto efetivo das luvas, mantendo isolamento de elenco/caixa/outro save. Fixture legada E2 remove também staff, pois nunca teve a entidade E5.
- Runner do sandbox: a suíte de interface acumulada chegou ao heap padrão de ~2 GB antes dos dois últimos cenários, sem falha de asserção nos já executados. A validação integral usa `NODE_OPTIONS=--max-old-space-size=3072 npm test -- --testTimeout=30000`, sem remover testes, mudar quota de armazenamento ou afrouxar asserções.
- Resultados finais de regressão/build/tipos/lint e deploy ficam registrados na PR da entrega; não considerar execuções interrompidas como evidência final.

## Limites e continuidade

E5 entrega o ciclo inicial completo de emprego; não declara concluídos todos os capítulos da especificação. Valores salariais, multa, reputação e metas precisam de calibração; não há negociação avançada de cláusulas, comissão de agente de técnico ou simulação jurídica. A diretoria escolhe internamente; não foi acrescentada chamada externa para técnicos nem usada a chave exposta. O piloto de mercado E4 permanece separado e desativado sem configuração segura.

O desemprego avança o calendário e universo de competições que a carreira já simula, não inventa calendários estrangeiros ou resultados históricos. Rollover/sustentabilidade plurianual e validação de dez temporadas são E8. Base/saúde/identidade de jogadores permanecem E6; tática CPU e disciplina, E7. Não existe promessa de equilíbrio econômico plurianual nesta entrega.

## Validação final local

Suíte integral: **578/578 testes, 111/111 arquivos**, 351,96 s, com o comando de heap documentado acima. Build de produção, `npx tsc --noEmit`, ESLint e `git diff --check` aprovados. O fluxo real de emprego/troca de clube e o de desemprego + avanço + reload passaram dentro dessa suíte. Teste remoto SQL com rollback também aprovado. Nenhum acesso Gemini foi executado.
