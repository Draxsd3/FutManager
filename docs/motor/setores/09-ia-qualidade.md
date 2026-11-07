# IA, testes e diretrizes de implementação

Extração de leitura da especificação original v1.0, capítulos 24, 25, 26, 27. Não significa funcionalidade implementada. O original prevalece em caso de erro de transcrição; a proposta de integração híbrida está em [IA-HIBRIDA](../IA-HIBRIDA.md). Situação real e evidências em [DIAGNOSTICO](../DIAGNOSTICO.md).

# 24. Uso de inteligência artificial generativa

A IA generativa pode auxiliar em: - Redação de notícias. - Textos de
entrevistas. - Comunicados. - Narrativas de acontecimentos. - Descrições
de jogadores e treinadores. - Apresentação de relatórios.

Ela não deve ser a autoridade final para: - Resultado de partidas. -
Cálculo de classificação. - Valores financeiros. - Validade de
contratos. - Regras de transferência. - Elegibilidade. - Estatísticas. -
Evolução de atributos. - Decisões que alterem o estado oficial sem
validação do motor.

Toda saída generativa que será exibida como fato deve ser baseada em
dados reais do estado da simulação.

------------------------------------------------------------------------

# 25. Testes e critérios de qualidade

O motor não deve ser considerado pronto apenas porque o jogo abre ou
porque uma temporada pode ser iniciada.

Deve ser testado em simulações automatizadas de várias temporadas,
inclusive sem interação do usuário.

## 25.1. Testes funcionais

-   Contratação e venda.
-   Renovação e término de contrato.
-   Empréstimo e retorno.
-   Demissão e contratação de treinador.
-   Lesão e recuperação.
-   Suspensão.
-   Promoção e rebaixamento.
-   Encerramento de temporada.
-   Aposentadoria.
-   Geração e evolução de jovens.

## 25.2. Testes de comportamento

-   Clubes com perfis diferentes tomam decisões diferentes.
-   Clubes financeiramente frágeis não gastam como clubes ricos.
-   Jogadores valorizam salário e projeto esportivo de acordo com sua
    personalidade.
-   Jogadores insatisfeitos podem pedir saída.
-   Clubes repõem posições importantes quando possível.
-   Treinadores recebem propostas compatíveis com sua reputação.
-   Diretorias reagem de maneira coerente a resultados e finanças.
-   O mercado não fica artificialmente parado nem movimentado em
    excesso.

## 25.3. Testes de equilíbrio

-   Distribuição de títulos e resultados.
-   Frequência e valores das transferências.
-   Evolução média de jogadores.
-   Idade de aposentadoria.
-   Crescimento e endividamento dos clubes.
-   Folhas salariais.
-   Frequência de lesões.
-   Quantidade de jovens gerados.
-   Estabilidade das competições.

## 25.4. Testes de integridade

-   Nenhum jogador duplicado ou em dois clubes.
-   Nenhum contrato ou transferência em estado inválido.
-   Nenhuma partida duplicada.
-   Nenhuma divergência entre resultados e classificação.
-   Nenhum saldo financeiro inconsistente.
-   Nenhuma estatística divergente dos eventos.

Os testes devem produzir relatórios e permitir identificar a causa dos
problemas.

------------------------------------------------------------------------

# 26. Diretrizes de implementação

A IA desenvolvedora deve:

1.  Analisar a arquitetura atual antes de modificar o projeto.
2.  Identificar quais sistemas já existem e quais estão incompletos.
3.  Mapear entidades, banco de dados, serviços e fluxos existentes.
4.  Preservar funcionalidades e dados válidos.
5.  Evitar duplicar regras ou criar sistemas paralelos.
6.  Implementar a lógica de negócio em módulos reutilizáveis.
7.  Manter parâmetros configuráveis e centralizados.
8.  Criar migrações seguras quando o modelo de dados precisar mudar.
9.  Implementar logs e testes automatizados.
10. Não simular funcionalidades apenas na interface.
11. Não substituir regras reais por valores aleatórios ou textos
    fictícios.
12. Validar o funcionamento com simulações completas.
13. Documentar decisões técnicas e limitações.
14. Não considerar um módulo concluído sem testes de integração com os
    sistemas relacionados.

## 26.1. Compatibilidade com a base atual

O jogo atualmente possui clubes e campeonatos nacionais brasileiros
cadastrados. O trabalho inicial deve aperfeiçoar o motor utilizando esse
universo existente.

Não é objetivo deste documento solicitar o cadastro imediato de outros
países ou clubes.

Entretanto, o motor deve ser preparado para receber novos países, ligas,
clubes e regulamentos futuramente por configuração e dados, sem depender
de alterações estruturais em toda a lógica.

------------------------------------------------------------------------

# 27. Resultado esperado

O resultado deve ser um universo de futebol vivo, persistente e
autônomo.

O usuário deve sentir que: - Os clubes possuem projetos e estratégias
próprias. - Os jogadores têm personalidades e objetivos individuais. -
As negociações são disputadas e imprevisíveis, mas coerentes. - Os
contratos possuem consequências reais. - Os treinadores constroem
carreiras. - As diretorias têm expectativas e limites. - O dinheiro
influencia as decisões. - Os resultados esportivos alteram o futuro dos
clubes. - O mercado continua funcionando sem intervenção do usuário. - O
mundo evolui de temporada em temporada. - As notícias refletem
acontecimentos reais. - Nenhum clube existe apenas para servir de
adversário ao usuário.

**Regra final:** o jogo não deve simular apenas partidas de futebol.
Deve simular o funcionamento de todo o ecossistema profissional do
futebol, no qual cada entidade possui interesses próprios e suas
decisões afetam as demais.
