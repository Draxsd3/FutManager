# Etapa 4 — planejamento, mercado e piloto de decisão assistida

## Entrega e fronteira

E4 usa o executor financeiro da E3. Não implementa E5–E8, não redesenha telas e não ativa serviço pago ou reaproveita a credencial enviada em conversa. O modo inicial continua **interno**. O adaptador Gemini e o caminho assistido estão integrados, mas chamadas reais exigem configuração segura explícita no servidor e opt-in salvo na carreira.

Módulos:
- `simulation/market-planning.ts`: plano por clube, profundidade, calendário, reposição, shortlist e contexto limitado.
- `simulation/market-rules.ts`: preço contextual e avaliação de papel/remuneração; representação desconhecida é explícita.
- `world-market.ts`: ciclo semanal de propostas, concorrência, liquidação posterior, desistência e métricas.
- `transfers.ts`, `incoming-offers.ts`, `career.ts`, `simulation/settlement.ts`: negociação comum com projeções compatíveis para as telas humanas, salário proposto, versões e prazos.
- `simulation/market-policy.ts`: política interna/assistida/comparação no avanço real e também headless.
- `simulation/market-wire.ts`: schemas estritos e validação de identidade/revisão/ação; sem dependência de credenciais ou código de servidor.
- `simulation/market-settings.ts`: configuração da política como comando revisionado da própria carreira.
- `simulation/market-client.ts`, `app/api/market/decision/route.ts`, `lib/server/market-ai.ts`: sessão, rota relativa, autorização, quota/cache e adaptador Gemini.
- `market-planning-panel.tsx`: seção expansível “Bastidores do mercado” no mercado existente, sem substituir navegação, estilos ou tabelas do jogo.

## Planejamento e preço

Cada clube recebe plano com a data simulada, caixa disponível depois dos compromissos E3, limite de investimento, jogos **agendados** nos próximos 21 dias, profundidade/necessidades por setor e referências de titularidade. Jogos cancelados, já disputados ou ainda bloqueados não geram falsa congestão.

Política explícita `market-v1`: cobertura-base G=2, L=4, Z=4, M=4, A=4; quatro ou mais jogos próximos acrescentam uma alternativa por setor de linha. O limite da rodada é 25% do disponível financeiro, não 25% de um saldo que ignora folha e dívidas. Esses números são regras versionadas de simulação, não normas oficiais de inscrição.

A saída de referência entre os 11 papéis de partida (inclusive segundo/terceiro atleta do setor, não só o melhor jogador) registra necessidade de reposição ou uma alternativa interna de nível próximo. A necessidade não resolvida continua no próximo plano. O plano usa os códigos primários atualmente disponíveis no catálogo; não inventa uma identidade universal, uma personalidade, um potencial oculto ou todas as especializações de E6/E7. As siglas/guias do campo não foram alteradas.

Preço considera a estimativa de valor existente, disponibilidade para venda/empréstimo, importância no elenco vendedor e vencimento conhecido próximo. Contrato ausente/antigo não transforma atleta em livre. Valores antes de abordar são estimativas: a resposta contextual do clube pode ter outro valor. Não há avaliação oficial, taxa legal de agente ou data oficial de janela inventada.

Papel projetado (disputa de titularidade, rotação, desenvolvimento) é separado do salário. Atleta experiente sem perspectiva de uso pode exigir compensação; um jogador muito acima do nível do projeto pode recusar salário sem compensação; empréstimo sem espaço de jogo é recusado. Aumentar a taxa do passe não compra automaticamente o consentimento do atleta. Os critérios são transparentes e determinísticos, não uma alegação de conhecer sua personalidade real. Não há promessa contratual de minutos ou agente real inventado: a representação permanece **desconhecida**, e parcelas/comissões continuam bloqueadas.

Jovens excedentes podem ser disponibilizados para empréstimo, preservando o vínculo e sua cobertura temporal da E3. Um clube sem disponível suficiente pode esperar mesmo com uma carência. A igualdade legada de alguns caixas de abertura e a economia simplificada de receitas não foram corrigidas com depósitos artificiais em saves existentes; limites financeiros são os efetivamente salvos. E4 não é calibração econômica plurianual.

## Propostas, concorrência e fechamento

Uma rodada semanal cria no máximo seis propostas, não seis compras obrigatórias. Uma negociação CPU nova fica pendente, reserva os termos acordados e só é liquidada numa rodada posterior — existe intervalo para resposta/alteração do mundo. A política atual tem prazo de 14 dias e espera mínima de um dia; o processamento permanece na agenda semanal. Um salto além do prazo expira a proposta em vez de executar dezenas de compras retroativas.

