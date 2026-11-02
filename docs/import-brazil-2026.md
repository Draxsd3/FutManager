# Importação da base brasileira — temporada escolhida: 2026

## Resultado

- **706 clubes brasileiros únicos** e **16.040 atletas adultos no arquivo normalizado**.
- **15.992 atletas disponíveis no editor/jogo**, respeitando o limite já existente de 35 por clube. Os 48 excedentes continuam no JSON de origem normalizado; não há substituição por jogadores inventados. As listas separadas de juniores da origem não foram importadas nesta etapa.
- **704 escudos** e **637 imagens de uniformes** (somando principal, reserva e terceiro, conforme existirem). Arquivos ausentes não recebem URLs falsas: os componentes usam seus fallbacks existentes nas cores do clube.
- Séries **A/B/C: 20 clubes cada**. Série **D: 88 clubes encontrados**, dos 96 participantes previstos. **558 outros clubes** ficam como **Sem divisão nacional**, com o estado registrado, sem colocá-los artificialmente na Série D.
- Cinco arquivos alternativos de mesmo nome/estado foram deduplicados. Clubes homônimos de estados diferentes continuam separados. Três arquivos inválidos/incompletos foram rejeitados. O relatório detalha cada caso.

### Oito participantes de 2026 ausentes na base utilizável

Monte Roraima-RR, Primavera-MT, Tirol-CE, Piauí-PI, Laguna-RN, ABECAT-GO, Ivinhema-MS e Real Noroeste-ES. Não foram criados elencos fictícios para completar a Série D.

## Como usar

Contas sem base local ou em nuvem recebem a base importada automaticamente. Para uma conta com editor existente, abrir **Editor de clubes → Importar base brasileira 2026** e confirmar. A confirmação substitui cadastro/elenco dos clubes brasileiros reconhecidos, mantendo o ID do clube para projetos do ateliê, preservando clubes personalizados não reconhecidos e sem apagar saves de carreira. As carreiras já iniciadas conservam seus snapshots; iniciar uma nova carreira para usar os novos elencos e as divisões escolhidas.

As edições de cadastro/elenco dos clubes reconhecidos são substituídas somente nessa ação explícita. Reimportar não duplica clubes/jogadores. Cada conta recebe UUIDs próprios; não usar IDs globais da origem nas tabelas compartilhadas do Supabase.

## Dados da origem versus padrões da simulação

A importação lê `.ban` como **serialização Java de dados**, usando `javaobj-py3`; não executa Java, programas do Brasfoot nem classes desses arquivos. O código de país 29 é confirmado no `BRA.cfg`; o filtro não se baseia no sufixo do nome do arquivo.

Campos lidos: nome de clube/atleta, UF, cores, estádio/capacidade, técnico, nível do clube, posição primária, idade, lado e códigos de qualidades/estrela presentes. Códigos de qualidades não decodificados ficam como “Importada (cód. N)”, sem atribuir uma qualidade falsa. A UF segue a ordem codificada na origem (AM antes de AP, MG antes de MS/MT).

A fonte não fornece, de forma identificada, força individual equivalente ao FutManager, salário, valor, numeração de camisa ou contrato. **Esses campos usam padrões de simulação, não fatos**: força = 40 + 2×nível do clube + bônus 6 para estrela (limitada a 35–95); salário = força²×8; valor = força³×5; energia inicial 100; camisa sequencial; contrato inicial 31/12/2027. Não há inferência de posição secundária. Fundação desconhecida = 0 localmente/null em nuvem. Gols/assistências começam em 0 e nota em branco; não são importadas estatísticas de jogos inexistentes.

**Os elencos, técnicos, idades e imagens são os dos arquivos fornecidos**, possivelmente anteriores a 2026. A escolha de 2026 organiza somente as inscrições nacionais, não atualiza transferências ou uniformes automaticamente.

O calendário existente permanece uma **simulação simplificada** (inclusive C/D, sem reproduzir os formatos oficiais de grupos). Clubes “Sem divisão nacional” estão disponíveis no editor/diretório/catálogo estadual, mas não geram liga nacional nem inscrição automática na Copa/estadual do motor. A central estadual agrupa cadastros por UF; não significa inscrição oficial na primeira divisão estadual. Nenhuma inscrição oficial regional foi inferida por geografia.

## Persistência e implantação

A base inteira e snapshots de carreira têm cache IndexedDB por conta, além do cache legado quando couber no localStorage. Cache pendente não é substituído por uma cópia antiga da nuvem após recarregar. As leituras do editor no Supabase são paginadas (500 linhas); upserts usam lotes de até 250 e exclusões lotes de 100. As gravações são serializadas por conta.

Aplicar a migração **`supabase/migrations/20261031100000_allow_state_only_clubs.sql`** no Supabase remoto para permitir `Sem divisão nacional`. Este repositório não contém credencial administrativa para executar SQL remotamente; a migração não é aplicada pelo build da Vercel. Enquanto não aplicada, a importação funciona no dispositivo/IndexedDB e a interface sinaliza sincronização pendente; não afirmar sincronização remota concluída. As demais migrações do editor também precisam estar aplicadas.

## Reprodução

```sh
python -m venv .venv
.venv/bin/pip install -r scripts/importer/requirements.txt
.venv/bin/python scripts/importer/import_brazil.py
```

Entradas: `arquivos/teams/*.ban`, `escudos`, `camisas`, `camisas2`, `camisas3`. Saídas: `src/data/brazil-clubs.json`, `src/data/brazil-assets.json`, imagens sob `public/game-assets/clubs/br-*` e `docs/import-brazil-2026-report.json`. O diretório original não é alterado. A configuração explícita de correspondência fica em `scripts/importer/brazil-2026.json`; nenhuma divisão é adivinhada a partir de força/reputação.

## Referências das divisões de 2026

- [ge — clubes das Séries A/B/C/D para 2026](https://ge.globo.com/pi/futebol/noticia/2025/12/29/brasileirao-veja-os-156-clubes-das-series-a-b-c-e-d-em-2026.ghtml): listas A/B/C cruzadas com os nomes da base.
- [CBF — grupos da Série D 2026](https://www.cbf.com.br/futebol-brasileiro/noticias/campeonato-brasileiro/a/cbf-divulga-grupos-da-serie-d-de-2026): lista D mais recente; inclui Ivinhema-MS e Sampaio Corrêa-RJ. A posição na tabela/promovidos ao final de 2026 não altera a divisão de início da temporada escolhida.
