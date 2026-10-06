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


## Diagnóstico de credenciais Blob e penalidades por prazo (consultado em 06/10/2026)

A mensagem apresentada pelo SDK (`No blob credentials found`) indica que a Function não recebeu credenciais do Blob. A documentação da Vercel descreve OIDC gerenciado para Functions quando a Blob store está conectada ao projeto; neste projeto, o runtime deve receber `BLOB_STORE_ID` e `VERCEL_OIDC_TOKEN`. O token `BLOB_READ_WRITE_TOKEN` é uma alternativa baseada em segredo, não deve ser exposto ao navegador nem embutido em `VITE_*`. Depois de conectar a store aos ambientes Production/Preview, é necessário criar um novo deployment para que as variáveis estejam disponíveis. A captura do usuário confirma a mensagem do SDK; a consulta de logs do Hobby não retornou registros dentro da janela solicitada, portanto não foi usada para inferir ausência/presença da store.

- [Conectar o SDK Blob a Vercel Functions — credenciais OIDC](https://vercel.com/docs/vercel-blob/using-blob-sdk)
- [Armazenamento Blob privado — autenticação e downloads](https://vercel.com/docs/vercel-blob/private-storage)
- [Uploads do lado do cliente — credenciais gerenciadas](https://vercel.com/docs/vercel-blob/client-upload)

A penalidade por prazo usa o prazo como data local sem horário informado: a atividade vence no fim daquele dia, isto é, 12 horas após o `dueDate` armazenado ao meio-dia. Firestore Security Rules suportam o operador aditivo para valores `timestamp`/`duration`, permitindo verificar o prazo no servidor com `request.time` em vez de confiar no relógio do navegador.

- [Firebase Security Rules — operadores e tipos](https://firebase.google.com/docs/rules/rules-language)
- [Firebase Security Rules — tipo Timestamp](https://firebase.google.com/docs/reference/rules/rules.Timestamp)
- [Firebase Security Rules — tipo Duration](https://firebase.google.com/docs/reference/rules/rules.Duration)
