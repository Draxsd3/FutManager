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

- Ao abrir o link e após qualquer login, sempre apresentar o menu inicial; nunca abrir automaticamente o editor, outra seção ou uma carreira, mesmo se essa opção tiver sido clicada antes de entrar.
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
