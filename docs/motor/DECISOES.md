# Decisões da especificação e pendências de calibração

Estas são decisões de planejamento, não mudanças ativadas no jogo.

| ID | Decisão / motivo | Consequência |
|---|---|---|
| D01 | Preservar o original e extrair capítulos sem reformular exigências | Hash em ORIGEM; correções futuras da especificação precisam versão, não edição silenciosa do original |
| D02 | Um humano, agentes CPU autônomos, mesma legalidade | Não depender de edição manual, visita à tela ou de outro usuário; não manter imunidade humana invisível quando carreira/desemprego estiverem prontos |
| D03 | Não reescrever todos os módulos nem criar universo paralelo | Extrair a coordenação de B, reutilizar loans/transfers/season etc. com adaptadores e testes |
| D04 | E2 entrega fundação antes de Gemini tomar decisões oficiais | Estado íntegro, validação e persistência são pré-requisitos, não algo que LLM possa substituir |
| D05 | IA pode propor estratégia; executor decide se é legal e aplica | Modos por setor e retirada gradual; não limitar IA a textos, nem deixá-la escrever no save |
| D06 | Save isolado e compatibilidade aditiva | Não resetar CURRENT_CAREER_RULESET; preservar partidas, identidades, negócios e bases. Sem atualizar carreira com coleta nova |
| D07 | Tempo do jogo, não relógio real, controla acontecimentos | Navegador fechado não gera evolução autônoma em tempo real; processar intervalo ao avançar |
| D08 | Informação incompleta não autoriza invenção de dados reais | Distinguir informação ausente, estimada e simulada; não inferir nacionalidade pelo clube ou personalidade real sem fonte |
| D09 | Não alterar design na etapa 1 | Screenshot Técnicos é contexto visual, não autorização de redesign; regras saem da UI sem transformar jogo em painel administrativo |
| D10 | Configuração Markdown não é lógica executada automaticamente | Parser de partidas continua separado; apenas configurações estruturadas validadas poderão alimentar os módulos |
| D11 | Cobertura deve ser demonstrada por cenário | Mostrar implementado/parcial/ausente, sem chamar subsistema completo por haver uma tela ou teste unitário |
| D12 | Segredo somente no servidor, fora do repositório e save | Nenhuma configuração/chamada Gemini agora; rotação recomendada para chave exposta em conversa |

## Questões que não bloqueiam E1

| Questão | Proposta inicial / limite seguro | Resolver antes de |
|---|---|---|
| Modelo e quota Gemini realmente disponíveis | Provedor intercambiável; interno por padrão até configuração validada, sem promoção automática a pago | Ativar piloto E4 |
| Limites de timeout, lotes, tokens e gasto | Configuração versionada, fail-safe e quota atômica; sem números definitivos sem teste de latência/custo | Ativar piloto E4 |
| Economia inicial por clube e receitas reais/estimadas | Identificar fonte; preservar saldo legado na migração, não trocar pelo de uma coleta; simulação indicada como tal | Balanceamento E3/E8 |
| Salário bruto/líquido, encargos e comissões | Unidade canônica e convenção explícita, sem afirmar cálculo fiscal real não pesquisado | Contratos/ledger E3 |
| Janelas, pré-contratos, limites de inscrição | Pesquisa por país/competição/temporada; configuração com vigência, nunca suposta regra universal | E3 habilitar operação regulamentada |
| Pesos de ambição, personalidade e reputação | Informação simulada marcada, inicialização com semente; valores ajustados por cenários e campanhas | E4/E5/E6 |
| Granularidade das partidas de fundo | Invariantes comuns primeiro; escolher detalhe conforme custo e objetivos, sem simular todos os toques por obrigação | E7 |
| Retenção de auditoria e tamanho dos saves | Histórico canônico não deve ser limitado pelas 100 notícias de UI; medir e planejar compactação/arquivamento sem perder replay exigido | E2 persistência/E8 escala |
| Autoridade local versus servidor em modo offline | Estado transacional local, autorização/revisão no sync; definir resolução de conflito explícita, nunca último updatedAt cego | Fechar E2 |

Nenhuma escolha acima exige pedir ao usuário credenciais pelo chat. Um futuro mecanismo de configuração precisa ser seguro. Questões abertas devem ganhar decisão e teste no momento indicado, não ser tratadas como já resolvidas por este diagnóstico.
