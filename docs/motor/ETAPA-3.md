# Etapa 3 — finanças, contratos e registro básico

## Escopo implementado

O agregado financeiro por carreira está em `progress.managerMarket.finance`, junto do estado por clube já usado pela carreira, mas as regras ficam em serviços puros de `src/lib/game/simulation/`. Não há livro financeiro global, alteração do Editor, reset de carreira ou integração Gemini. E4 não foi iniciada.

- `finance.ts`: conversores, livro de caixa, compromissos, reservas, contas a pagar, contrato de trabalho, inscrição e executor comum de liquidação.
- `settlement.ts`: comandos de carreira para proposta/acordo/cancelamento, compra, venda humana, renovação e prorrogação de empréstimo; snapshot completo com revisão/evento antes de publicação.
- `contract-squad.ts`: reconciliação de propriedade/inscrição sem reciclar IDs numéricos nem substituir condição e estatísticas do jogador.
- `advance.ts`: migração aditiva, competência salarial e vencimentos antes da rodada limitada do mercado; mesma base financeira para humano/CPU.
- `world-market.ts`: mantém a seleção semanal preexistente e seus limites, mas executa negócios pelo mesmo `settleTransfer` das compras e vendas humanas.
- `game-board.tsx`: callbacks financeiros assíncronos; primeiro calcula e publica checkpoint sob o lock da E2, depois altera estado visual. Falha local/conflito preservam o agregado anterior. Os componentes aguardam a confirmação em vez de tratar uma Promise como mensagem.

## Unidades e saldos

**Unidade canônica: centavos inteiros de BRL.** `brlToCents`, `thousandsToCents` e `centsToThousands` isolam a compatibilidade com o catálogo em reais e os componentes antigos em milhares de reais. Valores não finitos e montantes fora da faixa segura são rejeitados. Não misturar milhões das propostas recebidas com milhares da tela.

Cada clube mantém caixa em centavos. O antigo `ManagerClub.budget` é projeção desse caixa para interfaces/emprego/confiança, não o livro financeiro. O disponível para novas negociações é caixa menos competências já acumuladas, salários futuros de um horizonte móvel de 12 meses e reservas de outros acordos. O horizonte é política explícita de segurança do jogo, não regra da CBF nem promessa de financiar integralmente cinco anos de contrato.

Os saldos de abertura vêm do save. A igualdade legada de caixa inicial entre clubes CPU não foi recalibrada nem chamada de economia realista. Receitas/obras ainda executadas pelos módulos antigos são reconciliadas por lançamentos identificados como `legacy-adjustment`, nunca por uma transferência ou salário fictício. A receita fixa legada de R$151 mil/partida e a bilheteria continuam existentes. Patrocínio e manutenção exibidos como projeção continuam sem lançamentos automáticos.

O painel financeiro preserva sua estrutura visual, mas distingue caixa, disponível após compromissos, reservas, valores salariais acumulados a pagar e folha mensal. A projeção mensal não afirma mais que salários nunca são pagos.

## Liquidação comum e R01/R02

### Compra / passe livre / venda humana / CPU

1. Confirmar acordo e ID; verificar versão/propriedade atual, ausência de empréstimo incompatível, comprador, salário conhecido, termos suportados e capacidade técnica de elenco.
2. Revalidar disponibilidade financeira no momento da confirmação. Uma sugestão recebida não obriga um comprador sem fundos a contratar.
3. Débito da **taxa** no comprador e crédito idêntico no vendedor, no mesmo snapshot privado. Passe explicitamente livre tem taxa zero e não inventa vendedor.
4. Salário **não sai do caixa no ato da compra**: vira compromisso do novo contrato. A renovação também não é um pré-pagamento salarial.
5. Arquivar o vínculo anterior e criar vínculo próprio do novo clube — não herdar o vencimento do vendedor. Regra inicial explícita: 12 meses para nova compra, com data final inclusiva no dia anterior ao aniversário de 12 meses; renovação usa a duração escolhida no fluxo já existente.
6. Atualizar propriedade, empréstimos, inscrição, negociações e referências de elenco no mesmo agregado; remover posições/escalação de quem saiu e preservar os IDs/histórico de quem ficou.
7. Persistir fingerprint da liquidação. Repetição do mesmo ID não paga novamente; reusar ID com termos diferentes ou executar outra proposta com proprietário antigo falha.

