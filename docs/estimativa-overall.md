# Força dos jogadores: estimativa para simulação

A coleta Transfermarkt não fornece overall. As forças do jogo são **estimativas**, não notas oficiais nem avaliações de scouting. O valor de mercado em euros é um indicador imperfeito, afetado por idade, contrato e potencial; não é convertido para reais para esse cálculo.

- Se houver valor positivo: `68 + 12 × log10(valor EUR / 1.000.000)`, com ajuste etário (-3 abaixo de 20 anos, -1 de 20 a 22, -2 acima de 36). Sem bônus automático de clube/divisão; um destaque em time menor pode superar atletas de times maiores.
- Sem valor positivo: referência por divisão (A 70, B 63, C 57, D 52, sem divisão 49), ajustada pelo nível do clube (máximo ±3), estrelas existentes (máximo +4/-2) e idade. Zero ou dado ausente não significa jogador sem valor. Resultado arredondado e limitado entre 35 e 90.
- As estrelas pré-existentes são apenas um sinal aproximado no caso sem valor. Não são reescritas; jogadores com mesma informação podem receber a mesma nota. Não se usa ID para inventar habilidade.
- Na coleta de novembro, valores estão disponíveis para 628/673 atletas da Série A, 488/660 da B, 10/614 da C e 9/2261 da D. Assim, a maior parte das notas nas divisões inferiores tem baixa confiança e precisa de dados individuais melhores.
- Catálogos novos usam o modelo; importações preservam notas já existentes. Em **Editar universo → Visão geral → Recalcular overalls**, a pessoa pode confirmar a substituição de todas as forças do catálogo, inclusive edições manuais. O resultado não altera estrelas, outros atributos, clubes, uniformes, carreiras salvas ou resultados; registros sem clube cadastrado são ignorados e contados. Não é uma migração automática de carreiras. Novas carreiras usam o catálogo atualizado.
