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

O link sempre abre o menu inicial. Para criar ou continuar uma carreira, o jogador
entra ou cria uma conta com email e senha pelo Supabase Auth. Cada conta pode ter
várias carreiras, cada uma com seu elenco, escalação, táticas e partida próprios.
O botão **Salvar e voltar ao início** fica disponível em todas as telas da carreira.
Uma partida retomada começa pausada.

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
carreiras e clube acontece dentro dessa rota, sem trocar de domínio. Tanto o
botão **Menu inicial** da barra superior quanto **Salvar e voltar ao início**
retornam ao mesmo componente minimalista `StartMenuScreen`.

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
