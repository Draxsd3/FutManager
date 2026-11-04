# Calendário brasileiro — referência 2026

## Escopo

Implementação solicitada em 04/11/2026: **somente calendário brasileiro, por enquanto**. Sem seleções, Datas FIFA, Libertadores ou Sul-Americana. A interrupção da Série A para a Copa do Mundo é uma regra do calendário doméstico de 2026, não um calendário de seleções.

Esta implementação data os confrontos que o motor de carreira já gera. **Não é uma importação da tabela oficial de jogos e não substitui os formatos simplificados dos campeonatos.** Não altera participantes, acesso/rebaixamento, critérios de entrada da Copa, número de pernas, regulamentos estaduais ou cria competições regionais a partir do catálogo.

## Comportamento

- Cada partida recebe `scheduledDate` ISO civil, persistida no progress JSON. Cálculos em UTC; apresentação brasileira sem deslocamento de fuso.
- Nova carreira usa a temporada escolhida de referência, 2026, não o ano do relógio da máquina. Começa no primeiro compromisso datado.
- A agenda exibe as datas e distingue previsão do jogo de tabela oficial. Adversários das fases condicionadas continuam ocultos.
- A ordem passa a seguir o dia do ano (`calendarRound`), mantendo `competitionRound` separado.
- Série A: janela 28/01–02/12, com 18/38 das rodadas antes de junho; retorno em 22/07. Para elencos menores, distribui proporcionalmente as rodadas existentes. Não fixa partidas a cada sete dias.
- B: 21/03–14/11 para a liga gerada, sem interrupção em junho/julho. As referências de playoffs (21 e 28/11) são exibidas, mas esta entrega não cria os playoffs nem altera o acesso.
- C: 05/04–25/10; D: 04/04–13/09. Suas fases reais continuam dependendo de evolução do motor de competições.
- Estaduais: 11/01–08/03. Não apresenta todos os estaduais como tendo regulamento idêntico.
- Copa existente: alinha suas etapas da final para trás às janelas das nove fases de 2026, com final em 06/12. O chaveamento permanece simplificado; não inventa jogos de volta/inscrições tardias.
- Intervalo conservador de três dias civis entre compromissos do mesmo clube, inclusive fases condicionadas, pois o motor ainda não tem horários de início/fim.
- Conflitos são remanejados dentro da janela. Formatos excessivos (ex.: antiga liga de 96 clubes em ida/volta na D), competições vencidas em saves antigos ou falta de espaço geram aviso e partidas sem data. Nunca ocultar partidas, criar datas fora do período ou marcar dois jogos do clube no mesmo dia. Os formatos precisam ser corrigidos em uma tarefa própria; esses jogos continuam no save, explicitamente sem data.
- Ao continuar após o resultado, a data civil salta para o próximo compromisso, sem +7 fixo. Empréstimos vencem conforme essa data e saem do elenco, titulares, banco e posições. Ao carregar, a data é alinhada ao compromisso retomado antes de verificar os empréstimos, sem retroceder.
- Jogos de fundo da Copa não são mais publicados como já disputados antes de suas datas; os resultados privados usados na projeção da chave não são resultados oficiais da carreira.

## Persistência e compatibilidade

`CareerSeason.version` permanece 1. Campos opcionais `calendarVersion`, `calendarIssues`, `scheduledDate`, `dateSource` não exigem migração SQL. Ao carregar saves sem calendário, datar somente jogos não concluídos, sem reconstruir IDs, chaves, resultados ou contribuições. Partidas já disputadas ficam intocadas. Rodadas atrasadas da Série A de saves antigos podem ser remanejadas após 22/07. Se não couberem no ano, avisar em vez de avançar artificialmente ao próximo ano.

Versão do calendário: 2. Reaplicar a mesma versão é idempotente. Anos posteriores são identificados como **projeção da referência 2026**, não calendário oficial desses anos. A interrupção excepcional de 2026 não é repetida automaticamente.

## Fontes oficiais consultadas

