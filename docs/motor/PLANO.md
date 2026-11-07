# Plano executável por etapas

Status inicial: E1 documental; E2–E8 **não iniciadas por este trabalho**. As capacidades pré-existentes são as do diagnóstico, não entregas deste plano. Dependências são portas de qualidade, não só ordem de arquivos. Não migrar todos os setores de uma vez.

## E1 — diagnóstico e especificação

Entrega: original íntegro; divisão dos 27 capítulos; inventário dos 22 módulos; evidências de código/teste, dados/fluxos, riscos, contratos propostos, IA híbrida, decisões e critérios E2–E8. Sem comportamento novo, segredo ou migração. Encerramento em VALIDACAO.md. A análise não exige já resolver riscos ou comprovar dez temporadas; isso é trabalho das etapas respectivas.

## E2 — fundação do motor

**Depende de:** E1. **Fatia de implementação:** extrair o avanço pós-partida para serviço de domínio puro, mantendo os efeitos atuais através de adaptadores. Não redesenhar telas ou reescrever partidas.

Entregas:
- Envelope do estado: schemaVersion, rulesVersion, revisão, semente e cursor/streams RNG, data simulada.
- Agenda por intervalo, comando/evento com IDs estáveis, política de idempotência e checkpoint; controle de concorrência e falha segura.
- Separar regras/executor de React; adaptadores para snapshot/save existentes, modo sem UI para testes.
- Registro tipado de evento/decisão e configuração central, sem executar Gemini ainda. Interface de política interna/assistida/comparação com provedor falso de teste.

Aceite: avançar o mesmo intervalo duas vezes não duplica nada; serializar/reabrir mantém resultado; ordem estável de eventos; conflito de revisão não sobrescreve save; falha entre validar e salvar não publica metade; migração repetida preserva IDs, resultados, elenco e diferentes carreiras; API de cadastro não necessária para avançar. Testar com relógio/RNG injetados e rede indisponível. Mudanças intencionais de semântica devem ser separadas da extração para detectar regressão.

**Saída necessária para E3:** um comando atômico e reproduzível pode alterar um agregado e persistir efeitos uma vez.

## E3 — finanças, contratos e registro básico

**Depende de:** E2. **Primeiro problema:** fechar R01/R02 antes de aumentar autonomia de compras.

Entregas: unidades canônicas e conversores; livro-caixa, reservas e compromissos; caixa/orçamento/folha separados; contrato de pessoa distinto da inscrição; novo vínculo de compra; expiração/renovação/retorno; comando de liquidação comum aos dois lados, incluindo venda humana. Regras de janela/registro por configuração com fonte e vigência, sem preencher lacunas legais com números inventados. Comissões previstas no modelo antes de habilitar agentes completos.

Aceite: taxa sai de comprador e entra no vendedor uma vez; reserva salarial não é pagamento; folha por competência não depende de quantos jogos o clube disputou; recusada não altera caixa/vínculo; insuficiência bloqueia efeitos; empréstimo divide encargo e retorna na data, inclusive em salto de calendário; contrato novo tem datas válidas; atleta de registro pendente não entra na escalação; dados incompletos não liberam automaticamente passe livre; save/restauração mantém compromissos. Testes de parcelas e comissão só liberam esses tipos de proposta quando seus lançamentos estiverem implementados.

## E4 — planejamento, mercado e piloto IA

**Depende de:** E2/E3. **Fatia inicial:** mesma negociação de compra/venda usada por humano e CPU, depois seleção de alvos assistida.

Entregas: plano por posição/papel/calendário; preço contextual; avaliação de vendedor, atleta e agente; propostas versionadas, concorrência, prazos e desistência; trilha de decisões; configuração dos modos por setor. Integrar Gemini apenas com segredo seguro, autenticação, quota, timeout e fallback. Decisão afeta ações reais via executor, não texto decorativo.

Aceite: vender titular abre necessidade de reposição ou alternativa interna justificada; pobre não compra como rico; jovem excedente pode preferir empréstimo; salário pesa segundo perfil sem garantir aceite; duas propostas não contratam a mesma pessoa; resposta tardia revalida orçamento/propriedade; retorno JSON malicioso/ilegal é rejeitado; quota esgotada não impede avanço; replay não consulta API; modo comparação produz um único commit. Rodar rodadas consecutivas com métricas de movimentação e saúde dos elencos, sem exigir fechar seis negócios sempre.

## E5 — técnicos, diretorias e emprego humano

**Depende de:** E2/E3; usa política comum de E4 se IA habilitada. **Fatia inicial:** entidade Coach com ID/contrato e vagas reais, em vez de derivar identidade apenas do clube.

