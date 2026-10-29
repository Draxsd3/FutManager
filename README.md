This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Interface credits

“Farm-Fresh Web Icons” by FatCow Web Hosting / Marcis Gasuns, used under the Creative Commons Attribution 3.0 license: https://github.com/gammasoft/fatcow

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Contas e carreiras

Ao abrir o jogo em uma nova sessão ou entrar na conta, o menu inicial é apresentado.
Se a página for recarregada na mesma aba durante uma carreira, o jogo restaura a tela
e o progresso ativos; partidas são retomadas pausadas. A opção **Menu inicial**
salva a carreira e encerra essa retomada automática. Para criar ou continuar uma
carreira, o jogador entra ou cria uma conta com email e senha pelo Supabase Auth.
Cada conta pode ter várias carreiras, cada uma com seu elenco, escalação, táticas e
partida próprios. Não há botão flutuante sobre o conteúdo.

### Configuração do Supabase

Configure no `.env.local` e no ambiente de produção da Vercel:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA
```

- Habilite o provedor **Email** em Authentication / Sign In Providers.
- Configure a **Site URL** de produção e as URLs de redirecionamento autorizadas
  em Authentication / URL Configuration. Inclua o endereço usado para testes.
- Se a confirmação de email estiver habilitada, o usuário deve confirmar o cadastro
  antes de entrar. Configure SMTP para entrega confiável de emails em produção.
- Aplique as migrations de `supabase/migrations/` na ordem. As políticas RLS
  existentes restringem os saves e os dados de carreira ao `auth.uid()` proprietário.
- Não é necessária uma nova coluna para os checkpoints: o estado completo da
  carreira é salvo em `game_saves.state.progress` (JSONB já existente). As tabelas
  antigas de elenco continuam disponíveis para leitura de saves legados da conta.
- O cliente não cria mais sessões anônimas. Caches antigos sem proprietário e
  carreiras de sessões anônimas **não são atribuídos automaticamente** a uma conta,
  para evitar a exposição de dados em navegadores compartilhados.
- O cache do navegador é separado por ID de usuário. Não é uma proteção contra
  acesso físico/devtools no mesmo dispositivo: a proteção dos dados em nuvem é RLS.
- Mudanças locais mais recentes são recuperadas na próxima entrada. Para continuar
  em outro dispositivo, aguarde a indicação de sincronização antes de fechar.
- Nunca configure a chave secreta como `NEXT_PUBLIC_*`, nem a envie ao repositório.
  Chaves secretas divulgadas devem ser revogadas/rotacionadas no Supabase.

### Validação

```bash
npm ci
npm test
npm run lint
npm run build
```

Os testes incluem cadastro/login com serviços simulados, separação de contas,
carreiras independentes, retorno ao menu, retomada de partidas e ordenação dos
checkpoints. A validação real de Auth, email e RLS exige um projeto Supabase
configurado e acessível; mocks não substituem essa verificação em produção.

## Diagnóstico de navegação e versão publicada

O aplicativo usa uma única rota (`/`). A navegação entre menu, login, editor,
carreiras e clube acontece dentro dessa rota, sem trocar de domínio. O
botão **Menu inicial** da barra superior retorna ao componente minimalista
`StartMenuScreen`, sem adicionar um botão flutuante sobre o conteúdo.

O menu atual contém “SEU CLUBE. SUAS REGRAS. SUA HISTÓRIA.” e não contém os botões
indisponíveis “OPÇÕES”, “CRÉDITOS” e “SAIR DO JOGO”. Se esses botões aparecerem,
a página exibida não corresponde à interface atual do código.

No rodapé em desktop, `Build <hash>` identifica os primeiros oito caracteres do
commit informado pela Vercel (`VERCEL_GIT_COMMIT_SHA`). Em execução local ou sem
essa variável, aparece `Build local`; isso não comprova publicação em produção.

Para investigar uma tela antiga, confira o endereço exato aberto no navegador,
a branch de produção configurada na Vercel (`main`), o commit do deploy e o domínio
associado. Um link de preview/deploy antigo não é atualizado quando a produção
muda. Não crie redirecionamentos para domínios presumidos: valide primeiro o
endereço e o projeto corretos.

## Agenda do clube

O botão Agenda abre um submenu com Jogos do seu time, Jogos amistosos e Central de empregos. Cada escolha abre a seção correspondente; as abas da agenda também permitem alternar entre elas. O submenu aceita teclado (setas, Home, End e Escape) e fecha ao clicar fora.

A agenda apresenta o compromisso disponível na rodada, filtro de mando e acesso à escalação. Não gera datas futuras nem convocações fictícias. Amistosos e empregos mostram estados vazios informando que agendamento e ofertas ainda não estão implementados.

## Central de gestão

- **Carreiras salvas:** cards responsivos, busca por carreira/clube/técnico, ordenação por atualização, clube ou rodada, continuar e excluir dentro da conta conectada.
- **Principal:** volta ao elenco da carreira ativa. **Menu inicial** preserva o progresso via autosave e retorna às opções iniciais. Agenda mantém o submenu antes da navegação.
- **Tabelas:** catálogo Nacional, Internacional, Seleções, Estadual e Regional com busca e filtro de país/região. As ligas refletem o banco editável; consultar outra divisão não atribui a ela os resultados da divisão ativa. Copas e estaduais sem inscrições integradas exibem estados vazios, não classificações inventadas. O resumo ativo usa os dados atuais do motor; não equivale a um histórico acumulado de temporadas.
- **Estádio:** dados cadastrados do estádio, capacidade, saldo da carreira e folha do elenco. Visão geral, simulador de bilheteria e infraestrutura. A projeção usa capacidade × ocupação × ingresso, menos custo informado; não altera a carreira. Ampliação e manutenção ainda não executáveis.

Validação: `npm test`, `npm run lint`, `npm run build`. Testes cobrem navegação Principal, busca/ordenação e ações de saves, exploração de competições com dados ausentes, acessibilidade do diálogo e cálculo hipotético de bilheteria.

### Escalação moderna

O centro tático usa camisas texturizadas no molde padrão com o número cadastrado (IDs como fallback de saves antigos), sem upload ou exibição de fotos na escalação. Arraste uma camisa com mouse/toque para área livre do campo para personalizar a posição, ou sobre um titular para trocar; reservas podem ser arrastados pela camisa, com rolagem da lista pelo texto. Também é possível selecionar uma camisa e ativar um dos 20 destinos de setor por clique/Tab+Enter. Soltar fora do campo, cancelar o gesto ou pressionar Esc preserva o time.

Plano tático mantém formação, estilo, marcação e concentração de ataque reais. Reservas têm busca/filtro; indicadores mostram força estimada com adaptação/energia e alertas. Qualquer jogador pode ocupar qualquer área, inclusive goleiros no ataque ou jogadores de linha no gol; a adaptação é informativa, não um bloqueio. Reabrir a tela preserva o XI e as coordenadas; mudar a formação reorganiza a equipe, enquanto restaurar posições mantém os titulares. Posicionamento personalizado continua sendo interpretado pela função mais próxima do esquema no motor atual.

### Tática em uma única janela

Campo e banco inteiro são ajustados à altura da janela, lado a lado, inclusive em telas estreitas; não há rolagem principal nem do banco. Em telas menores, **Plano tático** abre os ajustes sob demanda. A área lateral de análise é independente. Guias de defesa/meio/ataque e 20 subposições são opcionais e desligadas por padrão. Elas não prendem o arraste a uma grade. A camisa mantém o ponto de pega e a coordenada livre de soltura; reservas substituem o titular espacialmente mais próximo ou a camisa indicada, sem filtro de posição.

## Editor moderno e estúdio de uniformes

Em **Editor de clubes → Estúdio de uniformes**, cada clube mantém seus três
uniformes existentes e uma coleção de até oito conceitos adicionais. O editor
continua oferecendo cadastro/edição de clubes, jogadores e categorias de base.

- **Manual:** cores, padrão liso/listrado/faixa e prévia fotográfica com silhueta fixa, baseada na referência do responsável pelo projeto.
  É um criador determinístico, não IA. Mostra até cinco inscrições abreviadas;
  não reproduz logotipos nem posições oficiais de patrocínio.
- **Patrocínios:** preencher um por linha, indicando posições se desejado, ou
  confirmar expressamente a ausência de patrocinadores. Não há pesquisa nem
  presunção automática de marcas oficiais/atuais. São aceitas até 12 inscrições
  de 100 caracteres; o prompt inclui todas sem truncá-las.
- **IA:** integração real no servidor com OpenAI. Todo pedido é reconstruído com
  nome/sigla do clube, cores, padrão, patrocínios e enquadramento frontal fixo
  1024×1536 com referência visual anexada, além da direção criativa. O cliente não pode substituir o prompt
  integral da API. Modelos podem falhar na reprodução de escudos, textos e
  marcas: o resultado é um conceito para revisão, não uniforme oficial.
- **Biblioteca:** IndexedDB, separada por conta e clube, **somente neste navegador**.
  Patrocínios e imagens personalizados não são sincronizados com Supabase e
  não alteram as camisas usadas pelo motor de partidas. Limpar dados do site ou
  mudar de dispositivo não preserva essa biblioteca. Baixe as imagens para backup.
- **Importar/exportar:** PNG/JPG/WebP de até 5 MB, reduzidos para até 900 pixels
  no maior lado e recodificados no navegador. Manuais são exportados como SVG;
  importações projetadas no molde são exportadas como SVG autocontido; resultados da IA, como WebP. Excluir exige confirmação.

### Ativar geração real em produção (administração)

1. Aplicar no projeto Supabase correto a migração
   `supabase/migrations/20261029140000_kit_generation_quota.sql`.
   Ela cria uma tabela com RLS e uma função atômica de cota: três tentativas por
   janela de uma hora/conta autenticada, sem acesso direto à tabela. Contas
   anônimas não podem gerar. Falhas do provedor também consomem uma tentativa.
2. Configurar **OPENAI_API_KEY**, secreta e apenas no servidor, nas variáveis
   do ambiente da Vercel. Nunca usar prefixo `NEXT_PUBLIC_` nem colar chaves em
   chat/repositório. `OPENAI_IMAGE_MODEL` é opcional, padrão `gpt-image-1`.
   Manter as duas variáveis públicas Supabase já utilizadas pelo aplicativo.
3. Configurar limites/alertas de custo no provedor e fazer novo deploy.
4. Validar com uma conta real: geração, revisão antes de adicionar, isolamento
   e resposta 429 ao exceder a cota. A geração envia identidade/patrocínios e
   descrição para a OpenAI; não envia o token do jogador ao provedor.

`GET /api/kits/generate` informa apenas a presença de configuração, não atesta
conectividade nem a aplicação da migração. `POST` valida o JWT no Supabase,
valida o corpo e exige a cota persistente antes de chamar o provedor. Ausência de
chave ou de cota retorna indisponibilidade (503), sem fallback falso. Token
inválido/conta anônima: 401; cota esgotada: 429; falha do provedor: 502/504.
A resposta usa `no-store`; a chave nunca é retornada. Há timeout de 100 segundos.

**Estado da entrega em 29/10/2026:** a chave do provedor não estava configurada
na Vercel e esta migração não foi aplicada remotamente nesta entrega. Assim,
a criação manual, importação, biblioteca e cópia do prompt funcionam, mas a
IA permanece indisponível até concluir a configuração. Testes de API usam
serviços simulados, não comprovam geração paga real. A migração foi exercitada
em PostgreSQL local (PGlite), incluindo permissões e renovação de janela;
isso não substitui a aplicação/validação do Auth e RLS no Supabase real.

### Molde profissional de camisa (referência de 29/10/2026)

A referência branca enviada pelo responsável define gola em V, mangas, ombros,
barra e proporção da peça (largura incluindo mangas / altura ≈ **0,86**).
O molde canônico é 870×1000 com fundo realmente transparente — o quadriculado
da imagem enviada não faz parte do uniforme. Tecido, costuras e dobras são
preservados ao aplicar cores, sem contorno de desenho infantil.

- **Sem imagem cadastrada:** principal lisa na primeira cor do clube; reserva
  lisa na segunda; terceiro modelo neutro. Vermelho/preto resulta em principal
  vermelha e reserva preta. Editor e estúdio compartilham a mesma função.
- **Criador e campo:** modelos manuais e camisas numeradas usam o mesmo tecido
  e proporção. O número continua sendo texto legível; não são fotos de jogadores.
  As cores do editor também chegam ao tema da carreira para clubes personalizados.
- **Importação:** a imagem é recortada como estampa no molde fixo, sem substituir
  sua silhueta. A prévia deve ser revisada antes de salvar; áreas da imagem fora
  do molde são descartadas. A exportação SVG inclui o tecido e a estampa, sem
  depender de URLs externas.
- **IA:** usa `images/edits`, enviando o molde como imagem de referência PNG, além
  do prompt obrigatório com clube e patrocínios. A resposta é enquadrada e
  mascarada deterministicamente no servidor pelo mesmo molde, antes da revisão
  do jogador. Respostas com dimensões/formato inesperados são rejeitadas.
  Isso fixa a silhueta, não garante correção de marcas/textos. A ativação da IA
  continua dependendo da chave e da migração descritas acima.
- Os arquivos e modelos já cadastrados permanecem preservados como acervo;
  não há regravação destrutiva das imagens anteriores.

`src/lib/kits/fabric-template.json` contém a referência derivada e transparente.
Para reconstruí-la a partir do PNG original fornecido (1536×1024):
`node scripts/build-kit-template.mjs /caminho/referencia.png`. O recorte é
explícito e reproduzível, sem geração por IA. Testes rasterizam as cores,
comparam a silhueta e exercitam a normalização da resposta simulada do provedor.

## Visualização da partida

A central de partida simula passes, finalizações, gols, desarmes, faltas e discussões como lances compartilhados entre placar, minicampo e resumo. O campo usa titulares, formação e posições personalizadas; o adversário usa uma formação genérica. Os demais jogos exibem apenas resultados simulados, reproduzíveis por rodada e minuto entre clubes cadastrados na divisão. Não constituem calendário real ou histórico de classificação. O modelo é simplificado, sem física contínua ou elenco real do adversário; saves antigos permanecem compatíveis.
### Demarcações completas e contíguas

“Mostrar setores” oferece 20 áreas cobrindo o campo inteiro, sem espaçamento
entre elas: ST dos dois lados, CF (segundo atacante), LW/RW, CAM, LM/RM,
três CM, CDM, LWB/RWB, LB/RB, três CB e GK. O ataque aponta para cima;
esquerda e direita correspondem à perspectiva da equipe. Siglas seguem a
referência, com nome completo em português no tooltip e na navegação acessível.

As regiões são células de proximidade (Voronoi), calculadas a partir dos
centros de cada posição; as bordas se encontram e cobrem inclusive as laterais
e os cantos. Clique/Enter em uma área posiciona o jogador em seu centro.
O arraste continua livre, sem encaixe nessas áreas ou limitação por função.
As guias começam desligadas, não alteram as posições salvas, o motor, a
formação ou o dimensionamento simultâneo de campo e reservas.

### Guias agrupadas e campo com proporção controlada

CB, CM e ST não têm mais linhas internas separando posições iguais, e cada
função recebe uma única sigla visível. Os 20 destinos acessíveis por clique ou
teclado continuam disponíveis; o posicionamento livre e os saves não mudam.
As arestas entre funções diferentes são desenhadas uma única vez.

A prancheta deixa de esticar o campo à largura inteira da coluna. Seu tamanho
é calculado a partir da largura **e** da altura disponíveis, centralizado numa
área própria: proporção de apresentação 6:5 em desktop/paisagem; 68:105 em
telas estreitas. São proporções de interface, não um modelo de medidas físicas
de estádio. Camisas/textos acompanham a largura útil do campo. Banco completo
permanece ao lado, sem rolagem principal.

### Banco de reservas compacto

A prancheta mostra nome, posição e força dos reservas sobre uma imagem ilustrativa de banco. Dois cliques abrem a ficha; pelo teclado, selecione o jogador e use o botão de ficha ou a tecla I. Segure e arraste para o campo/titular para substituir ou para outro reserva para mudar a ordem. A ficha também permite reordenar por botões. A ordem é salva com o elenco da carreira; Escape cancela um arraste ou fecha a ficha.

### Fluidez e melhores momentos

Na partida, a bola segue a posição atual e o próximo passe parte do recebedor, com preferência por companheiros próximos. A animação respeita pausa, velocidade e a preferência de movimento reduzido. Os painéis ao vivo e o resultado destacam finalizações, gols, faltas, discussões, cartões e alterações; passes e desarmes permanecem no estado da simulação, mas não lotam o resumo. A física e o adversário continuam simplificados.

### Gols e posição dos goleiros

Os jogadores se movimentam perto das posições táticas definidas, com uma área de deslocamento mais restrita para goleiros. Gols novos exibem uma comemoração temporária com autor, clube e minuto; retomadas não repetem gols antigos. O autor adversário usa um jogador do elenco cadastrado quando há dados suficientes; caso contrário, é identificado genericamente. A escalação do adversário é simulada.
### Táticas na partida

Durante a partida, **Escalação e táticas** abre um modal compacto sobre o jogo, focado apenas em formação e substituições. A formação é aplicada ao selecionar; escolha quem sai e quem entra, em qualquer ordem, e confirme a substituição. Fechar, pressionar Escape ou clicar fora não efetiva uma troca pendente. O jogo fica pausado durante os ajustes, e as alterações confirmadas integram o autosave. O campo e os controles completos continuam disponíveis na escalação pré-jogo; posições já personalizadas são preservadas nas substituições.

### Movimentação coletiva no minicampo

Os 22 jogadores da ilustração ajustam suas posições em relação à bola: a formação e as posições personalizadas permanecem como âncoras, enquanto jogadores de linha oferecem apoio ou cobertura e um defensor próximo pode pressionar. O goleiro acompanha a bola perto da sua posição escolhida. A interpolação congela na pausa e acompanha a velocidade, com respeito a movimento reduzido. É uma aproximação visual heurística; não altera o motor da partida nem representa física real.

A direção foi inspirada por [UT Austin Villa: formação e atribuição de papéis](https://www.cs.utexas.edu/~pstone/Papers/bib2html-links/LNAI12-MacAlpine.pdf) e [PhysicsFC: movimentação sem bola e formação](https://arxiv.org/html/2504.21216v1), sem reproduzir os sistemas completos descritos nesses trabalhos.