Dois clubes CPU podem disputar o mesmo atleta. As ofertas têm ID, revisão, criação, prazo, origem, taxa e salário; o desempate usa termos e ID estável. A primeira liquidação válida muda a propriedade uma vez, e as rivais são encerradas com reservas liberadas. Revisão obsoleta não sobrescreve uma contraproposta nova. Resposta tardia revalida proprietário, empréstimo vigente, cobertura do contrato, saúde mínima do vendedor, espaço, consentimento salarial e dinheiro disponível.

A proposta humana ativa continua protegida de conclusão CPU automática. Nenhuma rodada vende o elenco humano sem consentimento. Propostas recebidas no perfil são projeções da mesma lista de negociações, com prazo e salário proposto; aguardam o consentimento humano e não prendem/pagam dinheiro como se já estivessem aceitas. Aceitar passa pelo mesmo executor e revalida o comprador naquele momento. Empréstimos recebidos pelo humano continuam no fluxo de sondagem/negociação existente; não foi criado um gerador automático de propostas de empréstimo no perfil.

A liquidação comum da E3 preserva taxa simétrica, novo vínculo e inscrição, salário como compromisso e checkpoint único. O salário negociado entra no contrato novo e na reserva, não fica apenas no texto da oferta. Rejeição, expiração, falta de dinheiro e mudança de proprietário não publicam metade de um negócio. O emprego CPU preexistente foi preservado sem antecipar a entidade/contratos de técnicos de E5.

## Política híbrida integrada

`advanceCareerWithMarketPolicy` é o caminho do botão de continuar depois da partida. O núcleo síncrono `advanceCareer` continua utilizável em modo headless e como executor de replay.

1. Calcular snapshot especulativo privado com as alternativas legais. Nada é publicado nessa etapa.
2. Em modo interno, usar esse resultado sem sessão, rede ou chamada de provedor.
3. Em assistido/comparação, selecionar **um** contexto CPU por avanço para o piloto (até três alvos e a opção de esperar). Os demais clubes continuam internos, com essa origem registrada.
4. Validar JSON/schema, decisionId, revisão e actionId. O modelo escolhe uma alternativa; não edita preço, salário, pessoa, regulamento, placar ou save.
5. Reconstruir as condições a partir do snapshot original e conferir o contexto exato antes de executar. Em assistido pode mudar a ação real, incluindo não fazer proposta. Em comparação executa **somente a política interna** e registra a escolha alternativa.
6. Publicar apenas o snapshot final no CAS existente. Repetição de comando já salvo retorna o checkpoint sem consultar API.

Erro, JSON extra/malicioso, ação desconhecida, quota, identidade/revisão errada ou timeout resultam em fallback interno. O cliente aborta a requisição e registra motivo/circuito; após falhas a janela de resfriamento aumenta. A interface não mostra “IA ativa” só porque o modo foi selecionado. A seção de bastidores distingue ação interna, escolha assistida validada, comparação e fallback.

`engine.decisions`/eventos conservam a trilha do agregado. O painel guarda os últimos 200 detalhes e 52 resumos semanais com propostas, conclusões, encerramentos, carências e disponibilidade; não são o único histórico de transações. Notícias continuam independentes e limitadas como antes.

## Servidor, autenticação e orçamento de chamadas

A rota `POST /api/market/decision` usa URL relativa; nunca localhost no navegador. Corpo não aceita userId, URL de provedor, modelo arbitrário, ferramentas ou comandos financeiros. Contexto inclui apenas alternativas e informações reduzidas do jogo, sem email, credencial ou catálogo completo. Dados recebidos são dados não confiáveis, não instruções.

Para fazer chamada real são necessárias **todas** as variáveis abaixo no ambiente de servidor, fora do Git/chat/bundle:

- `GEMINI_MARKET_ENABLED=true` (opt-in explícito de operação);
- `GEMINI_API_KEY` (credencial nova/rotacionada, não a exposta na conversa);
- `GEMINI_MARKET_MODEL` (modelo escolhido explicitamente após conferir disponibilidade/custo no projeto; não há modelo pago alternativo automático);
- `SUPABASE_SERVICE_ROLE_KEY` (somente no servidor para as duas funções de quota/cache);
- as variáveis públicas Supabase já existentes.