Entregas: perfil/objetivos da diretoria; avaliação resultado versus expectativa; contrato/salário/rescisão; reputação/histórico; contratação CPU, demissão e desemprego humano jogável; propostas com expiração; projeção da tela Técnicos a partir do modelo de carreira. Preservar padrão visual/modal do jogo; screenshot de lista não autoriza redesign nesta etapa.

Aceite: um técnico não trabalha simultaneamente em dois clubes incompatíveis; custo de demissão/contratação cabe no caixa; vaga e proposta são coerentes após reload/troca de clube; humano e CPU obedecem ao modelo comum sem proteção invisível; desempregado pode avançar/buscar emprego sem travar em partida inexistente; histórico só inclui fatos da carreira, não empregos reais inventados. Não avaliar todos com mesma expectativa.

## E6 — jogadores, relações, saúde, treino e base

**Depende de:** E2/E3; integra E4/E5. **Fatia inicial:** unificar identidade e condição dos jogadores, inclusive promovidos, com rotina temporal CPU/humano.

Entregas: atributos/personagens simulados com origem clara, informação conhecida/oculta; potencial e curva de evolução; carga/descanso/lesão/tratamento; moral/promessas; treino contextual e aposentadoria; base anual por clube, sem criar jogadores reais por inferência. Eliminar dependência de API de cadastro na carreira preservando dados de base já salvos.

Aceite: potencial não garante crescimento; repetição de treino não dá evolução infinita; CPU também cansa/recupera; lesionado/suspenso inelegível não atua; recaída/declínio registrados; jovens têm identidade única e promoção idempotente; mudança de ano incrementa idade a partir de data quando conhecida, ou política legada explícita; aposentadoria não apaga estatísticas. Demais dimensões entram incrementalmente sem fingir personalidade real fornecida pela fonte.

## E7 — tática, partidas e disciplina

**Depende de:** E2/E3/E6; perfil de técnico de E5. **Fatia inicial:** invariantes comuns de resultado/estatísticas/elegibilidade para partidas assistidas e de fundo, preservando o motor ao vivo existente.

Entregas: plano por técnico/adversário, escalação elegível, substituições CPU por contexto, disciplina por competição, reinícios e parâmetros pesquisados; avaliar granularidade CPU sem inventar eventos de jogos antigos. IA opcional escolhe plano em marcos, não lance/placar. Respeitar instruções e livre arraste humano.

Aceite: gols/eventos/estatísticas conciliam; cartões/suspensão respeitam competição; lesão e expulsão afetam opções; número/janelas de trocas respeitam regulamento; favoritos têm vantagem em amostras mas não vitória garantida; nenhuma manipulação a favor do humano; retomada mesma versão/seed mantém continuação; comparação estatística explicita cenário e fonte, não chama heurística de xG oficial.

## E8 — temporadas e sustentabilidade do universo

**Depende de:** E2–E7. **Fatia inicial:** uma passagem anual íntegra, depois ciclos longos sem intervenção.

Entregas: fechamento/prêmios/histórico; atualizar inscrições, promoções/rebaixamentos/vagas e calendários; envelhecimento, contratos, mercado, bases e economia contínuos; notícias e recordes referenciando eventos. Primeiro universo brasileiro existente; extensibilidade por dados não significa cadastrar outros países agora.

Aceite: todos os participantes corretamente inscritos após rollover; nenhuma partida paga/contada duas vezes; temporadas antigas imutáveis; clubes mantêm elenco e finanças plausíveis; sem crescimento infinito de talento/dívida/jogadores. Executar suíte sem UI de **10 temporadas com múltiplas sementes fixas**, com relatório por ano de caixa, folha, negócios, vagas, faixa etária, população, lesões, resultados e violações. Dez anos é horizonte inicial de validação, não regra de futebol nem garantia de realismo.

## Critério comum de entrega E2–E8

- Código integrado ao ciclo real + testes unitários, de transição e integração + snapshot/reload/duplicação/falha.
- Migração segura e limitações registradas; nenhuma exclusão/reset de carreira como atalho.
- Regras e parâmetros em docs atualizados; simulação headless usa mesmos módulos, não cópia para teste.
- Validar lint, tipos, build, suíte relevante e regressões; publicação na main via PR da branch ativa e verificação do SHA na produção.
- Não habilitar serviço externo pago automaticamente. Se o custo/latência depender de decisão ainda aberta, manter interno até a configuração estar validada.
- Etapa concluída não é sinônimo de todos os capítulos de seu setor concluídos: itens adiados precisam constar explicitamente no relatório, sem trocar objetivo por aparência de UI.
