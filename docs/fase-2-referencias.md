# Referências técnicas — fase 2 (consultadas em 05/10/2026)

## Vercel Blob Hobby

A documentação oficial informa que Vercel Blob é gratuito no Hobby dentro das cotas incluídas: **1 GB/mês de armazenamento médio**, **10.000 operações simples**, **2.000 avançadas** e **10 GB de transferência**. Ao exceder, Hobby não cobra excedente automaticamente; o acesso ao Blob é suspenso até a cota renovar (a página informa 30 dias). Não usar para arquivo que ultrapasse a franquia nem ativar Pro/billing para contornar o limite.

- [Preços e cotas do Vercel Blob](https://vercel.com/docs/vercel-blob/usage-and-pricing)
- [Vercel Hobby e limite de uso gratuito](https://vercel.com/docs/plans/hobby)

## Upload e proteção de arquivos

O cliente envia bytes diretamente ao Blob por URL de upload assinada; o corpo do arquivo não passa pela Function. O guia de armazenamento privado recomenda que arquivos privados sejam entregues por uma rota autenticada que busque o conteúdo com `get()` e faça streaming ao navegador. Isso importa porque Vercel Functions impõem 4,5 MB a corpos request/response bufferizados; streaming é a exceção documentada. Ao executar dentro da Vercel, o SDK usa OIDC quando a store está conectada ao projeto.

- [Client uploads e autorização](https://vercel.com/docs/vercel-blob/client-upload)
- [Blob privado e download autenticado](https://vercel.com/docs/vercel-blob/private-storage)
- [Referência do SDK (upload/get)](https://vercel.com/docs/vercel-blob/using-blob-sdk)
- [Vercel Functions — streaming](https://vercel.com/docs/functions/streaming)
- [Vercel Functions — limites](https://vercel.com/docs/functions/limitations)

## Vite e Vercel Functions

A documentação de Vite explica hosting SPA estático, rewrites e funções: se a integração Vite não publicar funções diretamente, o caminho recomendado é usar a integração Nitro; confirmar no Preview da Vercel que somente a função necessária em `api/blob.ts` está reconhecida. Não colocar rewrites de SPA que desviem `/api/blob` para HTML.

- [Vite na Vercel](https://vercel.com/docs/frameworks/frontend/vite)

## Compromisso de custo

Firebase Authentication/Firestore permanecem em Spark. A rota de Blob é opcional e separada do Firestore; não adicionar Firebase Storage, Cloud Functions, service account ou credenciais privadas do Firebase ao bundle. Se a Vercel solicitar cartão, Pro ou billing para a Blob store, parar e não confirmar.