Além disso, a carreira precisa estar na nuvem sob o proprietário autenticado, com revisão exatamente correspondente e modo assistido/comparação persistido. Sessão inválida, anônima, email não confirmado, carreira de outro proprietário ou revisão sem sincronizar não chamam o provedor. O jogo pode continuar internamente/offline mesmo assim. A chave service-role não é enviada ao navegador nem ao Gemini.

Limites implementados, não promessas sobre o plano gratuito do Google:
- uma tentativa de provedor por revisão da carreira, garantida por índice único no servidor;
- seis requisições novas/minuto e 50/dia UTC **por conta**, somando suas carreiras;
- lock transacional PostgreSQL antes de verificar e consumir quota;
- identidade por conta/carreira/decisionId + SHA-256 do contexto;
- repetição idêntica retorna cache; outro contexto com o mesmo ID conflita; chamada em andamento não dispara uma segunda;
- sucesso e falha terminal são persistidos; o cache não é apagado por um TTL que permitiria cobrar novamente pelo mesmo ID;
- contexto HTTP até 18 KB, resposta do provedor até 16 KB, saída até 256 tokens, JSON estrito com justificativa limitada;
- limite do pipeline de provedor e aborto; sem repetição ilimitada, chamadas por lance ou troca automática de modelo.

`market_ai_requests` usa RLS e privilégios exclusivos de service-role para tabela/funções. Guarda só hash, revisão, data e resposta reduzida, não o save, o prompt completo ou segredo. Exclusão da carreira/conta remove suas linhas por FK. Se a persistência de quota/cache falhar, não publicar uma escolha não confirmada; continuar com fallback.

**Não foi feita chamada real ao Gemini nesta entrega.** O adaptador foi testado com HTTP falso e respostas válidas, truncadas, excessivas, 429 e ilegais. Custos, quotas reais do modelo e qualidade das decisões de um modelo real precisam de ativação segura e avaliação posterior. Não declarar o piloto ativo em produção sem esse passo.

## Migração e compatibilidade

O envelope adota `foundation-market-v3`, aceitando migração aditiva de E2/E3. `worldMarket.marketState.version=1`, política `market-v1`. Seed, IDs, saldos, elencos, resultados, negócios antigos e universos congelados não são resetados. Negócios legados sem metadados permanecem compatíveis; propostas novas têm prazo e versão. A data faltante não é inventada para declarar livre ou apagar um vínculo.

As migrações SQL `20261107010000_market_policy_and_ai_quota.sql` e `20261107011000_market_ai_revision_bound.sql` preservam CAS/guardas financeiros e recusam downgrade E4 ou remoção do plano adotado. Não fazem backfill de carreira ou mudam permissões de saves. A segunda migração reforça o limite por revisão e o opt-in no servidor.

O índice local comprime `marketState` com codec `market-deflate-v1`, como o financeiro da E3; nuvem e domínio continuam com objeto normal. JSON antigo continua legível. Auditoria e compromissos são privados de cada conta/carreira; o catálogo/editor não recebe transferências de uma carreira.

## Validação

Os testes cobrem planejamento/calendário, caixa insuficiente, reposição de titulares inclusive segundo/terceiro papel, alternativa interna, salário/papel, preço contextual, jovem excedente, concorrência bilateral, propriedade e taxa únicas, reservas liberadas, prazo, resposta obsoleta, dez rodadas consecutivas com métricas/limites, efeito real da escolha assistida, comparação única, replay sem API, JSON ilegal, quota/falha, timeout/aborto e circuito. Integração cobre controle da política, avanço real, compactação/reload e isolamento por conta, além das regressões de emprego/ofertas no tabuleiro completo.

No PostgreSQL, fixtures próprias em transação/rollback comprovaram CAS E3→E4, rejeição de downgrade/remoção/retrocesso, autorização por dono/revisão/modo, cache, conflito de contexto, limite por revisão, quota entre carreiras da conta, separação entre contas, limite diário e privilégios server-only. Nenhum save privado foi inspecionado ou alterado, e os usuários/linhas de teste foram revertidos.

Não é campanha plurianual, teste visual manual de duas abas, stress concorrente real do PostgreSQL ou validação jurídica de todos os agentes/janelas. Não há IA para todas as decisões do mundo nem promessa de determinismo do Gemini: o replay usa decisões salvas. Limitações econômicas/identidade universal/treinadores do plano continuam nas etapas correspondentes.
