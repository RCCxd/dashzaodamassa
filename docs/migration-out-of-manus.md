# Migração do Dashboard do 2B — Firebase Spark + Vercel Hobby

## Decisão e estado

A escolha vigente é **Vercel Hobby para o site estático + Firebase Spark para Authentication e Firestore**. O objetivo é evitar cobranças, cartão e upgrades. O código deste workspace já foi convertido para autenticação Firebase e acesso direto ao Firestore, mas nenhum projeto Firebase foi criado/conectado neste trabalho e nenhuma conta/coleção remota foi alterada. É necessário configurar o projeto Firebase e publicar uma branch Preview antes que o cadastro funcione para os alunos.

A versão Vercel atualmente visível ainda é a anterior: seus assets JS/CSS/manifest retornam 404 e o cadastro recebia HTML de erro do `/api` legado, que o client tentava interpretar como JSON. A correção remove a Function `/api`, gera os assets Vite em `dist/` e faz cadastro/login diretamente pelo Firebase SDK. Não é um problema resolvido por `DATABASE_URL`.

## Plano sem cobrança automática

A página oficial informa que o Firebase Spark é sem custo e não exige método de pagamento. Na consulta de 04/10/2026, as cotas publicadas para Firestore Standard eram **1 GiB armazenado, 10 GiB/mês de saída, 20 mil writes/dia, 50 mil reads/dia e 20 mil deletes/dia**; Authentication (exceto Phone Auth/SMS) está incluído. O site é estático em Vercel Hobby. Essas cotas/termos podem mudar; não migrar para Blaze, não habilitar billing e não adicionar método de pagamento. Ao atingir limites, operações podem ser limitadas.

O Firebase Firestore exige escolher uma localização ao criar o banco, e a documentação informa que essa localização não pode ser alterada depois. Veja as regiões e confirme elegibilidade/custo na página de preços antes de provisionar. Para alunos no Brasil, `southamerica-east1` é São Paulo, mas não confirme a seleção até a tela do plano Spark mostrar claramente que permanece gratuita.

## Arquitetura atual

- **Vercel:** Vite gera `dist/`; CDN serve HTML, JS, CSS, manifesto e service worker. `vercel.json` define Framework Vite, build e rewrites das rotas SPA.
- **Auth:** Firebase Authentication por e-mail/senha. Cadastro de alunos é aberto; redefinição de senha usa fluxo Firebase por e-mail.
- **Dados:** SDK web grava/lê Firestore; não existe `/api` próprio no deploy.
- **Segurança:** `firestore.rules` nega por padrão; documentos pessoais ficam sob `users/{uid}` e catálogo global só pode ser editado pelo UID administrador fixo.
- **Migração legado:** um script local lê a origem MySQL somente-leitura e, mediante `--apply`, grava dados no Firestore via service account local. Service account nunca vai à Vercel nem ao GitHub.

No modelo sem servidor do Spark, o antigo código bootstrap de senha única é substituído por um UID admin fixado nas Security Rules. Quando a origem for importada, o script exige que a conta existente `role=admin` seja criada no Firebase Auth com o mesmo e-mail e que seu UID coincida com a allowlist; isso preserva a autoridade do registro administrativo legado sem expor um segredo bootstrap ao browser.

## 1. Criar e preparar o projeto Firebase

