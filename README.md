# Dashboard do 2B

Aplicativo escolar responsivo para matérias, atividades, Pomodoro, conquistas, metas semanais e notas pessoais. A arquitetura agora é **SPA Vite + Firebase Authentication + Cloud Firestore**, hospedada estaticamente na Vercel. O login e os dados do app não dependem do Manus, Express, tRPC, MySQL ou TiDB.

> O objetivo é ficar no plano Firebase Spark (sem método de pagamento) e Vercel Hobby. As cotas e os termos podem mudar; não habilite Blaze/billing, cartão, upgrade ou domínio pago. Ao atingir a cota Spark, o Firebase pode limitar operações em vez de cobrar automaticamente.

## Stack e segurança

- React + TypeScript + Vite + Tailwind; build estático em `dist/`, servido pela CDN da Vercel.
- Firebase Authentication com e-mail/senha e recuperação de senha.
- Cloud Firestore acessado pelo SDK web; **Firestore Security Rules** isolam dados pessoais por UID.
- Admin definido por UID permitido nas regras Firestore, não por um papel enviado pelo navegador.
- Cadastro de alunos aberto; novas contas recebem papel `student`.
- Tema escuro permanente; PWA, service worker e tela offline.
- Não há backend genérico, Cloud Functions, App Hosting, Phone Auth/SMS ou Firebase Storage; existe somente a Function Vercel `/api/blob` para anexos PDF privados.

## Configuração Firebase (necessária antes de cadastrar)

1. Crie um projeto Firebase no plano **Spark** e habilite Authentication → Sign-in method → **Email/Password**.
2. Crie o banco Cloud Firestore. Escolha cuidadosamente a localização: depois de provisionado, ela não pode ser alterada. Confira a elegibilidade/cotas gratuitas antes de confirmar.
3. Registre uma Web App e copie as credenciais públicas do Firebase. Configure no ambiente local (`.env.local`) e em Vercel (Preview e Production):

   ```dotenv
   VITE_FIREBASE_API_KEY=
   VITE_FIREBASE_AUTH_DOMAIN=
   VITE_FIREBASE_PROJECT_ID=
   VITE_FIREBASE_APP_ID=
   VITE_FIREBASE_MESSAGING_SENDER_ID=
   VITE_FIREBASE_ADMIN_UID=
   ```

   Esses valores de configuração web são públicos; o controle de acesso é feito pelas regras Firestore. **Nunca** coloque uma chave de service account nessas variáveis ou na Vercel.
4. Crie manualmente a conta administrativa em Firebase Console → Authentication → Users e copie o UID. Substitua `REPLACE_WITH_ADMIN_UID` em `firestore.rules` pelo UID, preencha `VITE_FIREBASE_ADMIN_UID` e publique as regras pelo Console em Firestore → Rules. O conjunto de regras nega acesso por padrão, deixa o catálogo visível a usuários autenticados, reserva sua edição ao UID admin e limita registros pessoais ao dono.
5. Em Authentication → Settings, autorize o hostname exato da implantação (por exemplo, `seu-projeto.vercel.app`), sem `https://` e sem curinga. Para testar Auth em Preview, adicione também o hostname exato do Preview.
6. Configure as seis variáveis na Vercel para **Preview** e **Production**. Sem as credenciais, a aplicação mostra uma tela de configuração em vez de ficar branca.

## Desenvolvimento

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
# Preencha as variáveis VITE_FIREBASE_* no .env.local
pnpm dev
```

`pnpm build:vercel` verifica os tipos usados pelo site e gera a saída estática em `dist/`. `pnpm start` abre uma prévia local desse build. Não é necessário definir `DATABASE_URL` para executar o site.

## Publicar pela integração GitHub → Vercel

Para um projeto novo, importe o repositório GitHub pela Vercel e confirme: Root Directory = raiz do repositório, Framework Preset = Vite, Build Command = `pnpm build:vercel`, Output Directory = `dist`. `vercel.json` já define esses valores e os rewrites das rotas SPA. Para um projeto já publicado, envie mudanças de teste em uma **branch diferente de `main`** para gerar Preview antes de mesclar em produção.

Após o Preview, valide `/`, `/login`, `/activities`, `/subjects`, `/focus`, `/manifest.webmanifest` e os assets `/assets/*`. `/api/blob` sem login deve responder JSON `401` — não há endpoint `/api/health`, pois não existe backend genérico.

## Anexos PDF

Os PDFs usam Vercel Blob em modo **Private**, com limite de 10 MiB e download por uma Function autenticada com Firebase Auth. Conecte uma store privada aos ambientes Preview e Production e faça Redeploy para habilitar as credenciais OIDC gerenciadas; não copie tokens para `VITE_*`. O passo a passo e o diagnóstico de credenciais estão em [DEPLOY-FIREBASE-VERCEL.md](DEPLOY-FIREBASE-VERCEL.md).

## Importar dados do MySQL antigo (opcional)

O importador de dados é uma operação **local e separada do deploy**. Ele é dry-run por padrão, lê a origem MySQL em snapshot somente-leitura e nunca apaga a origem.

1. Crie no Firebase Authentication contas com os mesmos e-mails dos usuários legados que precisam ter dados importados; confira também o UID do admin.
2. Baixe uma service account do projeto Firebase somente para executar a importação local. Guarde o JSON fora do repositório e nunca o envie à Vercel ou pelo chat.
3. No ambiente local, defina `LEGACY_DATABASE_URL`, `FIREBASE_SERVICE_ACCOUNT_PATH` e `FIREBASE_ADMIN_UID`. Se o MySQL exigir TLS, defina `LEGACY_DATABASE_TLS=true`.
4. Execute primeiro o dry-run; só aplique depois de revisar os totais e confirmar o projeto de destino:

   ```bash
   pnpm migrate:firestore:dry-run
   pnpm migrate:firestore:apply
   ```

   A aplicação preserva IDs das matérias e atividades e transfere conclusões, sessões, notas, metas e perfis. Contas/senhas/sessões antigas não são importadas: o hash scrypt legado não é compatível com Firebase Auth. Usuários existentes devem entrar com o mesmo e-mail e usar **Esqueci minha senha** para definir uma nova senha. `--overwrite` só deve ser usado após conferir os dados já existentes no destino.

## Verificação local

```bash
pnpm check
pnpm check:vercel
pnpm test
pnpm test:rules
pnpm build:vercel
```

## Referências do projeto

- [Guia de migração e limites gratuitos](docs/migration-out-of-manus.md)
- [Aplicar a migração no GitHub/Vercel](DEPLOY-FIREBASE-VERCEL.md)
- [Requisitos](docs/requirements.md)
- [Arquitetura](docs/design.md)
- [Estrutura Firestore](docs/sql-schema.md)
- [Tarefas pendentes](docs/tasks.md) e [TODO](TODO.md)
