# Contexto do FutManager

Este arquivo é o guia permanente de contexto e regras do projeto. Deve ser consultado no início de cada tarefa, em conjunto com `AGENTS.md`. Novas regras informadas pelo responsável pelo projeto devem ser adicionadas aqui, preservando as anteriores, salvo quando houver uma revisão explícita.

## Resumo do projeto

O FutManager é um jogo web de gerenciamento de futebol. O jogador assume o comando de um clube, administra o elenco, define escalações e táticas, acompanha partidas e desenvolve sua carreira.

O ciclo principal é: consultar o clube e o calendário, preparar o time, simular a partida, tomar decisões no intervalo, analisar o resultado e avançar na carreira.

O projeto inclui telas de gestão financeira, contratos, mercado, treinamento, categorias de base e competições. Algumas dessas áreas ainda têm regras simplificadas e precisam evoluir para uma carreira completa e consistente.

### Tecnologias e referências

- Next.js, React e TypeScript.
- Tailwind CSS para estilos.
- Supabase para persistência em nuvem, com armazenamento local no navegador.
- Vitest para testes automatizados.
- `docs/brasfoot-reference.md`: referência de mecânicas, sem copiar interface, textos ou ativos de terceiros.
- `MECANICA-JOGO.md`: referência de regras de futebol (IFAB), princípios táticos FIFA, limites do motor e critérios para implementar mecânicas sem apresentar simplificações como regras oficiais.
- `docs/match-engine.md` e `public/game-assets/match-engine-rules.md`: referência canônica da mecânica de partidas e configuração que o jogo lê antes de cada início/retomada.
- `docs/top-eleven-reference.md`: pesquisa das informações públicas do Top Eleven e princípios de simulação/visualização que inspiram o FutManager, sem presumir acesso ao motor proprietário.
- `src/components/game-board.tsx`: coordenação atual dos principais fluxos do jogo.
- `src/lib/game/`: regras e persistência.
- `supabase/migrations/`: evolução do banco de dados.

## Regras de trabalho

### 1. Entregar as alterações na main

A `main` é o destino final das correções e melhorias, não apenas uma branch temporária de trabalho.

Respeitar as restrições do ambiente: em cada sessão Arena, todo trabalho e push devem ocorrer exclusivamente na branch ativa designada pelo ambiente. A integração na `main` deve ocorrer por pull request dessa branch, respeitando as permissões e proteções do repositório. Não fazer checkout nem push direto para outra branch quando o ambiente proibir.

### 2. Sempre publicar as correções no GitHub

Após implementar e validar uma correção, fazer commit e push das alterações pertinentes para o GitHub na branch permitida e encaminhar sua integração na `main` por pull request.

Antes de publicar, revisar o diff, executar as verificações aplicáveis e não incluir credenciais, arquivos temporários ou alterações alheias à tarefa. Caso alguma etapa esteja bloqueada, informar o bloqueio e o que ficou pendente.

### 3. Verificar a produção na Vercel

Uma correção só deve ser considerada entregue em produção após verificar:

1. Sua integração na `main`.
2. O deploy de produção da Vercel correspondente à alteração, com status de sucesso.
3. O funcionamento do fluxo corrigido na URL de produção, quando houver acesso para essa validação.

Um push, um build local ou um deploy de preview não comprovam entrega em produção. Não afirmar que está rodando em produção sem evidência. Se não for possível verificar o deploy ou o comportamento, comunicar claramente a limitação e a pendência.

### 4. Manter este contexto atualizado

Adicionar neste arquivo as novas regras e decisões de contexto fornecidas pelo responsável pelo projeto. Em caso de conflito com instruções de prioridade superior ou limitações do ambiente, explicar a restrição e registrar um procedimento compatível, sem prometer ações que não possam ser executadas.

### 5. Fazer o merge ao concluir

O responsável autorizou fazer o merge de cada entrega para a `main` sem nova confirmação, após revisar o diff e validar as alterações. Usar o número explícito do pull request e merge imediato (não usar `--auto`). Respeitar proteções e informar qualquer bloqueio.

### 6. Contas e carreiras independentes

- Ao abrir o link em uma nova sessão/aba e após qualquer login, apresentar o menu inicial; nunca reabrir automaticamente editor, seção ou carreira após autenticação. Exceção de usabilidade: atualizar a página na mesma aba durante uma carreira ativa deve restaurar a tela e o progresso da sessão; partida em andamento retorna pausada. A ação deliberada Menu inicial encerra a retomada automática para que o próximo início volte ao menu.
- Login e cadastro com email e senha pelo Supabase Auth, sem armazenar senhas em tabelas próprias.
- Uma conta pode ter várias carreiras independentes. Saves, elenco e táticas não podem vazar entre contas ou carreiras.
- Usar os controles de navegação existentes, como Menu inicial na barra superior. Não exibir o botão flutuante “Salvar e voltar ao início”, removido a pedido do responsável. Manter o salvamento automático.
- Armazenamento local separado por usuário; nuvem protegida por políticas RLS de proprietário.
- Nunca incluir chaves secretas do Supabase no cliente ou no repositório.

### 7. Navegação da agenda

Ao clicar em Agenda, abrir primeiro um submenu com Jogos do seu time, Jogos amistosos e Central de empregos. Só navegar após escolher uma opção. A agenda deve priorizar clareza, próximo compromisso e calendário legível, sem inventar partidas, propostas ou funcionalidades ainda indisponíveis.

### 8. Carreiras, navegação principal, competições e estádio

- A tela de carregar carreiras deve ter visual moderno, cards, busca por clube/técnico/carreira e ordenação. Continuar/excluir sempre atua na carreira escolhida e mantém o isolamento por conta.
- A navbar deve oferecer **Principal**, voltando ao elenco/jogadores da carreira atual, sem confundir com **Menu inicial**.
- A central de competições deve permitir consultar outros campeonatos além do clube controlado, organizada em Nacional, Internacional, Seleções, Estadual e Regional, com busca e filtro de localidade.
- O catálogo não presume inscrições fora do banco do editor. As temporadas novas agora criam calendário e resultados persistidos para a liga da divisão, Copa do Brasil e estadual da região do clube; estatísticas e classificações vêm somente dos jogos concluídos. Outros torneios continuam como catálogo sem resultados até receberem participantes e formato próprios.
- O estádio deve apresentar ficha do clube, capacidade, caixa, folha salarial, infraestrutura e simulador de bilheteria. A imagem é ilustrativa. Simulação é hipotética, não altera ingressos, caixa nem patrimônio; obras e condições técnicas não cadastradas não podem ser inventadas.

### 9. Centro tático e escalação

- Remodelar toda a tela de escalação com visual moderno, campo central, plano tático, indicadores, reservas pesquisáveis e alertas.
- Jogadores devem aparecer como camisas numeradas, não fotos. Remover a opção de adicionar/remover fotos da escalação. Manter compatibilidade com saves antigos; o número cadastrado do editor tem prioridade sobre o identificador legado.
- Arrastar e soltar deve funcionar com mouse e toque, com prévia da camisa, indicação de destino, cancelamento seguro e alternativa por seleção + clique/teclado. Arraste de reservas é iniciado pela camisa; campo e banco completo devem caber simultaneamente na área visível, sem rolagem da tela ou do banco.
- Exibir opções de todos os setores: pontas, centroavante, meias, meio central/lados, volantes, laterais, zaga e goleiro. Área livre permite posição personalizada; outra camisa permite troca. Não restringir funções: qualquer jogador, inclusive goleiro, pode ocupar qualquer área ou trocar com qualquer titular. Esta decisão substitui a proteção de posição anterior.
- Reabrir a escalação deve preservar titulares e posições personalizadas. Alterar a formação reorganiza automaticamente; restaurar posições mantém os titulares. Salvar mudanças de titulares e coordenadas atomicamente.
- Indicadores de adaptação usam a função mais próxima do esquema, como no motor atual; não fingir que setores são novas posições detalhadas do simulador. Não exibir controles de batedores/capitão com efeitos inventados ou não persistidos.

### 10. Liberdade de posicionamento e visão completa da tática

- Campo e banco de reservas devem permanecer visíveis ao mesmo tempo, dimensionados à altura disponível da janela. Não exigir rolagem da tela nem do banco para alcançar titulares/reservas. Informações secundárias podem ficar em painel próprio; em telas estreitas, o plano tático é aberto sob demanda sem empilhar o banco abaixo do campo.
- Guias de defesa, meio, ataque e subposições devem começar **desligadas**. Ativar “Mostrar setores” oferece orientação visual e alvos opcionais, nunca restrições ou encaixe automático durante o arraste.
- Posicionamento é livre em toda a superfície do campo: remover limites por função e zona, inclusive entre goleiros e jogadores de linha. Trocas continuam atômicas e sem duplicar atletas; adaptação permanece apenas informativa no planejamento, com o cálculo existente do motor.
- A camisa acompanha o ponteiro preservando o ponto de pega; soltar em área livre mantém a coordenada escolhida, sem voltar a posições fixas. Cancelar ou soltar fora do campo não altera a escalação.

### 11. Editor de clubes e camisas personalizadas

- Modernizar o editor e preservar os três uniformes existentes. Permitir criar camisas adicionais por clube, sem substituição dos modelos cadastrados.
- Toda geração por IA deve incluir automaticamente nome do clube e seus patrocínios, além de cores, identidade e template consistente de proporção/enquadramento. Manter realismo e coerência visual; revisar escudo, marcas e textos, cuja reprodução exata não é garantida pelo modelo.
- Patrocínios são cadastrados pelo jogador por clube; não apresentar marcas presumidas como patrocínios oficiais atuais. Exigir inscrições ou confirmação explícita de ausência de patrocínio antes de montar um pedido válido.

#### Implementação e pendências técnicas desta entrega

- Estúdio oferece criador manual identificado como não IA, importação PNG/JPG/WebP, preview, prompt completo/cópia e até oito modelos adicionais por clube, com download e exclusão confirmada.
- Biblioteca e patrocínios são locais, em IndexedDB por `[userId, clubId]`, sem sincronização em nuvem. Isso deve permanecer visível na interface. Não inserir imagens base64 no banco de dados do editor nem fingir que a biblioteca altera os uniformes das partidas.
- Endpoint `/api/kits/generate` integra OpenAI apenas no servidor, verifica sessão real Supabase e reconstrói o prompt a partir dos dados validados. Não aceita prompt integral arbitrário como substituto da identidade obrigatória. Nunca expor a chave secreta no cliente.
- Migração `20261029140000_kit_generation_quota.sql` fornece cota persistente, atômica e por conta (3 tentativas/janela de 1h), com RLS e acesso somente por função autenticada. Sem migração/cota válida, falhar fechado antes de chamar o provedor; não substituir por limite em memória.
- Em 29/10/2026, a Vercel não tinha `OPENAI_API_KEY` e a migração não foi aplicada remotamente. Geração real segue indisponível; não afirmar que foi ativada/testada com imagens pagas. Administração precisa aplicar a migração, configurar chave server-only de forma segura e redeployar, conforme README. Modelo padrão `gpt-image-1`, opcional `OPENAI_IMAGE_MODEL`.
- Validação local: testes automatizados de prompt, API simulada, isolamento IndexedDB e interface; Chromium em 1536/1366/1024/390/844 pixels, persistência após reload, troca de clube, importação raster real e diálogo por teclado. Cota SQL exercitada em PostgreSQL local/PGlite, não em Supabase remoto.