1. No [Firebase Console](https://console.firebase.google.com/), crie um projeto no plano **Spark/no-cost**. Se o fluxo solicitar cartão, pagamento ou mudança para Blaze, pare.
2. Em **Authentication → Sign-in method**, habilite **Email/Password**. Não habilite Phone Auth/SMS.
3. Em **Firestore Database**, crie o banco no modo Native e escolha com cuidado a localização elegível ao nível gratuito.
4. Em **Project settings → General**, registre uma **Web App** e copie `apiKey`, `authDomain`, `projectId`, `appId` e `messagingSenderId`.
5. Crie manualmente, no Authentication, o usuário administrador com e-mail próprio. Copie o UID que o Firebase atribuir.
6. Abra `firestore.rules`, substitua `REPLACE_WITH_ADMIN_UID` pelo UID copiado, e publique o conteúdo em **Firestore → Rules → Publish**. Publique as regras antes de permitir cadastros. Regras incompletas ou não publicadas fazem o perfil falhar ao criar.
7. Em **Authentication → Settings → Authorized domains**, inclua o hostname exato do projeto (por exemplo, `seu-projeto.vercel.app`), sem protocolo nem curinga. Para autenticar um Preview, adicione também o hostname exato gerado para esse Preview.

A conta admin recebe privilégios porque o UID é comparado dentro das regras Firestore — não basta alterar o papel visual no navegador. O mesmo UID também deve estar em `VITE_FIREBASE_ADMIN_UID` para que a interface mostre os controles administrativos.

## 2. Configurar Vercel e enviar uma Preview

Para um projeto novo, importe o repositório GitHub pela Vercel. Confirme Root Directory = raiz do repositório, Framework Preset = Vite e Output Directory = `dist`; evite overrides antigos de Express ou `public/`. Para testar alterações de um projeto já publicado sem substituir a produção, envie-as numa branch diferente de `main` para gerar um Preview.

Adicione estas variáveis nos ambientes **Preview** e **Production** da Vercel:

| Variável | De onde vem | Observação |
| --- | --- | --- |
| `VITE_FIREBASE_API_KEY` | Configuração da Web App Firebase | Valor público de app web |
| `VITE_FIREBASE_AUTH_DOMAIN` | Configuração da Web App | Normalmente `seu-projeto.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Configuração da Web App | ID do projeto |
| `VITE_FIREBASE_APP_ID` | Configuração da Web App | ID da aplicação web |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Configuração da Web App | Copie o valor do console |
| `VITE_FIREBASE_ADMIN_UID` | Firebase Auth → usuário admin | O mesmo UID das regras Firestore |

Essas chaves de configuração do Firebase Web são públicas por desenho; não são credenciais de Admin. **Não configure** `DATABASE_URL`, `DATABASE_TLS`, `ADMIN_BOOTSTRAP_CODE` ou uma service account na Vercel. A publicação do código ocorre pelo GitHub/Vercel; não é necessário fazer deploy de backend ou Functions.

Depois do Preview, valide:

- `/`, `/login`, `/activities`, `/subjects`, `/focus`, `/achievements`, `/planner` e `/settings` abrem diretamente;
- CSS/JS em `/assets/*` retornam 200 com MIME correto e `/manifest.webmanifest` existe;
- sem variáveis Firebase, aparece uma mensagem explícita de configuração, não uma página branca;
- signup cria usuário Authentication e perfil Firestore como `student`;
- login, logout e “Esqueci minha senha” funcionam;
- a conta admin vê controles de edição; conta de aluno não consegue editar matérias/atividades;
- com duas contas de aluno, notas, metas, conclusões e sessões permanecem separadas por UID.

A API anterior foi removida de propósito; não há endpoint `/api/health` nem chamadas tRPC no fluxo de cadastro.

## 3. Importação opcional do banco MySQL anterior

O importador precisa dos dados de origem e de uma service account Firebase com acesso ao Firestore/Auth. Como essas credenciais não estão disponíveis no workspace, a importação ainda não foi executada.

### Limite importante: as senhas não são migráveis

As senhas antigas usam um hash scrypt próprio e sessões persistentes MySQL. Isso não é compatível com Firebase Auth. Não copiamos hashes, cookies, sessões nem rate-limit buckets. Para associar dados antigos a uma conta, primeiro crie/registre no Firebase Auth uma conta com o mesmo e-mail do usuário legado. Depois da migração, o usuário define senha nova pela opção “Esqueci minha senha”. O admin também precisa existir no Firebase Auth e seu UID deve coincidir com `FIREBASE_ADMIN_UID`.

### Executar com segurança

1. Baixe uma service account do projeto Firebase somente para este procedimento e guarde o JSON **fora do repositório**. Não a envie pelo chat, não a coloque em `.env.local` como conteúdo JSON e não a envie à Vercel.
2. No computador autorizado a acessar o banco legado, defina no ambiente local `LEGACY_DATABASE_URL`, `FIREBASE_SERVICE_ACCOUNT_PATH` (caminho absoluto do JSON) e `FIREBASE_ADMIN_UID`. Se a origem exigir TLS, defina `LEGACY_DATABASE_TLS=true`.
3. Instale dependências e execute o dry-run, que apenas lê e mostra contagens, sem gravar:

   ```bash
   pnpm install --frozen-lockfile
   pnpm migrate:firestore:dry-run
   ```

4. Confira o projeto Firebase, mapeamento de contas e totais do dry-run. Para importar, rode explicitamente:

   ```bash
   pnpm migrate:firestore:apply
   ```

O importador preserva IDs de matérias/atividades, migra perfis, conclusões, sessões, notas e metas, lê a origem em snapshot consistente somente-leitura e não apaga nem atualiza tabelas MySQL. Sem `--apply`, não grava nada. Se o destino já tiver dados, cancela por padrão; `--overwrite` não apaga documentos, mas permite merge/upsert e só deve ser usado após backup e revisão manual. A conta admin mapeada precisa ter o UID igual a `FIREBASE_ADMIN_UID`.

## Custos, dados e rollback

O uso de Auth + Firestore cabe nas cotas Spark para um grupo pequeno se o volume permanecer baixo, mas a cota não é uma garantia de operação ilimitada. Evite listeners realtime desnecessários e monitore leituras/escritas. O site usa domínio `*.vercel.app` gratuito; não comprar domínio.

O número de 30 alunos, por si só, não gera cobrança no Spark; o consumo depende de quantos documentos cada tela consulta e de quantas alterações são gravadas. Este app lê listas e sessões salvas, portanto não é possível garantir que ficará sob 50 mil leituras/dia sem observar o uso real. Confira o painel de consumo após começar e evite polling/listeners desnecessários; o plano Spark pode limitar o serviço ao atingir cotas, sem virar uma cobrança automática.

A origem MySQL/Manus permanece intacta até revisão final. Depois que alunos começarem a gravar no Firestore, esses dados não sincronizam de volta automaticamente para MySQL. Antes de cortar a versão anterior, exporte/guarde backup e comunique aos usuários a redefinição de senha.

## Validação local

Em 04/10/2026 passaram `pnpm check`, `pnpm check:vercel`, `pnpm test` (7 testes), `pnpm test:rules` (11 verificações no Emulator) e `pnpm build:vercel`. O JS principal tem 1,6 MB minificado (432 KB gzip), gerando aviso não bloqueante de code chunk >500 KB. `pnpm test:rules` usa o ID `demo-dashboard2b`, UID admin fictício e não se conecta a projeto real. Auth, regras publicadas, quotas, domínio e deploy remoto ainda dependem da configuração Firebase do proprietário; nenhuma alteração remota foi feita neste workspace.

## Fontes oficiais

- [Firebase Pricing — Spark e cotas](https://firebase.google.com/pricing)
- [Firebase Auth — e-mail/senha](https://firebase.google.com/docs/auth/web/password-auth)
- [Firebase — configuração de app Web](https://firebase.google.com/docs/web/setup)
- [Firestore Security Rules — condições e request.auth.uid](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [Firestore — localizações e imutabilidade da região](https://firebase.google.com/docs/firestore/locations)
- [Vercel — Vite](https://vercel.com/docs/frameworks/frontend/vite)
- [Vercel — ambientes pela CLI](https://vercel.com/docs/cli/env)
