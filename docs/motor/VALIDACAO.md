# Encerramento da etapa 1 — diagnóstico e especificação

## Escopo entregue

- [x] Anexo original preservado integralmente e identificado por SHA-256 em ORIGEM.md.
- [x] 27 capítulos extraídos em nove setores sem perder ou duplicar capítulo na divisão.
- [x] 22 módulos do capítulo 2.2 inventariados com situação, código, testes e lacunas.
- [x] Matriz 27/27 com evidências e destino de implementação.
- [x] Fluxos atuais de carreira, partida, mercado e armazenamento descritos.
- [x] Modelos de dados existentes, unidades, identidade, persistência e riscos documentados.
- [x] Fronteiras e contratos propostos para orquestrador, decisões, eventos, transações e migração.
- [x] Uso decisório da IA explicitado, com fallback, validação, quota, segredo, replay e retirada gradual por setor.
- [x] E2–E8 com dependências, fatia inicial, entregas e critérios de aceite verificáveis.
- [x] Questões abertas atribuídas à etapa que precisa resolvê-las; nenhuma bloqueia encerrar o diagnóstico.
- [x] Nenhuma integração Gemini, migração de banco, alteração em saves, UI, runtime ou parâmetro do motor feita pela etapa 1.

## Evidência executada

No checkout-base `5a15be314b0085700d1dae65e0b316ca95a07ab1`, com estes documentos novos:

| Comando / verificação | Resultado |
|---|---|
| `npm ci --no-audit --no-fund` | Dependências instaladas a partir do lockfile, sem alterar package/lockfile |
| `npm test -- --testTimeout=15000` | **498 testes aprovados em 102 arquivos** |
| `npm run build` | Build de produção aprovado |
| `npx tsc --noEmit` (após build gerar tipos Next) | Aprovado |
| `npm run lint` | Aprovado |
| `git diff --check` | Aprovado |
| Hash da cópia comparado com anexo | Idêntico |
| Extrações comparadas com corpos dos capítulos do original | 27/27 idênticas; cada uma em um único setor |
| Links Markdown locais dos documentos novos | Destinos existentes |

Esses testes validam a base atual, **não** implementam nem aprovam requisitos futuros. Os logs completos de execução são temporários do ambiente, não dados a versionar. Não foi feita campanha de dez temporadas, avaliação de desempenho de Gemini, auditoria de dados privados ou teste real de serviço externo. Não foi necessária inspeção visual: nenhuma tela foi alterada.

## Como reproduzir a conferência documental

A cópia original pode ser conferida com `sha256sum docs/motor/ESPECIFICACAO-ORIGINAL-v1.0.md` e o valor de ORIGEM.md. Para a divisão, identificar os títulos `# N.` do original e de `setores/*.md`: todos os números de 1 a 27 devem aparecer exatamente uma vez nos setores, com o mesmo corpo (ignorando apenas whitespace terminal). Conferir links relativos a partir da pasta de cada documento. `DIAGNOSTICO.md` usa prefixos G/B/S declarados para arquivos reais; referência a teste não comprova toda a área.

## O que significa “etapa 1 concluída”

Há material suficiente para executar E2 sem reinventar a arquitetura, sem confundir estado atual com promessa e sem depender de chave de IA. Não significa que o motor geral esteja pronto, que os riscos R01–R12 foram corrigidos ou que E2 começou. O próximo escopo é extrair/centralizar avanço, identidade/revisão, eventos, configuração e persistência segura conforme PLANO.md. As demais regras serão implementadas e verificadas nas etapas atribuídas.
