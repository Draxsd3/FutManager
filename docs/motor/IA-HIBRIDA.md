# Política híbrida de decisão — especificação para etapas futuras

**Não há Gemini integrado ou habilitado nesta etapa.** Nenhum modelo/chave foi validado. Esta é a complementação solicitada pelo usuário para o capítulo 24: IA generativa pode propor decisões estratégicas temporariamente, não apenas redigir. Continua proibida a alteração direta do estado oficial sem validação. Não usar LLM para inventar placares, resultados financeiros, pessoas, regulamentos ou atributos reais.

## Modos por setor

| Modo | Quem propõe | Quem executa |
|---|---|---|
| interno | política interna versionada | executor/validador comum |
| assistido | IA dentre ações/contextos fornecidos; fallback interno | o mesmo executor/validador |
| comparação | ambas com o mesmo snapshot | apenas a política explicitamente escolhida; outra fica em auditoria |

Modo é configuração versionada da carreira/setor, não um botão sem efeito. Novos setores começam internos e só migram para assistido após validações e quota/timeout. A retirada da IA é por configuração/versão, sem mudar os comandos e sem apagar decisões antigas. Comparação não toma a resposta do LLM como gabarito.

Primeiro piloto previsto: **planejamento e seleção de alvos de mercado CPU**, depois de E2/E3 e dos fluxos transacionais de E4. Diretoria/técnicos em E5. Plano tático em E7, sem chamada por lance. Sistemas não concluídos não devem ser declarados cobertos apenas por uma resposta textual de IA.

## Protocolo de decisão proposto

Entrada, sem chave nem dados pessoais da conta:

```json
{
  "decisionId": "career:event:club:market:1",
  "sector": "market",
  "contextVersion": 1,
  "stateRevision": 42,
  "rulesVersion": "market-v1",
  "simulatedOn": "2026-01-12",
  "actorId": "club-a",
  "objective": "reforcar lateral sem comprometer salarios",
  "knownContext": { "missingFacts": ["personalidade do alvo"] },
  "allowedActions": [
    { "actionId": "wait", "kind": "wait" },
    { "actionId": "approach-player-b", "kind": "propose-transfer" }
  ]
}
```

Saída estruturada por JSON/schema, com limite de tamanho:

```json
{
  "decisionId": "career:event:club:market:1",
  "stateRevision": 42,
  "actionId": "approach-player-b",
  "reason": "A posicao e carente e o custo cabe no limite fornecido."
}
```

IDs de exemplo, não valores a inserir em saves. Valores financeiros reais e limites das ações serão preenchidos pelo motor, em unidade explícita; quando negociação permitir contraproposta, schema delimitará valores/prazos em vez de aceitar campos arbitrários. Texto justificativo não prova que o critério foi respeitado.

Pipeline: gerar contexto e alternativas legais → minimizar/serializar → chamar provedor → validar formato/identidade/revisão → validar ação, orçamento, vínculo, regulamento, direitos dos agentes e integridade → aplicar transação → registrar resultado. Revalidar no momento do commit; resposta atrasada não vale sobre estado alterado.

## Conhecimento e memória

O modelo recebe o que o agente pode saber, não potencial real oculto, preço mínimo secreto de rival ou tudo o que existe no save. Informação desconhecida deve permanecer explicitamente desconhecida; observação pode fornecer estimativa e incerteza. Nomes/descrições importados são dados não confiáveis, não instruções para o modelo. Sem acesso a ferramentas arbitrárias, banco ou URLs sugeridas na resposta.

Memória é estruturada (objetivos, promessas, relações e decisões/eventos), resumida por setor. Não enviar todo o Markdown, todos os clubes e todos os saves em cada pedido. Regras de setor formam versão/prompt estável; estado relevante é a parte dinâmica. A aplicação não executa texto Markdown como código.

## Falhas, cotas e continuidade

- Rede e credencial exclusivamente no servidor; autenticação e autorização por conta/carreira. Não expor segredo em bundle, HTML, erro, log ou save; não usar prefixo NEXT_PUBLIC para chave.
- Quota persistente/atômica por conta com limite por minuto/dia e orçamento por avanço; idempotência por decisionId e hash do contexto. Limite de chamada em lote, tokens e timeout explícitos, configurados e testados antes de ativar.
- 401/403, 429, timeout, resposta vazia/truncada, JSON inválido, ID desconhecido, ação ilegal ou revisão obsoleta não bloqueiam a carreira nem aplicam efeitos parciais.
- Uma alternativa interna segura ou “aguardar” é registrada com motivo tipado. Não repetir infinitamente nem tentar outro modelo pago automaticamente. Circuit breaker reduz novas tentativas durante indisponibilidade.
- Resultado do provedor não é fato até o executor aceitar. Interface deve distinguir interno, IA validada, comparação e fallback; não exibir “IA ativa” apenas porque uma variável existe.
- O usuário forneceu credencial em conversa: recomendar rotação e cadastro seguro futuro. Não copiar credencial para documentos, Git, testes, parâmetros de URL ou contexto enviado ao modelo. Nenhuma configuração de produção faz parte da etapa 1.

## Replay e auditoria

A mesma semente **não garante** a mesma saída do provedor. Guardar entrada normalizada ou referência durável, hash, alternativas, versões, modelo/provedor, modo, saída normalizada, decisão aplicada, razão, validações/rejeições, fallback e eventos causados. Replay reutiliza a decisão já aceita, não faz nova chamada. Uma simulação nova pode consultar o modelo e divergir; não prometer determinismo generativo.

Decisões têm ciclo solicitado → proposto → validado/rejeitado → aplicado/substituído por fallback. RequestId/attemptId não substitui operationId: duas tentativas não podem produzir duas contratações. Dados de auditoria privados da carreira; não registrar chave ou conteúdo de outras contas. Feed curto de notícias não limita retenção do histórico canônico.

## Como retirar IA de um setor

1. Criar cenários fixos e casos adversos, tanto contra motor quanto contra provedor simulado.
2. Comparar legalidade, custo, adequação ao elenco, diversidade de estratégias e efeitos em temporadas; justificativa bonita não é métrica.
3. Rodar política interna em modo de comparação sem segundo commit.
4. Calibrar com relatórios; nenhuma violação de integridade é tolerada. Metas de realismo exigem amostra/base documentada e não são inventadas aqui.
5. Publicar nova rulesVersion com modo interno e migração segura; preservar auditoria e replay das carreiras anteriores.

O provedor deve ser intercambiável. A escolha do modelo depende de disponibilidade/cota realmente verificadas no momento da integração; nenhum plano gratuito é tratado como ilimitado ou garantia permanente de serviço.
