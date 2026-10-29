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