### 12. Partida textual e regras obrigatórias do motor

- Pedido explícito de 30/10/2026: remover temporariamente o minicampo/visão gráfica durante a partida; o acompanhamento ao vivo deve priorizar estatísticas dos dois times no topo, taça do campeonato e linha do tempo de momentos importantes (sem passes rotineiros). O pós-jogo segue estilo central de resultados com abas de eventos, estatísticas e formações estáticas dos dois times, mais todos os jogos da rodada ao lado. Não copiar interface, textos ou ativos do Brasfoot/Google; usar somente o padrão funcional como referência.
- Antes de iniciar **ou retomar** uma partida, ler `public/game-assets/match-engine-rules.md` sem cache. Validar a configuração incorporada ao Markdown e impedir início/retomada se a leitura ou validação falhar. Regras de implementação ficam explicadas em `docs/match-engine.md`.
- O motor deve usar força/overall, qualidades/habilidades disponíveis, energia/condição, motivação/vontade estimada, formação/posição como referência organizacional, estilo, marcação/pressão, foco de ataque, goleiro e clima simulado. Não inventar atributos numéricos ausentes. A equipe superior tem vantagem estatística consistente, sem eliminar surpresas plausíveis.
- Passe, finalização, gol, defesa, desarme, falta, impedimento, posse, placar, comentário, estatísticas, cartões e notas devem derivar de eventos coerentes. O clima e a semente ficam fixos na partida e são salvos para uma retomada estável.
- Aplicar o desgaste final à energia dos atletas conforme minutos, pressão e temperatura. Jogos secundários simulados também devem considerar força relativa e não antecipar gols futuros.
- As posições escolhidas pelo treinador são organização inicial e contexto de adaptação; não são limites rígidos para o comportamento. No acompanhamento ao vivo da partida não mostrar campo, jogadores/bolinhas ou animações gráficas. Exceção vigente: o modal de ajustes táticos aberto pelo usuário pode mostrar a prancheta para editar a organização, sem apresentar movimento ou simulação ao vivo; consultar a seção 28. No pós-jogo pode haver apenas uma prancheta estática com as formações dos dois times, sem simulação visual ao vivo.

### 13. Proporção profissional obrigatória das camisas

- A camisa branca enviada pelo responsável em 29/10/2026 é o molde de referência: mesma silhueta, gola em V, mangas, ombros, comprimento e barra para os novos modelos. Não usar formas infantis/cartoon; priorizar acabamento profissional de tecido e costuras. A proporção aproximada da peça, incluindo mangas, é 0,86 (largura/altura).
- Sem camisa cadastrada, gerar a principal na primeira cor do clube e a reserva na segunda, sempre no mesmo molde. Exemplo expresso: vermelho/preto → principal vermelha e reserva preta. Não usar um formato diferente para cada cor nem atribuir cores de outro clube a times personalizados.
- Implementação: molde fotográfico transparente derivado da imagem fornecida em `src/lib/kits/fabric-template.json`; script reproduzível `scripts/build-kit-template.mjs`. Criador, uniformes automáticos e camisas numeradas compartilham o molde. Importações são projetadas nele e a IA recebe a imagem de referência, com recorte/mascaramento posterior no servidor. Acervo anterior é preservado sem regravação destrutiva.
- IA continua indisponível até configurar a chave e aplicar a migração; não confundir colorização/recorte determinístico ou testes com imagens simuladas com geração paga real.

### 14. Tela de partida e minicampo — registro histórico

> A visualização gráfica descrita abaixo foi removida temporariamente conforme a regra atual da seção 12. Manter a informação como histórico; não reintroduzir campo/bolinhas até solicitação explícita.

- A tela de acompanhamento deve apresentar uma visualização moderna com minicampo, preservando placar, estatísticas, lances, resultados da rodada e controles de velocidade, pausa e táticas.
- As bolinhas partem da formação e das posições personalizadas, que representam a organização inicial do time — não limites de movimentação. Durante o jogo, os atletas se deslocam conforme bola, posse, apoio, cobertura e função; o adversário usa formação genérica quando sua escalação real não está disponível.
- A visualização de partida utiliza lances simulados estruturados, compartilhados pelo placar, resumo e minicampo; respeita as posições configuradas e para ao pausar. O adversário ainda tem formação genérica e o modelo é simplificado, não uma simulação física completa.
### 15. Demarcações completas do campo

- Referência enviada em 29/10/2026 inclui ST/CF, pontas, meia ofensivo, meias dos lados, meios centrais, volante, alas, laterais, zagueiros dos três lados e goleiro. Oferecer todas essas posições visualmente, incluindo segundo atacante, alas esquerdo/direito e zaga esquerda/central/direita.
- As demarcações podem se encostar: não deixar faixas vazias entre regiões. Implementação usa 20 áreas contíguas que cobrem todo o campo, com limites compartilhados e siglas da referência; nomes acessíveis em português.
- Preservar guias desligadas por padrão, liberdade total de arraste (sem snap ou bloqueio por posição), coordenadas salvas e campo/banco juntos sem rolagem. Demarcações são orientação visual e destinos opcionais por clique/teclado, não novas restrições do motor.


### 16. Lances e resultados ao vivo

- Simular e registrar passes, finalizações, gols, desarmes, faltas, cartões e impedimentos da partida do clube. O mesmo evento alimenta o relato textual, o placar e o relatório pós-jogo; os placares dos demais confrontos avançam com o relógio sem visualização gráfica.
- Registro atualizado em 30/10/2026: os demais jogos são simulados nos confrontos do calendário persistido da competição; o resultado só é aplicado quando a rodada é concluída. Os placares paralelos são reproduzíveis e não antecipam gols de rodadas futuras. A classificação da temporada atual é acumulada do ledger de partidas concluídas; títulos/histórico de temporadas anteriores continuam sem reconstrução automática.
- O motor continua simplificado: não há física contínua nem escalação real de adversário quando os dados não existem; turnovers representam passes interceptados, mas não cobrem todo tipo de erro técnico. Saves antigos continuam legíveis; ao retomar, a partida fica pausada.
### 17. Reduzir poluição das demarcações e largura do campo

- Regiões da mesma posição, como CB, devem aparecer juntas, sem linhas internas cortando-as. Aplicar também a CM e ST; usar uma única sigla visível por função, preservando destinos esquerdo/central/direito por teclado e coordenadas livres.
- O campo estava excessivamente largo: limitar sua largura pela altura disponível, centralizar e manter proporções calibradas em vez de esticá-lo até preencher a coluna. Implementação da prancheta: proporção de apresentação 6:5 em desktop/paisagem e 68:105 em telas estreitas; não equivale a simular dimensões físicas universais de estádio.
- Preservar campo e banco completo visíveis, guias opcionais inicialmente desligadas, todos os lados e arraste sem snap. O ajuste visual não deve regravar posições ou alterar a escalação.

### 18. Banco de reservas compacto

- Na escalação, manter campo, banco completo e indicadores principais visíveis, inclusive em telas pequenas. Cards de reservas exibem apenas identificação, posição e força; detalhes ficam na ficha aberta por duplo clique, tecla I ou botão acessível após selecionar o atleta.
- Segurar ou arrastar um reserva levanta uma prévia; soltá-lo em um titular ou no campo faz a substituição, e soltá-lo em outro reserva reordena o banco. Cancelar não modifica escalação. Disponibilizar reordenação também por botões na ficha e persistir a ordem no elenco da carreira.
- Usar imagem ilustrativa de banco de reservas como fundo, preservando contraste e legibilidade. A imagem foi gerada para o projeto e não representa um estádio específico.

### 19. Fluidez e melhores momentos na partida — requisitos gráficos históricos

> A interpolação visual de bola/jogadores está suspensa pela regra atual da seção 12. Mantém-se abaixo o registro histórico; não reintroduzir gráficos até pedido explícito.

- No modo textual, o acompanhamento ao vivo lista os eventos por minuto, inclusive circulação/passagens e ações rotineiras, para dar continuidade ao relato. O relatório pós-jogo pode filtrar melhores momentos, mantendo todos os eventos internos para estatísticas e retomada.
- A formação e as posições escolhidas continuam sendo organização inicial e referências internas, não limites de movimentação.
- O adversário usa escalação simulada com atletas cadastrados quando disponíveis; se não houver dados, identificar genericamente o autor em vez de inventar nome. O modelo continua simplificado, não reprodução exata de jogo real.

### 20. Goleiros e comemoração gráfica de gol — suspenso

> Comemorações sobrepostas e animações de goleiro pertencem à visão gráfica temporariamente retirada. Gols continuam relatados em texto com autor e minuto; não exibir overlays ou movimento gráfico.
### 21. Táticas durante a partida no padrão da escalação inicial

- Pedido de 29/10/2026: modernizar as táticas durante o jogo, podendo usar a mesma tela de táticas anterior ao início da partida.
- Reutilizar `LineupScreen` em modo de partida: mesma prancheta proporcional, camisas numeradas no molde obrigatório e nas cores cadastradas do clube, banco completo ao lado, busca/filtros, plano tático e guias opcionais desligadas por padrão. Não reintroduzir fotos ou posições fixas.
- Manter placar, relógio pausado, intervalo, estatísticas, lances e quantidade de substituições restantes. Em telas menores, o plano tático abre pelo botão do cabeçalho; placar/tempo continuam visíveis mesmo em paisagem.
- Substituições são preparadas por seleção em qualquer ordem ou arraste de reserva e exigem confirmação explícita na barra inferior, fora do banco para não esconder reservas. Cancelar ou sair sem confirmar não muda o XI nem consome substituições. Ao esgotar o limite, o reposicionamento de titulares continua livre.
- O controlador real mantém pausa/retomada e autosave; o mesmo helper de posicionamento transfere as coordenadas do atleta que sai (ou aplica o ponto livre solicitado) ao que entra, preservando os demais. Reservas nunca passam pelo atalho de troca pré-jogo sem confirmação.
- Regressões automatizadas cobrem seleção, confirmação/cancelamento, arraste, limite, plano tático, cores, foco e integração com partida/autosave. Revisão Chromium local em cinco resoluções, incluindo 14 reservas, preparação e confirmação, sem rolagem da página ou erros de execução. Rota temporária de revisão removida antes da publicação.

### 22. Movimentação coletiva durante a partida