- Calendário geral e janelas de transferências: https://www.cbf.com.br/a-cbf/noticias/informes/a/cbf-oficializa-datas-do-calendario-do-futebol-do-brasil-profissional-masculino-de-2026
- Série A / 18 rodadas antes da interrupção / retorno em 22/07: https://www.cbf.com.br/a-cbf/noticias/informes-cbf/a/cbf-realiza-conselho-tecnico-da-serie-a-de-2026
- Série B e tabela básica de 06/02/2026: https://www.cbf.com.br/futebol-brasileiro/noticias/campeonato-brasileiro/a/cbf-divulga-documentos-tecnicos-do-brasileirao-da-serie-b-de-2026
- PDF B consultado (jogos durante a Copa, rodada 38 em 14/11 e playoffs em 21 e 28/11): https://stcbfsiteprdimgbrs.blob.core.windows.net/img-site/cdn/Tabela_Basica_Brasileiro_Serie_B_2026_efe6ba77b5.pdf
- Copa do Brasil, tabela básica de 06/01/2026: https://stcbfsiteprdimgbrs.blob.core.windows.net/img-site/cdn/Tabela_Basica_Copa_do_Brasil_2026_77efe8f233.pdf
- Série C: https://www.cbf.com.br/futebol-brasileiro/noticias/noticias-campeonato-brasileiro-serie-c/a/cbf-publica-documentos-tecnicos-da-serie-c-de-2026
- Série D, janela geral: https://www.cbf.com.br/futebol-brasileiro/noticias/campeonato-brasileiro/a/com-aumento-nas-cotas-de-participacao-cbf-realiza-conselho-tecnico-da-nova-serie-d
- Série D, abertura em 04/04 na tabela detalhada: https://www.cbf.com.br/futebol-brasileiro/noticias/campeonato-brasileiro/a/cbf-divulga-tabela-da-serie-d

Os PDFs de tabela básica alertam que não são a programação definitiva de dias, horários e estádios. Não copiar o anúncio inicial de pausa da Série B: a tabela publicada posteriormente tem partidas durante a Copa. As referências de regionais, Supercopa e mercado são informativas na agenda e não inscrevem clubes nem impõem uma regra nova de negociação.


## Reinício e calendário compartilhado — 04/11/2026

Por solicitação explícita do usuário, as carreiras anteriores foram aposentadas na versão `cbf-2026-reset-20261104`. A regra anterior de preservar/migrar todas as carreiras não se aplica a este reinício. Cada nova carreira recebe `careerRuleset`, persistido localmente e em `game_saves.state`. Não usar `updatedAt` como corte: dispositivos antigos podem reenviar dados antigos com uma data de atualização nova. O marcador não muda a cada deploy e as novas carreiras não são apagadas ao reabrir o jogo.

O planejamento agora é calculado sobre **todas as divisões nacionais e todos os estaduais disponíveis no catálogo**, antes de selecionar as competições da carreira. Os períodos da Copa são reservados também aos possíveis classificados. Assim, mudar o clube escolhido, seu estado ou o caminho projetado na Copa não altera as datas das rodadas comuns. O save armazena apenas as competições pertinentes, e não uma cópia desnecessária de todas as partidas do mundo. Mesmo catálogo e ano produzem o mesmo planejamento; catálogos editados podem ter participantes e números de rodadas diferentes.

As janelas são as documentadas acima: estaduais jan–mar; A jan–dez com interrupção e retorno em 22/07; B mar–nov; C abr–out; D abr–set; Copa até 06/12. Todas as novas carreiras começam na referência 2026 e a passagem do tempo continua vinculada às datas dos jogos. Esta mudança não transforma o formato simplificado das competições na tabela oficial da CBF: inclusive a antiga limitação de formatos excessivos e jogos sem data continua explicitamente indicada, em vez de inventar datas fora dos períodos. Não foi importada uma tabela oficial de confrontos.

### Exclusão e operação

- No carregamento da conta, filtrar o IndexedDB/localStorage, sobrescrever ambos com somente carreiras da nova regra e remover a sessão da carreira antiga, mesmo offline.
- A fusão com a nuvem também filtra carreiras aposentadas; o cliente atualizado recusa reenviá-las.
- Ao conectar uma conta, ler todas as páginas do Supabase e excluir suas carreiras aposentadas em lotes, com escopo explícito de proprietário e RLS. Chaves estrangeiras removem os dados derivados por cascata. Falha de rede não ressuscita as carreiras; a limpeza será tentada novamente.
- Para exclusão **global imediata**, aplicar `supabase/migrations/20261104160000_reset_careers_cbf_calendar.sql`. A migração remove todas as carreiras antigas de todas as contas e impede que clientes antigos as recriem. Não afeta contas, editor, catálogo, uniformes ou checkpoints de importação. **Não confundir deploy Vercel com execução da migração.** Nesta sessão o conector Supabase retornou `disconnected`: a migração foi preparada, mas não foi executada remotamente. Sem a migração, a exclusão física na nuvem ocorre por conta ao acessá-la.