Assim, **venda humana nova não é mais apenas retirar o atleta e aumentar o saldo**: debita o clube comprador, credita o vendedor, muda vínculo/overlay do universo e continua correta após reload. A divergência de liquidação apontada em R01 e a mistura entre reserva e pagamento apontada em R02 foram tratadas nesses fluxos. Isso não declara retroativamente corretos todos os fatos financeiros de saves anteriores.

Acordos humanos reservam taxa e compromisso salarial; cancelar um acordo ainda não liquidado libera a reserva sem alterar caixa ou vínculo. Há ação de encerramento também para um acordo já aceito, evitando reserva presa quando suas condições deixam de ser executáveis.

### Empréstimos

O contrato de trabalho continua com o proprietário; o destino recebe a inscrição e a parcela salarial acordada. Novo empréstimo usa seis meses, como a negociação existente. O contrato do proprietário precisa cobrir o prazo; vencimento desconhecido não autoriza inventar cobertura.

A taxa é liquidada entre os dois clubes uma vez. Folha se divide pela participação salarial durante `[início, devolução)`. Na data de devolução, o encargo e a propriedade efetiva retornam ao proprietário, inclusive quando o avanço pula sobre essa data.

Prorrogação usa a avaliação de consentimento existente, mas descarta o antigo cálculo que debitava salários antecipados. Liquida só a taxa bilateral e revalida compromissos. Neste recorte a prorrogação **mantém a participação salarial vigente**; mudar a taxa de divisão no meio de um vínculo exigirá segmentos adicionais, não uma alteração retroativa disfarçada.

Proprietário externo identificado na fonte mas ausente no catálogo recebe referência externa, não clube inventado. O retorno remove o atleta do clube receptor, sem tratá-lo automaticamente como livre. Não há conta bancária fictícia para um clube fora do universo.

## Folha por competência

- Intervalos civis semiabertos; cálculo proporcional aos dias de cada mês real, inclusive fevereiro.
- Arredondamento cumulativo por mês: subdividir o mesmo intervalo em mais avanços não altera o total devido. Não usar quantidade de jogos como relógio salarial.
- Acumular competência no livro e na conta a pagar; vencimento no primeiro dia do mês seguinte, como política explícita desta versão de simulação.
- Pagar com o caixa disponível. Se faltar caixa, manter saldo a pagar — sem apagar despesa, inventar crédito bancário ou pagar duas vezes após reload.
- Clubes CPU deixam de descontar um quarto de folha por partida quando já adotaram esse livro. A previsão antiga de folha não é mais um segundo pagamento.
- Um contrato com fim conhecido vence pelo calendário da carreira. Data ausente, inválida ou já antiga na adoção é preservada como legado a esclarecer; não libera automaticamente passe livre.

Jogadores sem `sourceId`, como promovidos da base simulada, recebem compromisso/contrato com identidade local por carreira/clube/ID, inclusive para renovação. Não se inventa cadastro real para eles. Sua identidade universal e transferência para outros clubes continuam dependentes da unificação de jogadores em E6; a venda sem identidade de propriedade resolvível é bloqueada, não concluída pela metade.

## Contrato não é inscrição

`Employment` e `Registration` são entidades distintas. Um novo contrato pode existir com inscrição pendente. Uma política de janelas, quando configurada, carrega fonte, vigência e intervalos; fora da vigência não é considerada autorização. Inscrições pendentes aguardam uma janela válida e não entram no XI automático, no arraste de escalação, na partida humana ou nas contribuições/força de partidas de fundo.

**Sem configuração comprovada, preserva-se a inscrição livre legada e registra-se essa origem.** Não foram cadastradas datas oficiais de janelas, regras FIFA/CBF ou limites de cada competição por adivinhação. O modelo básico é uma política por carreira, não um registro jurídico completo por todas as competições. E4/E6 poderão especializar esses dados com fontes e regras vigentes.

`paymentTerms` e `commission` já têm representação tipada na negociação, mas parcelas e comissões são recusadas pelo executor. Nenhum desses tipos de proposta está habilitado enquanto seus lançamentos não existirem. Não há agente completo ou serviço externo ativo.