- A formação e as posições manuais definem a organização inicial, não pontos que prendem os atletas. Com bola, sem bola e em transição, o desenho coletivo se desloca; o jogador mais próximo pode pressionar, enquanto companheiros dão apoio e cobertura. A resposta do goleiro privilegia a proteção da meta, mas não o congela na coordenada inicial.
- Interpolar todos os jogadores suavemente em um único ciclo; pausa e intervalo congelam a posição atual, velocidade acelera o movimento e a preferência de movimento reduzido é respeitada. As posições escolhidas não são regravadas durante a visualização. As coordenadas dinâmicas também informam seleção de ator/alvo e impedimento simplificado; o modelo continua heurístico, não é física completa.
- Referências de formação relacionada à bola e movimento sem bola incluem UT Austin Villa (https://www.cs.utexas.edu/~pstone/Papers/bib2html-links/LNAI12-MacAlpine.pdf) e PhysicsFC (https://arxiv.org/html/2504.21216v1). Top Eleven inspira a apresentação de uma forma coletiva fluida; suas fórmulas proprietárias não são públicas e não são copiadas.

### 23. Táticas rápidas em modal durante a partida (histórico, revisado pela seção 28)

- Correção anterior do responsável: as táticas durante o jogo devem ser um modal, não outra tela completa, pois servem para alterar formação e fazer substituições. O formato modal continua vigente; a composição descrita abaixo foi atualizada pela seção 28.
- Usar cartão central com dimensões limitadas, fundo da partida visível e escurecido, cabeçalho compacto com placar/minuto e apenas formação, titulares e reservas. Não reproduzir campo, plano tático avançado, indicadores e estatísticas dentro do modal.
- A formação é aplicada ao selecionar; substituições exigem seleção de quem sai/entra e confirmação. Fechar, Escape ou clicar fora descarta a troca ainda não confirmada, sem consumir substituições. Preservar limite, posições já salvas, pausa/retomada e autosave do controlador real.
- Manter foco dentro do modal, fundo inerte, restauração do foco ao botão de origem e bloqueio temporário da rolagem da página. Listas têm rolagem própria quando necessário em telas pequenas.

### 24. Identidade profissional da central de elenco

- Pedido: remodelar a tela principal do elenco com estética moderna e profissional, ícones refinados e consistentes e atmosfera de jogos de futebol como FIFA/EA. Usar identidade própria do FutManager, sem logotipos ou marcas de interface da EA.
- Direção implementada: grafite/verde profundo, acentos verde-lima, tipografia Geist, navegação compacta e ícones SVG monoline de uma mesma família. Manter escudos reais disponíveis e as variáveis de cores cadastradas do clube; não substituir todas as telas internas nem a escalação pré-jogo por um novo fluxo.
- Elenco: métricas calculadas do elenco real, busca por nome/posição sem diferenciar acentos, grupos Todos/Titulares/Reservas, filtro de setor, ordenação e abas Visão geral/Desempenho. Perfis abrem pelo nome, seta, duplo clique ou Enter na linha; Espaço seleciona para análise. Agenda continua abrindo submenu antes de navegar. Preservar Menu inicial, Principal, ações de gestão e Escalar Time.
- Não apresentar gols+assistências como jogos disputados. Remover barras de forma e satisfação derivadas artificialmente de força/energia da tabela. Desempenho usa gols, assistências e nota já registrados. Indicadores fixos de confiança continuam identificados como ilustrativos, não como novos cálculos do motor.
- A tabela permite rolagem própria e horizontal em telas estreitas; sidebar tem rolagem interna em desktop. No celular e em paisagem baixa, permitir rolagem da central para não esconder controles/atletas. Não alterar saves, regras de jogo, autenticação ou persistência por causa do redesign.


### 24. Correção: preservar o design original e modernizar somente ícones

- O responsável rejeitou a remodelação completa da seção 23: voltar à estrutura, cores, proporções, estética clara e organização anteriores da central de elenco, sidebar e navegação. A seção 23 deixa de ser diretriz visual vigente.
- Alterar somente os ícones: usar uma família SVG monoline moderna, harmoniosa e consistente em todas as telas, herdando as cores da interface existente. Preservar os nomes, tamanhos e chamadas de `ClassicIcon` para aplicar a padronização sem redesenhar cada tela.
- Manter os layouts existentes de agenda, estádio, editor, escalação, partida, perfis, mercado e menu inicial. Não propagar o tema grafite/verde-lima nem introduzir outra navegação, filtros ou cartões como parte desta correção.
- Não reverter funcionalidades posteriores de perfis/negociações, progressos, autenticação, motor ou regras de jogo. Componentes específicos de campo e camisas não são ícones de interface e mantêm seus desenhos.


### Registro de manutenção — 30/10/2026: contabilização e calendário

- A gravação por atleta ocorre só quando uma partida termina. A chave persistida é o ID único da partida agendada (inclui temporada/competição/mandos), então retomar não registra novamente o mesmo resultado. O registro contém jogos (participações com minutos > 0), minutos, gols, assistências identificadas nos eventos, nota e estatísticas de jogo disponíveis (finalizações, passes, desarmes, defesas e cartões). Temporadas agregam partidas por ano/clube, sem reaproveitar números soltos do cadastro do editor como produção da temporada atual.
- O estado `competitionSeason` fica em `CareerProgress` e é salvo junto com o progresso/autosave. A liga do clube recebe calendário ida/volta; a classificação usa apenas jogos concluídos, regra 3/1/0 e desempates por saldo/gols marcados/nome. Jogos paralelos são simulados deterministicamente na conclusão da rodada, com escalação e atribuição de gols/assistências consistentes com o placar. A artilharia e notas leem estes mesmos registros.
- Novas carreiras de Séries A, B, C e D disputam a divisão cadastrada, a Copa do Brasil em chave eliminatória e o estadual da UF cadastrada quando há pelo menos dois clubes do mesmo estado no editor. A Copa avança por resultados e disputa empatada usa desempate determinístico de pênaltis. Estaduais seguem formato simplificado de turno único; formatos oficiais variam por estado/temporada.
- O conjunto inicial é compacto e editável: quatro clubes por série (16 no total), não é a lista oficial completa de participantes de 2026. O jogo não baixa/importa calendário ou inscrições oficiais atuais. Os competidores vêm do banco do editor; estado pode ser corrigido pelo usuário no editor. Só os campeonatos realmente gerados para a carreira mostram resultados acumulados; o restante do catálogo não finge inscrição.
- A migração `supabase/migrations/20261030130000_add_editor_club_state.sql` adiciona o estado do clube para inscrição estadual; precisa ser aplicada ao Supabase remoto antes de sincronizar o novo campo. O campo é opcional para não invalidar cadastros antigos.
- Saves antigos continuam carregáveis: quando `competitionSeason` não existe, o carregamento gera uma estrutura compatível com os clubes/divisão salvos. Como versões anteriores não persistiam resultados de todos os jogos/rodadas, não há como reconstruir uma classificação histórica exata; as estatísticas individuais já gravadas são mantidas e nenhum placar passado é inventado.
- Regressões adicionadas cobrem escalonamento ida/volta, Séries A–D, classificação acumulada e idempotência, estadual/Copa, estatísticas de artilheiros/assistências e o registro de jogos/minutos/notas. Validação da versão mesclada em `main`: `npm test` (38 arquivos, 153 testes), `npm run lint`, `npx tsc --noEmit`, `git diff --check` e `npm run build` aprovados.

### 25. Mercado de transferências e empréstimos negociados — 30/10/2026

- O editor marca atletas como normais, à venda ou disponíveis para empréstimo. A busca de mercado lista somente jogadores explicitamente disponíveis e filtra país, divisão, taxa, posição, idade e modalidade. Saves locais antigos e linhas já existentes no Supabase recebem uma oferta inicial de venda e uma de empréstimo por clube; os demais ficam normais. A nova coluna é `market_status`, pela migração `supabase/migrations/20261030170000_add_editor_player_market_status.sql`, que deve ser aplicada no Supabase remoto.
- Contratação deixou de ser imediata: o jogador e o clube vendedor recebem uma proposta, podem responder com contraproposta, aceitar/recusar ou tentar renegociar. O usuário confirma o acordo antes da contratação. Propostas e status são persistidos no progresso da carreira e saves antigos continuam válidos.
- O orçamento é contabilizado em milhares de reais; valores de oferta e salário vêm do cadastro em reais. Compra definitiva debita a taxa mais uma reserva equivalente a 12 salários mensais; empréstimo debita a taxa e a parte salarial acordada por seis meses. O atleta é adicionado ao elenco e, no universo simulado daquela carreira, movido do clube vendedor para o comprador; a base global do editor permanece inalterada. O perfil identifica vínculo definitivo ou data prevista para fim do empréstimo.
- Limitação conhecida: o calendário geral da carreira ainda não avança a data do save, portanto a data de retorno do empréstimo é registrada e exibida, mas não existe devolução automática por passagem de tempo nesta versão.
- Testes cobrem migração de disponibilidade em saves antigos, busca, filtro por empréstimo, contraproposta, aceite, conclusão, atualização do clube de origem no universo da carreira, custo salarial e persistência. Validação local: `npm test` (39 arquivos, 159 testes), `npm run lint`, `npx tsc --noEmit`, `git diff --check` e `npm run build` aprovados.

### 26. Diretório moderno de times e elencos — 30/10/2026

- A tela Times segue a referência enviada: navegação/filtros de clubes à esquerda, identidade do clube selecionado, resumo do plantel e tabela de jogadores com posição, camisa, força, idade, salário mensal, valor de mercado e disponibilidade. Layout responsivo com rolagem própria para listas/tabelas.
- Selecionar um atleta abre detalhes de cadastro e, para o elenco do próprio clube, apenas estatísticas reais registradas na carreira. Atletas listados podem receber proposta diretamente do perfil; a negociação continua sujeita à resposta/contraproposta e confirmação no Mercado, sem contratação instantânea. A tela também apresenta saldo, folha mensal estimada e contagem de jogadores disponíveis.
- Regressão da tela cobre navegação entre clubes, visualização de elenco e envio de uma proposta. Validação local desta revisão: `npm test` (41 arquivos, 162 testes), `npm run lint`, `npx tsc --noEmit` e `npm run build` aprovados.



### 27. Catálogo limitado ao futebol brasileiro

- Pedido: adicionar somente Brasileirão Séries A, B, C e D, estaduais brasileiros, regionais e Copa do Brasil. Não incluir campeonatos internacionais, seleções, ligas estrangeiras ou Supercopa do Brasil no catálogo.
- A Central de Competições mantém somente Nacional, Estadual e Regional. As quatro séries nacionais existem no catálogo mesmo sem clubes cadastrados; estaduais contemplam as 26 unidades estaduais e o Distrito Federal. Regionais disponíveis: Copa do Nordeste e Copa Verde.
- Escopo desta etapa é apenas cadastro/consulta das competições, sem importação de clubes, escudos, camisas ou jogadores. Preservar as inscrições e o motor de temporadas A–D/estadual/Copa já adicionados à main em outras entregas. Não importar novas inscrições ou inventar resultados nesta alteração.
- Preservar design, saves, clubes existentes e fluxos de carreira. A base importada de arquivos não é executada nem alterada nesta etapa.

### 28. Intervalo automático, táticas em campo e central de clube — 30/10/2026

- Pedido atual: remover o botão/ação “Menu inicial” somente da visualização da partida; a navegação de carreira fora dela permanece. Manter autosave, compatibilidade dos saves e a confirmação/retomada segura ao sair do navegador.
- Ao atingir o minuto 45, pausar a simulação e abrir automaticamente o modal tático, sem iniciar o segundo tempo. A pausa e o estado de intervalo devem persistir; dispensar o modal não retoma a partida, e o usuário inicia a segunda etapa por um controle explícito do modal ou da tela de partida. Antes de iniciar ou retomar uma partida, validar sempre as regras canônicas do motor.
- O modal tático pode conter campo estilizado original de FutManager, titulares posicionáveis, banco, controles de formação/estilo/marcação/foco e estatísticas ao vivo derivadas dos mesmos eventos da partida. O campo é uma prancheta de organização: não mostra animação de jogo e não restringe movimentos reais a zonas ou posições rígidas. Preservar confirmação de substituição, limite, coordenadas manuais, foco, pausa e autosave. A solicitação atual substitui a proibição de campo dentro do modal na seção 23; continua proibido o minicampo na tela de acompanhamento ao vivo. A seção 12 continua determinando que os eventos, placar e estatísticas sejam coerentes e que clima/semente sejam persistentes.
- A tela Principal pode se aproximar em composição da referência enviada (identidade/navegação lateral e tabela de elenco), preservando FutManager, os ícones já padronizados, ações, funcionalidades e estética clara. Não copiar literalmente Brasfoot, EA ou outros produtos; não usar logotipos/assets proprietários.
- Exibir jogos, gols, assistências e média somente a partir dos registros de carreira disponíveis (`playerCareers`/temporadas), nunca como inferência a partir do cadastro do editor. Ausência de registro deve aparecer como zero ou traço conforme a métrica, sem fabricar forma recente ou satisfação.

### 29. Importação de clubes, jogadores e uniformes brasileiros

- Pedido atual autoriza importar os dados e imagens brasileiros fornecidos em `arquivos/teams`. O responsável escolheu explicitamente **2026** para as divisões nacionais; elencos e uniformes devem continuar vindo dos arquivos, sem apresentá-los como atualização factual de 2026. Esta etapa substitui a restrição temporária de não importar da seção 27; não autoriza copiar outras telas, programas ou código do Brasfoot.
- Implementação/reprodução e limitações: `docs/import-brazil-2026.md`; relatório auditável: `docs/import-brazil-2026-report.json`; correspondência explícita: `scripts/importer/brazil-2026.json`. Ler dados Java sem executar Java/classes da origem; filtrar país no registro, não no nome de arquivo.
- Base: 706 clubes únicos, 16.040 atletas na origem normalizada, 15.992 ativos após limite existente de 35; 704 escudos e 637 imagens de uniformes. A/B/C com 20 cada, D com 88 dos 96 encontrados, oito ausentes listados no relatório. Outros 558 como Sem divisão nacional, sem cadastrá-los falsamente na Série D ou inventar inscrições regionais. Juniores separados da origem não entram nesta etapa.
- Contas novas usam a base importada. Contas existentes usam Editor → Importar base brasileira 2026 com confirmação de substituição dos cadastros/elencos reconhecidos. Preservar clubes personalizados, IDs de clubes para o ateliê e saves de carreira; novos elencos/divisões valem para novas carreiras. Não apagar nem resetar jogos em andamento.
- Dados sem equivalência identificada (força individual, financeiro, camisa/contrato) recebem padrões explícitos de simulação; fundação ausente é 0/null e qualidades ficam com seus códigos. Não inventar estatísticas de jogo. Preservar o molde obrigatório das camisas geradas e a identidade visual existente; camisas importadas são imagens originais de biblioteca/editor, não novas gerações.
- Cache IndexedDB por conta para banco e saves grandes; pendências de nuvem não podem ser substituídas por dados antigos ao recarregar. Consultas Supabase devem paginar todos os jogadores e gravar lotes limitados, com UUIDs distintos por conta e operações serializadas.
- A migração `20261031100000_allow_state_only_clubs.sql` permite Sem divisão nacional. Aplicação remota é pendente: não há credencial administrativa SQL nesta sessão. O build da Vercel não aplica migrações Supabase; sem ela, manter o banco local e sinalizar sincronização pendente, sem declarar importação remota concluída.

### 30. Subtelas da carreira em janelas modais — 02/11/2026

- Pedido: todas as subtelas do game podem abrir como modal, tendo a janela de tabelas enviada como referência. Manter a composição/identidade existente, sem redesenhar a interface inteira ou copiar elementos proprietários da referência.
- Agenda (com seus três submenus), Estádio, Juniores, Times, Mercado, Técnicos, História (com seus submenus), Finanças, Troféus, Treino, Configurações e Escalação agora usam a mesma janela sobre a tela Principal/elenco, com título e X para retornar ao clube. As tabelas e perfis já são modais e permanecem sobrepostos quando abertos.
- `CareerWorkspace` mantém a Principal visível ao fundo e bloqueada para interação/leitores de tela enquanto uma subjanela estiver aberta. A janela usa portal, rolagem interna, foco inicial no fechamento, ciclo de Tab/Shift+Tab, Esc e retorno do foco ao acionador. Eventos de um diálogo filho não podem fechar o pai. Não dispensar a janela por clique acidental no fundo.
- Mudança de apresentação, não reset de carreira: preservar seleção de atleta, tática, posições livres, banco, negociações, treino, salvamento automático e a retomada da subjanela salva. Fechar Escalação não começa nem finaliza jogo; a partida continua exigindo sua ação explícita e as regras canônicas. O acompanhamento ao vivo e o resultado mantêm seu fluxo operacional dedicado, sem introduzir um X que permita pular/abandonar a partida. Autenticação, menu inicial, criação/carregamento e editor fora da carreira continuam como fluxos de entrada.
- Janelas ajustam-se a desktop/celular e telas baixas. Escalação mantém o campo e o banco completos na área disponível, sem adicionar rolagem ao campo ou restrições ao arraste.

### 31. IA de decisões sem custo de API — 03/11/2026

- O usuário aprovou evoluir o motor atual para mais coerência futebolística, rodando no navegador, sem IA externa/API paga e sem alterar o visual. Não introduzir cobrança, chave de API, treinamento ou dependência de planos gratuitos externos para decidir partidas. Hosting/banco continuam sujeitos às cotas já existentes.
- `football-decisions.ts` + `live-match.ts`: continuidade de posse/bola/portador; passes ponderados por espaço, progressão e foco; condução disputada; chance de gol baseada em geometria/pressão e atributos disponíveis; finalização pelo portador e defesa pelo goleiro efetivo; assistência vinculada ao recebedor real. Corridas automáticas procuram ficar em linha; não impor limites às coordenadas manuais.
- Adversário reage ao placar/tempo/expulsões, sem mudar as instruções do jogador. Pressão/estilo alteram a linha defensiva e mantêm custos de faltas e fadiga. O controlador transmite placar salvo, mando real, saída inicial reproduzível e minutos de entrada para diferenciar reservas novos de atletas cansados.
- Novos campos opcionais nos eventos (`carrierId`, `targetId`, `ballAfter`, `chanceQuality`) preservam leitura de saves antigos, sem migração SQL. Mesma versão/estado/semente reproduz a partida ao recarregar; eventos já jogados não mudam. Minutos futuros de partidas antigas usam o código atualizado; não prometer determinismo entre versões diferentes.
- Não chamar qualidade da chance de xG oficial nem apresentar o motor como treinado/validado em uma liga real. Continua uma simulação comprimida com um lance representativo/minuto; demais partidas do calendário usam o modelo simplificado anterior. Sem física contínua ou implementação completa de todas as regras/reinícios do futebol nesta etapa.
- Documentação: `docs/football-decision-engine.md`, `public/game-assets/match-engine-rules.md` e seção 9 de MECANICA-JOGO. Teste reproduzível de 1.000 partidas verifica consistência e relações táticas; resultados e limites registrados no relatório.

### 32. Refinamento leve do centro de treinamento — 03/11/2026

- Pedido: refinar levemente a tela de treino da referência, usar mais ícones coerentes e remover cards/botões desnecessários. Preservar o tema escuro, a janela modal e a mecânica semanal; não redesenhar o restante do game.
- Removida somente no treino a barra interna repetida de título/Voltar ao clube; o X do modal continua sendo a saída. Semana/temporada ficam em texto com calendário, sem card. Resumo lateral e métricas permanecem, mas sem caixas aninhadas/nota redundante.
- Atividades viraram opções compactas com ícones SVG da família existente; descrição somente da atividade escolhida. Intensidade usa um seletor em vez de três botões. Selecionar aptos/Limpar ficam em um checkbox de seleção geral; seleção inicial de titulares e checkboxes individuais continuam. Mantidos filtros, seis dias, seis atividades, resumo/diário, aplicação, validações e salvamento.

### 33. Dias de treino concluídos no resumo da Principal — 03/11/2026

- Ao concluir uma sessão, o card semanal da Principal deve marcar o dia e exibir a sessão/contagem atualizada. Usar a mesma semana de treino do centro e do save (`round` de progresso), não a rodada específica da competição: campeonatos intercalados podem ter rodadas diferentes da semana da carreira.
- `HubScreen.trainingWeek` recebe a semana da carreira separada da rodada do confronto; badge e resumo usam esse valor. Exibir todos os até seis dias concluídos, não apenas os dois últimos, preservando a separação por semana/temporada e o estilo existente.

## 34. Táticas no intervalo — 03/11/2026
- O intervalo deve oferecer a mesma prancheta de escalação usada antes da partida, reutilizando `LineupScreen` dentro do modal de táticas.
- Preservar posições livres, formação, estilo, marcação, foco, banco, pausa e autosave. Trocas durante a partida exigem confirmação e respeitam o limite; arrastar uma reserva apenas prepara a troca.
- O segundo tempo só começa por ação explícita. Fechar o modal no intervalo mantém a partida parada.

### 35. Restauração dos setores do campo — 03/11/2026
- O usuário pediu para voltar ao visual anterior à simplificação da PR #65. Restauradas as guias detalhadas, siglas e divisões de setores anteriores, no pré-jogo e no intervalo.
- A simplificação em quatro faixas foi desfeita. Preservar as táticas no intervalo e todas as demais alterações posteriores e independentes.

### 36. Uma única tela de táticas em todos os momentos — 03/11/2026
- Pedido explícito: táticas durante a partida e no intervalo devem ser IDÊNTICAS à tela do início, com o mesmo conceito, não um campo alternativo.
- Reutilizar sempre `LineupScreen`, com o mesmo campo, camisas, guias detalhadas, resumo, plano de jogo, banco, filtros e análise. Removido o caminho antigo que renderizava `Pitch` durante a partida e o cabeçalho duplicado do modal.
- Diferenças apenas contextuais: placar/minuto, saldo de substituições, confirmação/cancelamento e botão de retomar/iniciar segundo tempo. Manter pausa, autosave, limites e reposicionamento livre.

### 37. Estrutura de atualização via Transfermarkt — 03/11/2026
- Pedido: analisar felipeall/transfermarkt-api e preparar atualização de jogadores/times somente dos clubes já cadastrados. Lista permitida: catálogo brasileiro existente, sem adicionar novos participantes nem alterar divisões 2026.
- Coleta administrativa offline via `scripts/transfermarkt/sync.py`: descoberta de candidatos, aprovação manual por source/ID com evidência, perfil/elenco v4 camelCase, cache, limite de chamadas, retries, validação, dry-run, relatório e publicação atômica do snapshot. Não vincular homônimos automaticamente.
- Aplicação validada em `src/lib/importer/transfermarkt.ts`, integrada à inicialização/importação do catálogo. Manter IDs/identidade/cores/uniformes e contas/saves existentes; não atualizar carreiras em andamento. Valores EUR não são BRL e habilidades/salários continuam simulação.
- Consulta ao serviço público falhou no transporte TLS neste ambiente; snapshot inicial vazio e 706 vínculos pendentes, sem inventar dados atualizados. Carga real depende de acesso à API e aprovação dos vínculos. Operação/limites/termos documentados em `docs/transfermarkt.md`.

### 38. Sincronização Transfermarkt nas Configurações — 03/11/2026
- Criar opção Transfermarkt com botão de sincronização no modal de Configurações, mantendo as demais opções.
- Botão busca a última coleta aprovada/publicada em `/api/transfermarkt` (same-origin/no-store), valida e aplica apenas aos clubes cadastrados. Não é consulta ao vivo ao Transfermarkt: a coleta administrativa e aprovação dos vínculos continuam necessárias.
- Exibir processamento, contagem/data da coleta, sucesso, erro e nuvem pendente com clareza. Sem snapshot publicado, informar que não há coleta; não simular sucesso nem mudar o catálogo.
- Salvar catálogo por conta no cache local/IndexedDB e Supabase; manter banco usado pela carreira em memória até retornar ao menu inicial. Não substituir elenco/progresso da carreira em andamento. Não criar clubes, abas ou navegação nova.

### 39. Importar por competição e criar clubes ausentes — 03/11/2026
- Nova instrução substitui a restrição anterior de importar somente clubes cadastrados: pesquisar competição no Transfermarkt, entrar em cada clube, criar o clube se faltar e importar TODOS os jogadores.
- Coletor: `transfermarkt:competitions` pesquisa todas as páginas; `transfermarkt:competition-sync -- --competition ID --division "Série A" --season 2026 --apply` percorre perfil/elenco de cada participante. A/B/C/D profissionais brasileiras, sem U20/playoffs. ID vem da busca, não é adivinhado.
- Snapshot v2 registra competição/temporada/participantes e permite criar clubes; v1 continua compatível. Nomes/IDs locais e cores de clubes existentes são preservados; homônimos ambíguos são rejeitados. Novos clubes usam valores neutros explicitamente de simulação quando a fonte não informa os campos.
- Removido corte de 35 para importação/persistência/elenco: guarda técnica de 200, alinhada ao esquema de coleta; fonte acima disso falha explicitamente, nunca corta silenciosamente. Migração `20261103235900_complete_imported_squads.sql` preparada para elevar a trava Supabase; aplicação remota pendente.
- Publicação de competição é integral: se algum clube falhar, fica só prévia/relatório e não substitui o snapshot publicado. Saves permanecem intactos e o botão em Configurações aplica a coleta publicada, sem fingir coleta ao vivo.
- Busca real por brasileirão foi tentada novamente e falhou no transporte TLS do serviço público. Nenhuma carga real obtida nesta execução; imagens são referência, não dados estruturados completos. Execução efetiva ainda depende de acesso à fonte.

### 40. Modelar a carga inicial antes de importar — 04/11/2026
- Pedido atual: modelar a importação antes da carga em massa. Primeira carga restrita às Séries A/B/C/D profissionais, clubes e jogadores com força, valor e atributos de jogo. Manter temporada 2026 previamente escolhida.
- Referência de conferência: 20/20/20/96 clubes (156); validar na fonte antes da publicação. Não importar outras competições nesta fase nem excluir automaticamente os demais clubes já existentes.
- Separar dados reais de estimativas: Transfermarkt não fornece overall/salário do jogo. Força deve ser individual, determinística e calibrada, não a mesma nota para todo o clube; EUR→BRL exige cotação datada, e valor ausente não equivale a zero.
- `docs/transfermarkt-modelo-inicial.md` registra proposta de faixas com sobreposição entre divisões, tratamento de idade/posição, finanças, identidade/proveniência, preservação de saves e revisão por prévia. Faixas/fórmulas não estão aprovadas ou implantadas como regra final.
- Nesta etapa não executar coleta, `--apply`, migração remota nem carga em massa. Pendências anteriores (acesso à API, migração Supabase, IDs externos e calibração) permanecem explícitas.


### 41. Rodar importação ao vivo das quatro divisões — 04/11/2026
- Usuário aprovou a carga completa, rejeitou pesquisa manual clube por clube e publicou `https://transfermarkt-api-umber.vercel.app/docs`; pedido atual: deixar o botão Rodar coletar os clubes automaticamente dentro do game.
- Substitui no botão o snapshot administrativo vazio por coleta autenticada ao vivo da instância própria. BRA1/BRA2/BRA3/BRA4, referência de 20/20/20/96 clubes, somente profissionais brasileiros de 2026. Descobrir temporada pelo nome em `/seasons`: consulta real confirmou nome 2026 → ID 2025 nas quatro divisões; nunca supor ano visível = ID da fonte.
- Coleta em requisições curtas same-origin com host/ações permitidos, progresso, retries, pausa e checkpoint por conta no IndexedDB (24h). Exige tela aberta, não worker independente. Falha não publica catálogo parcial; confirmação após validar toda a carga. Preservar carreira ativa e disponibilizar catálogo no retorno ao menu para novas carreiras.
- API 5 retorna idade null com nascimento disponível: calcular idade na data de coleta; não descartar jogadores. Ausência de idade/nascimento ou posição impede aplicação, sem inventar fatos. Elencos completos 11–200 com goleiro, identidades únicas entre equipes.
- Persistir origem externa e EUR/nascimento/data, priorizar vínculo externo em novas sincronizações; clube novo usa cores disponíveis. Modelo de força individual determinístico provisório, não scouting oficial: bases por divisão, diversidade simulada de ID/idade/mercado; manter notas existentes. BRL e salário permanecem estimativas do jogo, sem EUR ficticiamente convertido.
- Migrações de guarda 200 e novas colunas JSONB `transfermarkt` foram preparadas; NÃO aplicadas remotamente nesta sessão. Se falhar a nuvem, salvar local/IndexedDB e indicar pendência claramente. Não afirmar carga real de 156 clubes ou sync remoto sem executá-los. Consultas reais representativas funcionaram; suíte usa fixtures para validar carga completa.
- Validação desta entrega: 244 testes Vitest/58 arquivos, 10 testes Python, lint e build aprovados. Carga integral autenticada de produção e aplicação remota das migrações não executadas.


### 42. Deixar pendências de jogadores/clubes para o fim — 04/11/2026
- Usuário encontrou Figueirense / Maiky sem idade/nascimento ou posição e pediu que erros assim ficassem para corrigir por último, sem travar a coleta dos outros clubes.
- Coletar os demais membros mesmo quando um clube falhar; guardar clube/nome/motivo em `issues` no checkpoint por conta e mostrar contagem de pendências no progresso. Fazer uma única passagem final automática apenas pelos clubes com erro, depois de tentar todos os demais.
- Ao persistirem erros, mostrar relatório consolidado com todos os clubes pendentes. Rodar novamente retoma somente os clubes ainda não validados, aproveitando os já salvos (inclusive checkpoints da versão anterior).
- Não inventar dados do Maiky ou excluir jogadores/elencos silenciosamente. Coleta dos clubes válidos é preservada em staging; aplicação do catálogo continua integral, depois de corrigir pendências e validar. Não tratar coleta incompleta como sucesso nem alterar carreira ativa.
- Pausar/cancelar deve interromper imediatamente, sem virar pendência de clube; falha no armazenamento interrompe em vez de afirmar que o progresso foi salvo. Pendências anteriores de migração remota Supabase permanecem sem alteração.

### 43. Aproveitar o arquivo brasileiro 2026 enviado — 04/11/2026
- Usuário enviou `brasileirao-2026.json` e autorizou integrar a base ao importador, deixando os casos incompletos para correção no final.
- Arquivo original preservado em `src/data/transfermarkt/brasileirao-2026.json` (156 clubes, 4.497 IDs de jogadores únicos, temporadas internas 2025 correspondentes ao ano 2026 autorizado).
- Auditoria determinística: 74 clubes / 2.222 jogadores passam integralmente; 82 clubes pendentes. Há 203 jogadores com dados obrigatórios ausentes (202 sem posição, 1 sem idade/nascimento); ABECAT tem somente 7 atletas. Preservar todos no arquivo, sem descartar/inventar dados.
- `/api/transfermarkt/seed` prepara staging validado do arquivo sem consultar fonte externa; `?report=1` apresenta relatório de jogadores/clubes pendentes. Identificar processamento do arquivo separadamente da data de coleta upstream, que não foi informada.
- Rodar aproveita os clubes válidos do arquivo e consulta somente os clubes ainda pendentes. Checkpoints anteriores são preservados/mesclados por IDs e manifesto compatível; coleta ao vivo validada já salva tem prioridade sobre o arquivo. O restante das validações, tentativas finais e proteção de carreira permanecem.
- Arquivo contém elencos, não perfis de clubes: não inventar estádio/técnico/cores; conservar fatos existentes do catálogo e defaults de simulação para novos clubes. Nenhuma migração remota Supabase aplicada e nenhuma aplicação automática parcial à carreira/catálogo.

### 44. Correções manuais das pendências Transfermarkt — 04/11/2026
- Pedido explícito: criar opção de correção para o usuário informar nascimento e demais campos ausentes manualmente.
- Configurações → Transfermarkt → Corrigir pendências: usar o mesmo modal original do jogo, lista pesquisável por clube/jogador, informações originais e formulário para nascimento OU idade, posição, camisa, pé e fim do contrato. Permitir remover a correção para restaurar a origem.
- Validar datas reais, idade 14–65, posição reconhecida, camisa e identidades do arquivo; não aceitar correção vazia, duplicada ou de jogador/clube estrangeiro. Nascimento manual recalcula idade; não inventar fatos para fazer o cadastro passar.
- Correções são overlays por conta no IndexedDB deste dispositivo, NÃO modificam API/arquivo original nem carreira ativa. Informar claramente que não são fatos oficiais e não há sincronização dessas preferências entre dispositivos nesta entrega.
- POST /api/transfermarkt/seed prepara apenas prévia validada, sem gravação remota. Rodar reaplica overrides e altera revisão do seed; revalidar clubes corrigidos e invalidar correções removidas mesmo em checkpoints já salvos. Guardar campos/data de intervenção manual na proveniência do jogador importado.
- Lista inclui pendências do arquivo base e jogadores já corrigidos; elencos incompletos (ABECAT/7 atletas) continuam exigindo dados reais, não permite adicionar atletas fictícios para burlar guarda. Migrações remotas Supabase anteriores permanecem pendentes.


### 45. Empréstimos reais na carreira e devolução ao proprietário — 04/11/2026
- Pedido: separar contrato de empréstimo de mera disponibilidade no mercado; registrar proprietário, clube de atuação e fim do empréstimo, inclusive recebidos e cedidos. Antes de vencer, propor prorrogação; aceitação conserva o atleta temporariamente, recusa/ausência de acordo devolve ao proprietário no vencimento.
- `LoanContract` guarda referências locais e/ou externas dos dois clubes, início, devolução conhecida ou null, origem, participação salarial e última proposta. Não criar clubes estrangeiros jogáveis para representar um proprietário/destino externo. Contrato definitivo do atleta é separado do empréstimo.
- Fonte felipeall/transfermarkt-api: squad/profile não identificam empréstimos. Consultar `/players/{id}/transfers` em requisição autenticada same-origin com host fixo. Reconstruir eventos `loan`/`endOfLoan` em **22/01/2026**, abertura da temporada escolhida, não na data atual da coleta. Eventos de devolução já ocorridos hoje podem ser futuros nessa carreira. `contractUntil` de transferências é vínculo com proprietário e NÃO é prazo de empréstimo (consulta real do Kaique 964590 confirmou contrato 2030 e devolução 30/06/2026).
- Rodar verifica automaticamente o histórico de cada jogador coletado. Sem operação manual por clube/jogador; pode levar horas com milhares de consultas sequenciais. Mantém tela aberta, pause/retome, checkpoint por conta/dispositivo a cada dez verificações e nas falhas; pendências não impedem conferir os demais. Mudanças nas correções do seed preservam empréstimos já verificados por identidade. Só aplicar após validação integral e confirmação; não alterar arquivo original nem carreiras existentes com nova coleta.
- Sem devolução explícita na fonte: mostrar **prazo não informado**, sem agendar retorno ou permitir prorrogação; nunca assumir fim do contrato definitivo. Histórico sem data/identidade inválida vira pendência de verificação, não afirmação de vínculo permanente. Importação integral real de milhares de históricos não foi executada nesta entrega; testes de carga usam fixtures.
- Plantel → Empréstimos abre modal de vínculos recebidos/cedidos, inclusive devolvidos. Aviso no plantel quando vencer nas próximas quatro semanas. Perfil/mercado informa proprietário/destino e bloqueia venda, reempréstimo e renovação definitiva de atleta recebido.
- Proposta entre clubes é simulação explícita, com confirmação. 1–24 meses adicionais, mínimo 50% dos salários; recebidos exigem taxa mínima de 25% dos salários do período e saldo para taxa + compromisso salarial antecipado. Cedidos aceitam taxa até duas vezes essa referência, creditada ao proprietário. Aceitação prorroga desde o vencimento original; recusa mantém vencimento e não devolve antecipadamente.
- Calendário anteriormente congelado agora avança **sete dias por partida concluída**, no retorno do resultado ao hub (regra de simulação, não calendário oficial). Processar vencidos na mesma atualização: mudar clube para proprietário, remover recebido do elenco/titulares/posições, reincluir cedido ao proprietário local sem reutilizar IDs antigos, preservar estatísticas. Empréstimos podem ultrapassar o limite de contratações de 35 ao devolver atletas já pertencentes ao clube; não descartar retornos silenciosamente.
- JSON `game_saves.state.progress`/cache guarda squad e mapa `loanContracts` por carreira, com prorrogações/devoluções; catálogo mantém metadados no JSON de origem Transfermarkt já previsto. Saves antigos só recuperam proprietário quando há negociação concluída de empréstimo nesse próprio save e prazo registrado; início desconhecido fica null. Não inferir proprietário pelo catálogo atualizado/último clube. Migrações remotas anteriores permanecem pendentes; nenhum segredo/migração remoto alterado.
- Validação da entrega: 281 testes Vitest/66 arquivos aprovados; inclui fluxo integrado resultado → avanço de data → devolução → autosave e limpeza de titulares/posições, prorrogação aceita/recusada, retorno cedido, fonte externa e coleta com retomada. Lint, TypeScript e build aprovados; sem carga integral autenticada real ou aplicação das migrações remotas.

### 46. Rodar sempre atualiza tudo; galerias históricas e campeões da carreira — 04/11/2026
- Nova regra explícita do usuário: todo campo novo solicitado deve integrar a estrutura de importação. **Rodar inicia coleta NOVA e COMPLETA na API**, incluindo participantes/clubes/elencos/empréstimos/história/títulos; não reutilizar o arquivo antigo nem staging como se fosse atualização. Esta regra supersede o reaproveitamento automático do seed descrito nas seções 43–45.
- Retomada é operação separada: botão **Retomar coleta** continua o staging por conta/dispositivo. Pausar não aplica catálogo. Rodar limpa checkpoint; Retomar só aceita versão compatível da integração (`COLLECTION_VERSION`, elevar ao mudar enriquecimentos obrigatórios). Campos adicionais devem entrar em schema, normalização, coletor, aplicação/persistência e testes, além de invalidar staging incompatível. Coleta integral pode levar horas e exige tela aberta; não alegar carga real executada com testes de fixtures.
- Correções manuais salvas são encaminhadas por clube ao endpoint autenticado e reaplicadas ao elenco NOVO retornado pela API, com proveniência; nascimento manual invalida idade anterior para recalcular. Não depender do seed para corrigir dados ao vivo. Falhas de clube/galeria/contrato são guardadas para revisão sem interromper outros itens; não aplicar carga parcial silenciosa.
- API upstream comprovada: `/clubs/{id}/achievements` retorna `id`, `achievements[{title,count,details[{season:{id,name},competition}]}]`. Consulta real de Palmeiras/1023 confirmou categorias nacionais/internacionais/estaduais e títulos vazios na fonte. Preservar contagens/rótulos; título vazio fica “Título não identificado na fonte”. `season.id` NÃO é ano civil garantido: nomes podem ser 2023 com ID 2022; quando falta nome, exibir ID de temporada explicitamente, sem inventar ano. Não inventar biografia, vice, técnico ou artilheiro históricos ausentes na API.
- Troféus: galeria selecionável de cada clube, com acervo Transfermarkt separado de títulos da carreira. Acervo representa a data da coleta atual, não retrospectiva em 22/01/2026. Diferenciar “não coletado” de “fonte sem conquistas”. Histórico de clubes persiste no JSON de origem já previsto e no cache; não exige nova coluna ou alteração de uniformes/cores personalizados. Migrações Supabase antigas seguem pendentes.
- História → Times campeões e sala de Troféus mostram tabela inspirada na imagem: **Ano, Campeão, Vice, Artilheiro, Técnico campeão**, categoria e competição, ordem de temporada decrescente. Categorias internacional/seleções sem simulação exibem estado vazio, sem inventar vencedores ou ampliar o calendário autorizado.
- Registrar automaticamente somente competição CONCLUÍDA: liga/estadual com todos os jogos disputados e classificação final; copa com final efetivamente disputada e vencedor válido (inclusive pênaltis). Final cancelada/projeção não premia ninguém. Usar gols registrados e explicitar ausência; empates de artilharia preservam todos. Técnico do usuário ou do cadastro é fotografado ao conquistar, não reescrito em futuras consultas.
- Arquivo de campeões independente por carreira (`championHistory` no progress JSON), chave temporada/competição, idempotente e cumulativo. Restaurar campeonatos concluídos de saves antigos quando fixtures disponíveis; não recuperar temporadas antigas já descartadas sem evidência. Nova carreira começa sem títulos de jogo, sem copiar acervo real para o arquivo de campeões. Nova sincronização nunca apaga títulos ganhos no jogo.
- Validação: 294 testes Vitest/69 arquivos, 10 testes Python, lint sem avisos, TypeScript e build aprovados. Inclui integração restauração de campeão → autosave → História, atualização nova versus retomada, consulta real representativa de conquistas e testes de galerias com falha/retomada. Coleta integral autenticada de produção e migrações Supabase remotas NÃO executadas nesta entrega.

### 47. Calendário brasileiro, sem calendário internacional por enquanto — 04/11/2026

- Pedido: **“Implemente o calendario brasileiro apenas, por enquanto”**. Substitui a etapa anterior de somente pesquisa. Não incluir seleções, Datas FIFA ou competições internacionais. Preservar estrutura e estética.
- Temporada de referência: **2026**, independente do relógio da máquina. `brazilian-calendar.ts` centraliza períodos brasileiros, datas civis ISO e fontes; documentação em `docs/brazilian-calendar.md`. Anos seguintes são projeções explícitas, não calendários oficiais.
- Agenda e cabeçalho mostram datas persistidas dos confrontos existentes. `calendarRound` passa a representar a ordem cronológica (dia do ano); rodada de cada competição permanece independente. Avançar após resultado para a data do próximo compromisso, nunca +7 fixo. Empréstimos vencem e são retirados do elenco/titulares/banco/posições nessa data.
- Série A 2026: janela 28/01–02/12, 18/38 das rodadas antes de junho, retorno 22/07. Não paralisar B/C/D automaticamente: a tabela B publicada em fevereiro tem jogos durante a Copa, ao contrário do anúncio inicial. Só a interrupção doméstica da A é aplicada, sem calendário de seleções.
- Estaduais 11/01–08/03; B 21/03–14/11 para liga; C 05/04–25/10; D 04/04–13/09; Copa alinhada da final de 06/12 para trás às janelas das fases existentes. Intervalo conservador de três dias civis por clube, sem horários fictícios, inclusive reservas de fases condicionadas. Não publicar jogos de fundo da Copa antes de sua data.
- Compatibilidade: campos opcionais no progress JSON, sem SQL; migrar saves sem reconstruir IDs/chaves, resultados ou contribuições; não retroceder data civil. Mesma versão de calendário é idempotente. Jogos antigos da A ainda pendentes ao chegar à pausa são remanejados após 22/07 quando há espaço.
- **Limite desta entrega:** são datas previstas geradas nas janelas CBF, não importação da tabela oficial de confrontos. Formatos simplificados anteriores continuam: sem novos playoffs, fases C/D, jogos de volta, critérios de inscrição, regulamentos estaduais ou geração de regionais. Períodos de regionais, Supercopa, playoffs B e mercado são referências informativas, sem inscrever clubes ou bloquear negociações. Não anunciar regulamentos completos como implementados.
- Se o formato antigo/editado não cabe no período (ex.: D com 96 clubes em liga única ida/volta), manter partidas sem data com aviso visível. Não esconder os compromissos nem inventar jogos fora do ano/janela ou dois jogos no mesmo dia. Evolução dos formatos exige tarefa própria.
- Validação: **306 testes Vitest / 70 arquivos aprovados**, incluindo restauração/migração com resultados preservados, avanço de data e devolução de empréstimo, pausa A e continuidade B/C/D, conflitos, capacidade excedida e projeções; lint e TypeScript aprovados. Build de produção aprovado; sem alterações SQL/autenticação/importação.

### 48. Central de empregos ligada à carreira — 04/11/2026

- Pedido: atuar na **Central de empregos**, cuja tela ainda mostrava aviso de ofertas indisponíveis (imagem image-14.png). Manter a agenda, submenu, modal e estética existentes; substituir só o placeholder de empregos. Amistosos continuam fora do escopo.
- Integrar a fundação `manager-market.ts` ao progress JSON por carreira. Iniciar no novo save e migrar saves antigos sem inventar demissões passadas; a ocupação do clube do usuário deve mostrar o treinador da carreira, não o técnico do catálogo. Novos resultados concluídos alimentam a avaliação de técnicos IA de forma idempotente. Pelo menos cinco partidas antes de demitir, torcida <=30 ou diretoria <=20. Economia IA simplificada já existente (R$151 mil por jogo menos 1/4 da folha mensal); usuário mantém saldo real.
- Somente vagas da **simulação**, em clubes brasileiros de divisão nacional, diferentes do atual, desocupados e com elenco jogável (11+ atletas e goleiro). Sem ofertas externas/API, sem dispensar técnico ocupado para criar vaga artificial. Ausência de vaga é estado vazio honesto; partidas/demissões podem abrir vagas. Esta etapa NÃO introduz demissão automática do usuário ou carreira desempregada.
- Candidatura avaliada explicitamente pelo modelo do jogo: nível até o atual +2; histórico de 5+ jogos com média >=2 pontos permite +4. Proposta por sete dias civis (válida inclusive no último dia), ou recusa justificada. Uma candidatura por versão da vaga; nova vacância incrementa versão. Ocupação/versão/prazo são revalidados ao aceitar; recusa, expiração, encerramento e contratação são persistidos. Outras propostas abertas encerram ao aceitar uma.
- Aceitar exige confirmação explícita e permite cancelar sem sair do clube. Rejeitar troca durante partida/resultado e proteger contra clique duplicado. Mesmo ID de save e mesmo treinador: não criar carreira nova, não alterar catálogo global ou outros saves. Atualizar clube/divisão/elenco/titulares/calendário/orçamento/confiança; não transportar dinheiro, IDs pessoais/posições, treinos ou jogadores do clube anterior. Reservar instantâneo não recursivo por clube para retorno e conservar a trajetória de nomeações e o arquivo de campeões.
- Troca no meio do ano: preservar resultados com IDs conhecidos; simular jogos anteriores do destino como feitos sob seu antigo técnico, sem pedir replay ao usuário. Guardar `priorAppointmentFixtureIds` para não atribuir confiança da gestão anterior ou títulos já concluídos ao novo treinador. Fluxo usa calendário do mesmo ano, sem retroceder a data. Carregar e verificar empréstimos do destino pelas regras existentes.
- Negociações pendentes do clube anterior são encerradas; transferências concluídas e vínculos globais da carreira permanecem. Guardar todas por carreira, mas só permitir ações/mostrar negociações do clube comprador atual. Técnicos das telas de gestão refletem o mercado da carreira sem editar o cadastro importado.
- Coordenação de dados: o outro agente foi orientado pelo usuário a **somente coletar dados da API e entregar JSON**, sem integração, alterações no jogo, banco ou deploy. Esta tarefa não altera importadores nem executa coleta.

### 49. Reiniciar carreiras e compartilhar o calendário CBF — 04/11/2026

- Pedido literal: **“Exclua todas as carreiras iniciadas, e implemente o calendario CBF, e todos as carreiras seguirão esse calendario”**. Autoriza este reinício destrutivo das carreiras anteriores, substituindo especificamente a preservação de saves antigos de §47–48. Preservar contas e catálogo/editor/importação/uniformes. Não repetir o apagamento em cada deploy.
- Novas carreiras usam `careerRuleset: cbf-2026-reset-20261104`, salvo também em `game_saves.state`. Invalidar versões anteriores no carregamento local, no cache IndexedDB, na sessão e na fusão com a nuvem. Não confiar em `updatedAt` (um dispositivo offline pode reenviar carreira antiga com data recente). Cliente atualizado bloqueia upload antigo. Carreiras com a nova regra sobrevivem ao recarregamento normalmente.
- Calendário versão 2: planejar todas as divisões brasileiras/estaduais do catálogo antes de filtrar as competições do clube; reservar períodos da Copa para possíveis classificados. Mesmo catálogo/ano => mesmas datas para partidas/rodadas comuns, independentemente do clube/estado do usuário ou projeção da Copa. Todas as novas carreiras usam 2026 e avançam por datas dos jogos, não +7 dias.
- Manter fontes e períodos CBF de §47 e `docs/brazilian-calendar.md`. Não chamar confrontos simulados de tabela oficial nem alegar regulamentos completos: os formatos simplificados/avisos de partidas sem data quando excedem as janelas permanecem. Sem calendário internacional.
- Limpeza Supabase por conta ao acessar: paginar todos os saves antes de excluir aposentados (deletar durante paginação por offset perde registros), excluir em lotes de 100 com owner_id explícito + RLS; filhos por cascata. Sem alteração em outros dados.
- Para exclusão global imediata e proteção contra clientes antigos, criada migração `20261104160000_reset_careers_cbf_calendar.sql` (delete somente regras anteriores + constraint de nova regra). **Supabase desconectado nesta conversa: migração NÃO executada remotamente.** Informado ao usuário que conectar o Supabase é necessário para a exclusão global agora; sem isso a limpeza física é por conta no próximo acesso. Deploy na Vercel não executa SQL.

### 50. Camisas dentro do jogo iguais às importadas — 04/11/2026

- Pedido: **“As camisas dentro do jogo, deve ser igual as camisas importadas”**, com referência image-15.png mostrando os três uniformes importados. Priorizar a própria arte importada, preservando cores, estampas, patrocinadores e proporção; não substituir por molde genérico tingido nem remodelar a imagem para outra gola.
- `PlayerJersey` usa `clubKitAsset`, a mesma resolução do editor/estúdio/sidebar, com imagem SVG interna em modo contain, sem recortar ou aplicar filtro de cor. Número do atleta permanece legível sobre a parte inferior da camisa. Uniforme principal por padrão; componente também aceita reserva/terceiro explicitamente, sem introduzir seleção ou navegação nova.
- Passar clube atual explicitamente em todos os consumidores: titulares, reservas, camisa arrastada, prévia do atleta no Principal e campo de táticas reutilizado em partidas/intervalo. Não inferir clube do jogador de origem, não carregar uniforme do antigo clube após transferência/troca de emprego. Não interpretar o terceiro uniforme como uniforme de goleiro: o catálogo não declara essa categoria.
- Somente quando a arte não existe ou falha ao carregar, manter o fallback numerado de tecido; uma falha de imagem de outro clube não deve afetar o clube atual. Sem mudanças nos arquivos importados, saves, catálogo, drag/substituições, navegação ou estrutura visual.

### 51. Escolha da camisa da partida — 04/11/2026

- Pedido: **“Deve ser possivel escolher qual camisa vai usar no jogo, são importadas 3 para cada time”**. Acrescentar somente seletor compacto na escalação pré-jogo, preservando estrutura/estética, com miniaturas das artes importadas 1, 2 e 3 e indicação acessível da escolha.
- A escolha atualiza titulares, reservas, camisa arrastada e prévia do atleta no Principal. Manter a mesma camisa nas táticas durante o jogo e no intervalo, sem permitir troca de uniforme com a partida em andamento. Antes do próximo jogo o usuário pode escolher novamente; a última escolha permanece como padrão.
- Campo opcional `CareerProgress.kit` (1/2/3), autosave por carreira e nuvem pelo JSON existente. Carreiras novas e antigas sem campo usam 1. Ao mudar de clube pelo emprego, guardar a escolha no instantâneo do clube anterior; destino usa seu instantâneo ou 1, sem herdar a camisa escolhida de outro clube. Não apagar/recriar saves e não mudar a regra de reset CBF.
- Resolver sempre via `clubKitAsset`, sem alterar a arte nem inventar uniforme inexistente. O catálogo efetivo não tem três camisas em todos os clubes (ex.: Athlético Paranaense tem apenas 1 no manifesto); nesses casos as opções ausentes ficam desabilitadas e identificadas como não importadas. Não tratar uniforme 3 como uniforme de goleiro.


### 52. Revisão crítica do calendário 2026 — 04/11/2026

- Pedido: **“O calendario esta completamente errado, brasileirão no meio do campeonato paulista? Revise, isso é um erro critico”**, imagem image-16.png. Verificar fontes oficiais antes de alterar cronologia: **em 2026 a sobreposição é oficial**, com Série A em 28–29/01 e estaduais até 08/03. Não mudar para abril nem abandonar a temporada 2026 para concordar com uma premissa incorreta.
- Calendário v3: Série A de 38 rodadas usa janelas individuais da tabela básica CBF de 15/12/2025, reservadas antes dos estaduais; dados e fonte em `serie-a-calendar-2026.ts`. Corrige a interpolação que podia deslocar a abertura para 30/01. Não confundir janelas básicas com datas definitivas de cada confronto ou adiamentos posteriores. Catálogos editados com outra quantidade de rodadas seguem planejamento proporcional.
- Referência estadual 2026 tem até 11 datas. Não comprimir mais rodadas no mesmo período; excedentes ficam sem data/aviso, sem perder partidas do save. Jogos sem data não são oferecidos como próximo compromisso nem concluídos/simulados no dia de outro jogo. Resultado/IDs preservados; pendências nacionais incompatíveis com datas já jogadas são remanejadas em conjunto, sem retroceder data nem novo reset.
- Explicação da sobreposição no planejamento já existente da agenda, preservando a estética/modal e navegação. Aviso de formatos excessivos informa a limitação estadual explicitamente.
- **Pendência não resolvida:** estaduais ainda são gerados por estado em turno único, misturando clubes de níveis estaduais diferentes. O limite de 11 datas não equivale a implementar o regulamento/participantes da FPF. Não anunciar calendário completo oficial ou formatos estaduais corrigidos. Documentar e comunicar esse limite, mantendo o escopo brasileiro e as camisas/saves.
- Validação desta revisão: **347 testes / 75 arquivos aprovados**, lint, TypeScript, build de produção e `git diff --check` aprovados. Regressões cobrem as 38 janelas, prioridade da abertura, sobreposição, capacidade estadual, bloqueio de jogos sem data, preservação v2→v3 e remanejamento sem invadir a interrupção.

### 53. Manter a sobreposição prevista no calendário oficial — 04/11/2026

- Após comparar 2025, 2026 e o calendário anunciado de 2027, o usuário confirmou: **“Perfeito, então mantenha como no calendario oficial”**. Manter a sobreposição entre Série A e estaduais quando prevista pela CBF; não adiar o Brasileiro para depois do Paulista por preferência ou por assumir que janeiro foi exclusivo da Copa de 2026.
- Usar as referências oficiais de cada temporada quando implementadas e disponíveis. Não apresentar a projeção atual dos anos posteriores a 2026 como calendário oficial já integrado, nem alegar que os formatos estaduais simplificados foram corrigidos. Esta confirmação não solicita novo reset, mudança de confrontos ou alteração adicional do motor.

### 54. Refinar o centro de treinamento e seus ícones — 04/11/2026

- Pedido: **“Refine essa tela de treino, adicione icons 3d, o card geral dentro de outro card esta zoado, refine o maximo possivel”**. A janela modal existente deve ser o único enquadramento externo: remover do treino o wrapper genérico com fundo de estádio, padding, borda/sombra e card branco aninhado, sem alterar as demais subtelas.
- Treino ocupa diretamente a superfície do modal, com tons claros neutros/verde, hierarquia tipográfica, espaços consistentes, controles responsivos e resumo lateral separado por linha, não por outro card geral. Ícones vetoriais locais com volume, gradientes, faces e sombras para os seis tipos de treino; decorativos e com IDs SVG exclusivos, sem dependência de imagem externa.
- Preservar regras/payload, dias, intensidade, seleção e elegibilidade dos atletas, bloqueio de sessão concluída, histórico e persistência. Melhorar barras de energia, foco de teclado, progresso acessível, busca sem resultados e estado inicial do diário. Sem novas abas, modais ou mudanças de navegação, calendário, camisas ou saves.
- Validação: **351 testes / 75 arquivos aprovados**, build de produção, lint, TypeScript e diff-check aprovados. Regressões verificam superfície sem wrapper aninhado, seis ícones/IDs únicos, progresso, filtros/estado vazio, bloqueio do dia concluído e payload de recuperação.

### 55. Estender o modelo de treinos às telas internas — 04/11/2026

- Pedido: **“Utilize o modelo da tela de treinos para as demais telas”**. Compartilhar a superfície clara neutra/verde, cabeçalho com ícone decorativo com volume, tipografia/espaçamento e separadores discretos; evitar card geral dentro da janela já existente.
- Componentes reutilizáveis `ManagementHeader`, `ManagementIcon` e estilos de superfície aplicados a finanças, troféus, juniores, mercado, times, técnicos, história, agenda, estádio e configurações. Perfil/contratos e competições recebem o mesmo acabamento. Elenco principal, escalação, editor e relatórios de partida recebem estilos locais claros, sem recoloração global dos descendentes da janela.
- Preservar navegação, handlers, filtros, negociações, dados, calendário e saves; manter integralmente regras de bilheteria/expansão do estádio. Campo tático, geometria, posições livres, demarcações, siglas e arte das camisas permanecem; o mesmo quadro continua no pré-jogo/intervalo. Menu inicial não foi redesenhado.
- Validação: **366 testes / 78 arquivos aprovados**, lint sem avisos, TypeScript, build de produção e `git diff --check` aprovados. Nove testes novos verificam acessibilidade/hierarquia do cabeçalho, ação de retorno, superfície única nas seções e ausência do antigo wrapper com sombra. Não foi realizada inspeção visual em navegador nesta execução.

### 56. Classificação compacta, forma recente e chave de copas — 04/11/2026

- Pedido: reduzir o espaço vazio acima da tabela, usar o modelo de resultados recentes do Google e abrir as rodadas ao lado ao clicar; separar fase de grupos quando houver e mostrar chave visual de mata-mata como na referência fornecida.
- Central com cabeçalho/troféu menores, métricas em linha e linhas de tabela compactas. Coluna Últimas 5: vitória verde (✓), derrota vermelha (×), empate cinza (−), legenda e nomes acessíveis com placar/rodada. Apenas jogos concluídos da competição, em ordem de data; clicar abre a rodada correspondente na lateral, com seletor de outras rodadas. Em telas estreitas o painel fica abaixo. Aba Rodadas usa o mesmo seletor, não uma lista interminável de todos os jogos.
- Copas abrem a chave por fases em vez de classificação de pontos fictícia. Escudos/placares, destaque dos vencedores registrados, ligações entre avanços confirmados e campeão somente com decisão persistida (inclusive pênaltis). Jogos locked da projeção do motor têm participantes ocultos como A definir; não revelar antecipadamente os vencedores usados internamente na projeção. Calendário/resultado não foi recalculado nem saves alterados.
- Suporte de apresentação a `CareerCompetitionView.groups` e aba Fase de grupos somente quando dados reais forem fornecidos. **Limite:** o motor atual continua com estaduais e divisões simplificados, sem metadados de grupos; esta mudança não implementa regulamentos/grupos oficiais nem os inventa a partir da classificação geral. A disposição da chave é horizontal por fases, não reprodução literal da referência simétrica.
- Validação: **371 testes / 79 arquivos aprovados**, lint, TypeScript, build de produção e diff-check aprovados. Cinco testes novos cobrem últimos cinco/ordem, rodadas, placares futuros, grupos independentes, clique lateral e campeão/participantes pendentes; testes existentes de copas atualizados. Sem inspeção visual em navegador nesta execução.

### 57. Restaurar o tema escuro da escalação — 04/11/2026

- Correção explícita do usuário: **“Tela de escalação deixe escura como era antes.”** A escalação é exceção à padronização clara da seção 55. Manter seu acabamento escuro original, também no quadro compartilhado de táticas durante a partida e no intervalo.
- Removidos apenas os overrides claros da escalação e da moldura do quadro compartilhado. Restabelecidos fundo, painéis, textos, controles, reservas e diálogos escuros já definidos no CSS original; demais telas claras não mudam. Preservar campo, coordenadas, setores, siglas, camisas, drag livre, escalação e funcionalidades.
- Validação: 33 testes direcionados em 3 arquivos aprovados (incluindo 2 regressões novas de tema), lint, TypeScript, build de produção e diff-check aprovados. Sem inspeção visual em navegador.

### 58. Harmonizar o card Próximo apito — 04/11/2026

- Pedido: **“Mantenha harmoniosos os elementos”**, com referência ao confronto compacto da barra lateral. Distribuir os dois clubes simetricamente: escudos de mesma dimensão acima dos nomes, VS central alinhado aos escudos, nomes completos com quebra e altura mínima equivalente, CASA/FORA discretos e alinhados. Regularizar respiros, hierarquia e entrelinhas; permitir quebra do campeonato em vez de corte.
- Alteração restrita ao card, sem mudar o tema escuro, a ordem mandante/visitante, adversário, calendário ou ações da barra. Estado sem próximo jogo preservado.
- Validação: 3 testes direcionados aprovados (mandante, visitante e ausência de jogo), lint, TypeScript, build e diff-check aprovados. Sem inspeção visual em navegador.

### 59. Organizar Times por divisões nacionais — 04/11/2026

- Pedido: separar os times por competições nacionais, como Brasileirão Séries A, B, C e D, excluindo agrupamentos de copas como Copa do Brasil, que reutilizam os clubes dessas divisões.
- Lista de Times agrupada por país/divisão cadastrada, em ordem A→B→C→D, com título e quantidade em cada grupo. Clubes sem divisão nacional continuam acessíveis em grupo próprio; grupos vazios não aparecem. Cada clube aparece uma única vez, sem replicação por participação em copas/estaduais.
- Filtro existente passa a identificar explicitamente as divisões nacionais; preservados busca, país, seleção de clube, elencos, perfil e negociações. Não alterar inscrições, dados, campeonatos ou saves.
- Validação: 9 testes direcionados em 2 arquivos aprovados, lint, TypeScript, build e diff-check aprovados. Regressão nova cobre ordem de divisões, unicidade, ausência de grupo de copa, seleção, filtro e busca sem resultados. Sem inspeção visual em navegador.

### 60. Título de Times somente na barra superior — 04/11/2026

- Pedido com referências: mover o título/ícone de Times do cabeçalho interno para a barra superior da janela e remover a repetição dentro da tela, deixando-a mais limpa.
- Barra da janela Times recebe ícone compacto e título único (h1, mantendo nome acessível do diálogo). No conteúdo embutido, remover cabeçalho, breadcrumb e descrição redundantes; manter saldo/retorno em linha compacta, filtros e grupos por divisão. Uso isolado de Times mantém cabeçalho próprio. Sem mudar as demais telas, navegação, elencos ou negociações.
- Validação: 17 testes direcionados em 4 arquivos aprovados, lint, TypeScript, build e diff-check aprovados. Duas regressões novas cobrem título/ícone na barra e ausência da duplicação no conteúdo com ações preservadas. Sem inspeção visual em navegador.

### 61. Simplificar o topo da central de competições — 04/11/2026

- Pedido com três referências: remover formato/grupo, contadores e médias acima das tabelas; manter apenas taça e nome da competição. Restaurar barra superior escura e usar somente X sem contorno para sair. Na exploração, manter apenas a lupa.
- Removidos do cabeçalho da competição temporada/local, descrição de formato/participantes, selo de origem e métricas agregadas. Taça/nome seguidos das opções de classificação, rodadas/estatísticas e conteúdo existente. Barra superior na cor escura #242827; X sem texto visível ou borda, preservando nome acessível, foco, Escape e fechamento.
- Exploração sem título/instruções e sem seletor País/região; lupa abre busca com foco e pode recolher/limpar o filtro. Catálogo, categorias e seleção de campeonato preservados. Não alterar resultados, tabelas, rodadas, calendário ou saves.
- Validação: 10 testes direcionados em 2 arquivos aprovados, lint, TypeScript, build e diff-check aprovados. Regressão cobre ausência dos resumos/filtro de região, apenas taça/nome, lupa/foco/busca/recolhimento e X funcional. Sem inspeção visual em navegador.
