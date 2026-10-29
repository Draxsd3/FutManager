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
- `MECANICA-JOGO.md`: referência de regras de futebol (IFAB), princípios táticos FIFA, limites do motor atual e critérios para implementar mecânicas sem apresentar simplificações como regras oficiais.
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
- O catálogo é metadado de navegação, não inscrição confirmada. Ligas usam os clubes/países/divisões do editor. Outras divisões não herdam estatísticas da carreira atual; copas e estaduais sem participantes/grupos/resultados cadastrados mostram indisponibilidade explícita. Histórico de títulos e resultados acumulados ainda não está integrado ao motor.
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

### 12. Proporção profissional obrigatória das camisas

- A camisa branca enviada pelo responsável em 29/10/2026 é o molde de referência: mesma silhueta, gola em V, mangas, ombros, comprimento e barra para os novos modelos. Não usar formas infantis/cartoon; priorizar acabamento profissional de tecido e costuras. A proporção aproximada da peça, incluindo mangas, é 0,86 (largura/altura).
- Sem camisa cadastrada, gerar a principal na primeira cor do clube e a reserva na segunda, sempre no mesmo molde. Exemplo expresso: vermelho/preto → principal vermelha e reserva preta. Não usar um formato diferente para cada cor nem atribuir cores de outro clube a times personalizados.
- Implementação: molde fotográfico transparente derivado da imagem fornecida em `src/lib/kits/fabric-template.json`; script reproduzível `scripts/build-kit-template.mjs`. Criador, uniformes automáticos e camisas numeradas compartilham o molde. Importações são projetadas nele e a IA recebe a imagem de referência, com recorte/mascaramento posterior no servidor. Acervo anterior é preservado sem regravação destrutiva.
- IA continua indisponível até configurar a chave e aplicar a migração; não confundir colorização/recorte determinístico ou testes com imagens simuladas com geração paga real.

### 13. Tela de partida e minicampo

- A tela de acompanhamento deve apresentar uma visualização moderna com minicampo, preservando placar, estatísticas, lances, resultados da rodada e controles de velocidade, pausa e táticas.
- As bolinhas do clube controlado acompanham os titulares, a formação e as posições personalizadas, com movimentação limitada ao redor dessas posições. O adversário usa formação genérica, pois sua escalação não é fornecida pelo motor atual.
- A visualização de partida utiliza lances simulados estruturados, compartilhados pelo placar, resumo e minicampo; respeita as posições configuradas e para ao pausar. O adversário ainda tem formação genérica e o modelo é simplificado, não uma simulação física completa.
### 14. Demarcações completas do campo

- Referência enviada em 29/10/2026 inclui ST/CF, pontas, meia ofensivo, meias dos lados, meios centrais, volante, alas, laterais, zagueiros dos três lados e goleiro. Oferecer todas essas posições visualmente, incluindo segundo atacante, alas esquerdo/direito e zaga esquerda/central/direita.
- As demarcações podem se encostar: não deixar faixas vazias entre regiões. Implementação usa 20 áreas contíguas que cobrem todo o campo, com limites compartilhados e siglas da referência; nomes acessíveis em português.
- Preservar guias desligadas por padrão, liberdade total de arraste (sem snap ou bloqueio por posição), coordenadas salvas e campo/banco juntos sem rolagem. Demarcações são orientação visual e destinos opcionais por clique/teclado, não novas restrições do motor.


### 15. Lances e resultados ao vivo

- Simular e registrar passes, finalizações, gols, desarmes, faltas e discussões da partida do clube, apresentando o mesmo lance no campo e no resumo. Os placares dos demais confrontos avançam com o relógio e aparecem sem visualização das partidas.
- Os demais jogos são confrontos simulados entre clubes cadastrados na divisão ativa, não uma tabela real de calendário de campeonato; os resultados são reproduzíveis por rodada e minuto, sem antecipar gols futuros. O histórico de temporada/classificação acumulada não está integrado.
- O motor ainda é simplificado: não há física contínua, escalação real do adversário, passes errados ou contabilização completa de desempenho. Saves antigos continuam legíveis; ao retomar, a partida fica pausada.
### 16. Reduzir poluição das demarcações e largura do campo

- Regiões da mesma posição, como CB, devem aparecer juntas, sem linhas internas cortando-as. Aplicar também a CM e ST; usar uma única sigla visível por função, preservando destinos esquerdo/central/direito por teclado e coordenadas livres.
- O campo estava excessivamente largo: limitar sua largura pela altura disponível, centralizar e manter proporções calibradas em vez de esticá-lo até preencher a coluna. Implementação da prancheta: proporção de apresentação 6:5 em desktop/paisagem e 68:105 em telas estreitas; não equivale a simular dimensões físicas universais de estádio.
- Preservar campo e banco completo visíveis, guias opcionais inicialmente desligadas, todos os lados e arraste sem snap. O ajuste visual não deve regravar posições ou alterar a escalação.

### 17. Banco de reservas compacto

- Na escalação, manter campo, banco completo e indicadores principais visíveis, inclusive em telas pequenas. Cards de reservas exibem apenas identificação, posição e força; detalhes ficam na ficha aberta por duplo clique, tecla I ou botão acessível após selecionar o atleta.
- Segurar ou arrastar um reserva levanta uma prévia; soltá-lo em um titular ou no campo faz a substituição, e soltá-lo em outro reserva reordena o banco. Cancelar não modifica escalação. Disponibilizar reordenação também por botões na ficha e persistir a ordem no elenco da carreira.
- Usar imagem ilustrativa de banco de reservas como fundo, preservando contraste e legibilidade. A imagem foi gerada para o projeto e não representa um estádio específico.

