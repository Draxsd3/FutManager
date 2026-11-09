# Orçamento do checkpoint: falhar antes de substituir o save

O decoder existente aceita no máximo 64.000.000 caracteres descompactados e 64.000.000 bytes no payload codificado. Esses limites não foram ampliados.

O encoder agora aplica o mesmo orçamento antes da compressão/gravação. Antes, um agregado grande podia ser gravado com sucesso e depois recusado pelo leitor. A falha agora ocorre antes de `localStorage.setItem`; o checkpoint legível anterior permanece disponível e a publicação CAS não é anunciada como concluída.

A verificação não é solução de arquivamento plurianual. Livros financeiros, resultados e histórico exigem orçamento de crescimento e arquivamento frio/paginado com consistência e imutabilidade. Não reduzir a base de clubes, apagar partidas, omitir obrigações ou aumentar a quota para ocultar essa necessidade.

## Verificação

- Teste da fronteira compartilhada: valores inválidos e acima do teto são recusados; teto exato é aceito.
- Teste do encoder real: uma string cujo JSON ultrapassa o teto é recusada antes de construir o dicionário/comprimir.
- Regressão do codec: unicode, escape, colisões de tokens, objetos, arrays e binário UTF-16 preservados.
- Persistência/CAS mantém as provas existentes de falha de escrita sem substituir o checkpoint anterior.

Esta correção de proteção de dados não constitui conclusão da E8 ou certificação de dez temporadas sustentáveis.