## Migração e persistência

- `FinanceState.version = 1`, `rulesVersion = finance-v1`.
- Envelope E2 migra de `foundation-v1` para `foundation-finance-v2`, preservando seed, revisão, IDs e operações antigas. Versões desconhecidas falham sem reset. A versão nova impede um cliente E2 de interpretar silenciosamente a nova semântica.
- Livro começa na data atual do save, com o saldo atual. Não reproduz partidas passadas, não cobra meses anteriores, não devolve supostos pagamentos antigos sem evidência e não troca CURRENT_CAREER_RULESET.
- IDs, resultados e universo congelado permanecem; outros saves não recebem os negócios de uma carreira. Transferências históricas que não registraram os dois lados/propriedade não são reconstruídas por inferência.
- O agregado inteiro continua no JSON do save na nuvem, sob o CAS e RLS existentes, sem tabelas paralelas ou reset/backfill financeiro.
- `20261106030000_financial_checkpoint_guard.sql` amplia o trigger para impedir remoção do livro adotado, retrocesso da data financeira ou downgrade de regras, além dos conflitos E2. Testado com tabela temporária/rollback, sem ler ou alterar saves privados.
- Índice local armazena apenas o campo financeiro com DEFLATE versionado (`fflate`); o domínio e a nuvem recebem o objeto normal. Saves anteriores em JSON simples continuam legíveis. O write atômico permanece um único snapshot; erro de quota não publica uma liquidação parcial. Universos grandes continuam em IndexedDB/nuvem como antes.
- Cache IndexedDB agrupa gravações redundantes de render, mantendo o último snapshot completo. Na retomada, revisão do checkpoint tem precedência sobre relógio real de um cache obsoleto; o universo congelado é recuperado do mesmo save, não trocado pelo catálogo atual como atalho.

## Validação e limites

Suíte de domínio cobre centavos, adoção repetida, reserva/cancelamento, taxa simétrica, contrato novo, insuficiência, duplicação, concorrência de proprietário, parcelas/comissões bloqueadas, competências iguais em intervalos subdivididos, atraso de folha, empréstimo/retorno, renovação, inscrição pendente, venda humana bilateral e snapshot/reabertura. Persistência cobre codec financeiro, separação por conta e prioridade da revisão.

A integração usa o catálogo completo de 16.248 jogadores, não uma cópia simplificada do executor. Cenários antigos continuam testando partida/retomada, escalação, bilheteria, estádio, emprego, base, ofertas e carreiras independentes. Tempos de espera dos testes mais pesados refletem a adoção e o cache do agregado maior; não foram removidas as asserções de caixa, histórico e propriedade.

Não foi feita campanha plurianual, teste visual real de duas abas/dispositivos nem simulação jurídica integral das inscrições. Atomicidade é do agregado do save, não de uma transação distribuída entre navegador/nuvem ou das projeções legadas em `career_players`/`career_player_seasons`. Ações antigas de receita/obra não foram todas convertidas em comandos de domínio; sua ponte está identificada no livro. Isso não habilita uma autonomia maior de mercado: E4 continua sendo a próxima etapa, após a validação e publicação de E3.

### Resultado de validação da entrega

- Regressão completa: **106 arquivos / 534 testes aprovados** (`npm test -- --testTimeout=20000`, 445,11 s).
- Depois das duas novas verificações de contrato local: **53 testes / 7 arquivos aprovados** em finanças/avanço, checkpoint, persistência, cache, revisão e diretório; integração de promoção/reload reaprovada separadamente (1 teste, 28 não selecionados).
- Build de produção final, `tsc --noEmit`, ESLint e `git diff --check`: aprovados.
- Guard financeiro PostgreSQL: `finance_guard_passed = true` em transação com tabela temporária/rollback; recusa escritor obsoleto, remoção do livro, retrocesso e regras antigas; aceita próximo checkpoint legítimo.

O helper legado `recruitPlayer` continua exportado por compatibilidade/testes, mas não é o caminho de liquidação da UI ou CPU. Não reutilizar sua antiga projeção de pré-pagamento salarial em novos comandos; usar `settleTransfer`/`settlement.ts`.