### 18. Fluidez e melhores momentos na partida

- A circulação da bola deve ser contínua: após um passe, o recebedor inicia o próximo lance, priorizando companheiros próximos. A bola interpola a partir da posição atual, sem reiniciar a cada minuto; pausa, intervalo e velocidade controlam a animação.
- O painel ao vivo, a janela de táticas e o resultado mostram somente melhores momentos (finalizações, gols, faltas, discussões, cartões e alterações), sem listar passes e desarmes rotineiros. Os eventos internos continuam disponíveis para estatísticas e retomada de saves anteriores.
- O movimento continua sendo uma simulação simplificada, sem física completa nem elenco real do adversário; não apresentá-lo como reprodução de jogo real.

### 19. Goleiros e comemoração de gol ao vivo

- Na visualização da partida, impedir que jogadores sejam levados para o outro lado do campo por lances distantes; goleiros têm deslocamento mais limitado ao redor da posição definida pelo usuário, sem bloquear posicionamentos táticos personalizados.
- Cada gol novo deve mostrar uma comemoração temporária “GOOOL!” com autor, clube e minuto, inclusive no intervalo ou no fim do jogo. Não repetir a comemoração ao carregar uma partida já salva. Preservar placar, lances e acessibilidade com movimento reduzido.
- O adversário usa uma escalação simulada com atletas cadastrados no editor quando disponíveis; se o elenco não estiver disponível, identificar o autor genericamente em vez de inventar um nome. As escalações adversárias e o modelo de movimento continuam simplificados.
### 20. Táticas durante a partida no padrão da escalação inicial

- Pedido de 29/10/2026: modernizar as táticas durante o jogo, podendo usar a mesma tela de táticas anterior ao início da partida.
- Reutilizar `LineupScreen` em modo de partida: mesma prancheta proporcional, camisas numeradas no molde obrigatório e nas cores cadastradas do clube, banco completo ao lado, busca/filtros, plano tático e guias opcionais desligadas por padrão. Não reintroduzir fotos ou posições fixas.
- Manter placar, relógio pausado, intervalo, estatísticas, lances e quantidade de substituições restantes. Em telas menores, o plano tático abre pelo botão do cabeçalho; placar/tempo continuam visíveis mesmo em paisagem.
- Substituições são preparadas por seleção em qualquer ordem ou arraste de reserva e exigem confirmação explícita na barra inferior, fora do banco para não esconder reservas. Cancelar ou sair sem confirmar não muda o XI nem consome substituições. Ao esgotar o limite, o reposicionamento de titulares continua livre.
- O controlador real mantém pausa/retomada e autosave; o mesmo helper de posicionamento transfere as coordenadas do atleta que sai (ou aplica o ponto livre solicitado) ao que entra, preservando os demais. Reservas nunca passam pelo atalho de troca pré-jogo sem confirmação.
- Regressões automatizadas cobrem seleção, confirmação/cancelamento, arraste, limite, plano tático, cores, foco e integração com partida/autosave. Revisão Chromium local em cinco resoluções, incluindo 14 reservas, preparação e confirmação, sem rolagem da página ou erros de execução. Rota temporária de revisão removida antes da publicação.

### 21. Movimentação coletiva durante a partida

- Na ilustração, movimentar os atletas das duas equipes também sem bola, mantendo a formação e as posições manuais como âncoras. O posicionamento reage à bola e à posse; um jogador de linha próximo pode pressionar, e os demais ajustam cobertura e apoio. Goleiros acompanham a bola perto da posição escolhida, sem atravessar o campo.
- Interpolar todos os jogadores suavemente em um único ciclo visual; pausa e intervalo congelam a posição atual, velocidade acelera o movimento e a preferência de movimento reduzido é respeitada. A movimentação não altera resultados, estatísticas ou saves.
- A referência de pesquisa inspirou princípios, não uma implementação literal de IA ou física: UT Austin Villa (formação relacionada à bola e goleiro com função própria, https://www.cs.utexas.edu/~pstone/Papers/bib2html-links/LNAI12-MacAlpine.pdf) e PhysicsFC (movimentação sem bola ancorada à formação, https://arxiv.org/html/2504.21216v1). O modelo do FutManager continua heurístico e ilustrativo.

### 22. Táticas rápidas em modal durante a partida

- Correção do responsável: as táticas durante o jogo devem ser um modal, não outra tela completa, pois servem apenas para alterar formação e fazer substituições. Esta decisão substitui a apresentação da seção 20; a escalação pré-jogo continua completa e inalterada.
- Usar cartão central com dimensões limitadas, fundo da partida visível e escurecido, cabeçalho compacto com placar/minuto e apenas formação, titulares e reservas. Não reproduzir campo, plano tático avançado, indicadores e estatísticas dentro do modal.
- A formação é aplicada ao selecionar; substituições exigem seleção de quem sai/entra e confirmação. Fechar, Escape ou clicar fora descarta a troca ainda não confirmada, sem consumir substituições. Preservar limite, posições já salvas, pausa/retomada e autosave do controlador real.
- Manter foco dentro do modal, fundo inerte, restauração do foco ao botão de origem e bloqueio temporário da rolagem da página. Listas têm rolagem própria quando necessário em telas pequenas.
