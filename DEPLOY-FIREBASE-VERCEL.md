# Guia do zero: Dashboard do 2B no GitHub, Vercel e Firebase

Este procedimento publica a versão independente do Dashboard do 2B: **SPA Vite estática na Vercel + uma Function restrita a anexos PDF privados + Firebase Authentication/Cloud Firestore**. O código não usa Manus, MySQL/TiDB, Express, tRPC ou Cloud Functions; as operações normais dos alunos continuam no Firebase SDK.

> **Estado atual:** o código, as regras e a API de anexos foram preparados e testados localmente. Ainda é necessário configurar Firebase/Vercel, publicar as regras e conectar um Blob privado ao projeto Vercel Hobby para os PDFs. Nenhum recurso externo foi criado, publicado ou alterado por este workspace.

## O que você vai precisar

- Uma conta Google para o [Firebase Console](https://console.firebase.google.com/).
- Uma conta GitHub e uma conta Vercel.
- O ZIP atualizado do projeto entregue nesta conversa, ou o conteúdo atual do repositório.
- **Não precisa de cartão nem upgrade para escolher Firebase Spark.** A Vercel Blob também tem cotas incluídas no Hobby para uso pessoal/não comercial. Os limites e termos podem mudar; se alguma tela pedir pagamento, cartão, Pro, Blaze ou billing, pare e não confirme.

## Parte 1 — Preparar o código no GitHub

1. Baixe e extraia o ZIP do projeto em uma pasta no seu computador.
2. Confira que a pasta extraída contém diretamente arquivos como `package.json`, `pnpm-lock.yaml`, `vercel.json`, `firestore.rules` e as pastas `client/`, `api/` e `scripts/`. **Não envie apenas a pasta externa que contém tudo; os arquivos precisam ficar na raiz do repositório.**
3. Crie um repositório novo no GitHub. Recomendo **Private**. Deixe-o vazio: não inicialize com README, `.gitignore` ou licença, pois esses arquivos já estão no projeto.
4. Envie o conteúdo extraído para a raiz do repositório. Uma forma é usar GitHub Desktop; outra é abrir um terminal na pasta extraída e executar, trocando a URL pelo endereço do seu repositório:

   ```bash
   git init -b main
   git add .
   git commit -m "Adicionar Dashboard do 2B"
   git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
   git push -u origin main
   ```

   Se você já tem um repositório, não execute `git init` nem substitua a pasta `.git`; copie os arquivos do projeto para a raiz do clone e faça commit. **Nunca envie `.env`, `.env.local`, credenciais de service account, `node_modules/` ou `dist/`.**

## Parte 2 — Criar o Firebase gratuito

1. Abra o [Firebase Console](https://console.firebase.google.com/) e crie um projeto novo. Escolha explicitamente o plano **Spark / no-cost**. Analytics é opcional e pode ser ignorado.
2. **Não associe uma conta de faturamento, não adicione cartão e não mude para Blaze.** Este app não precisa de Firebase App Hosting, Cloud Functions, Phone Auth/SMS nem Firebase Cloud Storage; PDFs usam Vercel Blob privado.
3. Abra **Authentication → Sign-in method** e habilite **Email/Password**. Não habilite Phone Auth.
4. Abra **Firestore Database → Create database** e escolha **Production mode**. Selecione a edição Standard quando perguntado. Para alunos no Brasil, uma opção próxima é **South America (`southamerica-east1`, São Paulo)**.
   - A localização do Firestore é permanente e **não pode ser alterada depois**. Confira o nome da região antes de confirmar.
   - Não escolha regras abertas/test mode. Na etapa seguinte você publicará as regras restritivas deste projeto.
5. Em **Project settings → General → Your apps**, adicione um app Web (`</>`). Dê um nome como `Dashboard do 2B` e registre-o. Copie os campos de configuração apresentados: `apiKey`, `authDomain`, `projectId`, `appId` e `messagingSenderId`. São valores de configuração da aplicação web; não são a chave de administrador.

### Criar a conta administradora e publicar as regras

6. Em **Authentication → Users**, use **Add user** para criar a conta administradora com o e-mail que você usará para entrar. Guarde a senha em um local seguro e copie o **UID** dessa conta. A conta de administrador deve ser criada pelo Console antes de publicar as regras.
7. No código do projeto, abra `firestore.rules` e troque a ocorrência `REPLACE_WITH_ADMIN_UID` pelo UID real, mantendo aspas duplas. Exemplo: `request.auth.uid == "AbC123..."`.
8. No Firebase Console, abra **Firestore Database → Rules**, cole o arquivo `firestore.rules` já atualizado e clique **Publish**. Isso é indispensável: as regras deixam o catálogo editável apenas pelo UID administrador e mantêm notas, metas, conclusões e sessões privadas para cada usuário.
   - Não substitua as regras por `allow read, write: if true`.
   - Não basta ajustar o papel no navegador: a autorização real é conferida pelas Security Rules.
9. Para o Firebase Auth reconhecer o site, depois que a Vercel criar o endereço, abra **Authentication → Settings → Authorized domains**. Adicione o hostname exato do site, por exemplo `dashboard-do-2b.vercel.app`, sem `https://`, sem caminho e sem curinga. Adicione também o hostname exato de qualquer Preview que você vá testar.

## Parte 3 — Criar o projeto Vercel ligado ao GitHub

1. Entre na [Vercel](https://vercel.com/) e selecione **Add New → Project**.
2. Conecte o GitHub, autorize o acesso ao repositório novo e escolha o repositório do Dashboard.
3. Na tela de configuração do projeto, confirme:

   | Campo | Valor |
   | --- | --- |
   | Framework Preset | `Vite` |
   | Root Directory | raiz do repositório (`./`) |
   | Build Command | `pnpm build:vercel` |
   | Output Directory | `dist` |
   | Install Command | padrão detectado para `pnpm-lock.yaml` |
   | Node.js | `22.x` (declarado em `package.json`) |

   O arquivo `vercel.json` já define Vite, build, saída `dist` e rewrites para as rotas da SPA. A única Function é `api/blob.ts`, usada para PDFs. **Não selecione Express, não use `public/` como saída, não remova `api/blob.ts` e não recrie uma API genérica de cadastro.** Depois do deploy, `GET /api/blob` sem login deve responder JSON `401`, não HTML da SPA nem 404.
4. Crie o projeto no plano **Hobby**; não escolha Pro. O primeiro deploy pode começar assim que o projeto for criado. Não compartilhe ainda o endereço até completar as variáveis e os testes.
5. No dashboard do projeto Vercel, abra **Settings → Environment Variables** e adicione cada variável abaixo. Selecione pelo menos **Preview** e **Production** para cada uma. A variável `VITE_FIREBASE_ADMIN_UID` deve ser o mesmo UID usado em `firestore.rules`.

   | Nome da variável | Valor a copiar do Firebase |
   | --- | --- |
   | `VITE_FIREBASE_API_KEY` | `apiKey` |
   | `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
   | `VITE_FIREBASE_PROJECT_ID` | `projectId` |
   | `VITE_FIREBASE_APP_ID` | `appId` |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
   | `VITE_FIREBASE_ADMIN_UID` | UID do administrador em Authentication → Users |

   O arquivo `.env.example` lista os mesmos nomes. **As variáveis `VITE_*` são incorporadas no JavaScript público durante o build**, então nunca coloque nelas uma senha, service account ou chave privada. Não configure `DATABASE_URL`, `DATABASE_TLS`, `ADMIN_BOOTSTRAP_CODE` nem JSON de service account na Vercel.
6. Salve as variáveis e faça um novo deploy: abra **Deployments**, selecione o deployment mais recente e use **Redeploy**, ou envie um commit. Alterações nas variáveis de ambiente só valem para novos deployments; mudar as variáveis sem reconstruir não atualiza o site.
7. Copie o hostname gerado pela Vercel, por exemplo `dashboard-do-2b.vercel.app`, e conclua o passo 9 da Parte 2. Se for testar Preview, adicione o hostname específico do Preview também.

### Vercel Blob privado — somente para anexos PDF

1. No projeto Vercel, abra **Storage → Blob** e crie ou conecte uma store ao projeto. Selecione **Private** (não Public), associe o projeto e habilite os ambientes **Preview** e **Production**. Mantenha o plano **Hobby**; não adicione cartão, billing ou Pro.
2. Depois de conectar, a Vercel fornece à Function o ID da store e a credencial OIDC de runtime (`BLOB_STORE_ID` e `VERCEL_OIDC_TOKEN`); não copie nem invente valores, não crie `BLOB_READ_WRITE_TOKEN` manualmente e nunca coloque credenciais em `VITE_*`. **Salve e faça um novo deploy** para que a Function receba essas credenciais.
3. Se aparecer “No blob credentials found”, a store não está conectada a este projeto/ambiente ou o deployment foi criado antes da conexão: confirme Storage → Blob → Project/Environment e faça redeploy. O código atualizado devolve uma orientação em português; isso não é resolvido editando o arquivo do PDF.
4. O código limita cada arquivo a **10 MiB** e `application/pdf`. PDFs não são públicos: somente admin pode enviar/remover; alunos autenticados podem baixar pela Function após conferir que o caminho continua anexado à atividade Firestore. O upload envia os bytes diretamente ao Blob; o download é transmitido em streaming para não bufferizar uma resposta acima do limite de 4,5 MB da Function.
5. Referência consultada em 05/10/2026: Hobby inclui **1 GB de armazenamento médio, 10.000 operações simples, 2.000 avançadas e 10 GB de transferência**. As cotas podem mudar. O Hobby não cobra excedente automaticamente; ao atingir o limite, o acesso ao Blob pode ser suspenso até a renovação. Acompanhe o painel.
6. Se o painel não oferecer Blob privado dentro do Hobby ou solicitar pagamento, pare e deixe anexos desativados; **não** mude de plano, billing ou Blaze para fazê-lo funcionar.

### Sobre produção e Preview

O branch `main` costuma ser o branch de produção: commits nele geram deployment de Production. Os demais branches normalmente geram Previews. Para o primeiro projeto, mantenha o link para você enquanto testa; depois, para testar uma mudança sem substituir a versão principal, envie-a numa branch diferente de `main` e confira o Preview antes de mesclar.

## Parte 4 — Testar antes de mandar o link

1. Abra `https://SEU-PROJETO.vercel.app`. Deve aparecer a página de login/cadastro, não uma tela branca. Se ainda não houver variáveis, o código mostra um aviso de configuração; depois de defini-las, faça Redeploy.
2. Entre com a conta administrativa criada no Firebase Console. O primeiro login cria automaticamente o perfil Firestore associado ao UID autorizado.
3. Confirme que o menu administrativo permite criar matérias e atividades.
4. Abra uma janela anônima ou outro navegador e cadastre uma conta de aluno com e-mail/senha. O aluno deve receber papel `student`, não deve conseguir alterar o catálogo e só deve ver seus próprios registros.
5. Teste entrar/sair, **Esqueci minha senha**, concluir uma atividade, registrar uma sessão Pomodoro (**0 RP**), salvar nota/meta e recarregar; experimente mudar a aparência e confira se persiste.
6. Abra e atualize diretamente `/login`, `/activities`, `/subjects`, `/focus`, `/ranking`, `/achievements`, `/planner` e `/settings`. `/api/blob` sem autenticação deve responder JSON `401`; assets `/assets/*` devem carregar com HTTP 200.
7. Como admin, anexe um PDF menor que 10 MiB e baixe como aluno. Confirme que arquivo não PDF, PDF acima do limite, upload por usuário não admin e download sem login são recusados. Teste aderir e sair do placar com um aluno. Para testar multa, deixe uma atividade pendente vencer e mantenha a tela do aluno aberta até o prazo (ou reabra o site depois); a reconciliação verifica o prazo de 12 horas após a data salva ao meio-dia e registra uma perda única de até 5 RP.
8. Só então envie aos colegas o endereço de produção `https://SEU-PROJETO.vercel.app`. Não é necessário comprar domínio; o subdomínio `vercel.app` serve para compartilhar.

## Parte 5 — (Opcional) importar dados do banco antigo

Se quiser iniciar sem histórico, pule esta parte: o cadastro aberto começará com novos perfis e cada aluno poderá usar o dashboard normalmente.

Se quiser importar matérias, atividades, conclusões, sessões, notas e metas do MySQL anterior:

1. A importação requer acesso local à URL do banco antigo e uma service account do projeto Firebase. **Essas credenciais não estão disponíveis neste workspace neste momento.** Não envie nenhum segredo pelo chat e não suba a service account ao GitHub ou à Vercel.
2. Crie no Firebase Authentication as contas com os mesmos e-mails dos usuários que terão dados migrados. Para o administrador, o UID dessa conta deve coincidir com `VITE_FIREBASE_ADMIN_UID`.
3. Em um computador seguro, instale Node 22 e pnpm 10.18; baixe o JSON de service account apenas para esse procedimento e mantenha-o fora da pasta Git.
4. Defina localmente `LEGACY_DATABASE_URL`, `FIREBASE_SERVICE_ACCOUNT_PATH` (caminho absoluto do JSON) e `FIREBASE_ADMIN_UID`. Se a origem exigir TLS, defina também `LEGACY_DATABASE_TLS=true`.
5. Rode primeiro `pnpm install --frozen-lockfile` e `pnpm migrate:firestore:dry-run`. Confira o projeto Firebase e as contagens. Apenas se tudo estiver correto rode `pnpm migrate:firestore:apply`.
6. O importador lê o MySQL em snapshot somente-leitura e não o apaga. Sem `--apply`, não grava no Firestore. Não use `--overwrite` sem backup e revisão.

**As senhas não são transferidas:** o hash antigo usa scrypt próprio e é incompatível com Firebase Auth. Após criar/importar a conta pelo mesmo e-mail, cada usuário deverá usar **Esqueci minha senha** para definir uma senha nova. Não migre cookies ou sessões antigas.

## Plano gratuito e limites

Na consulta de 4 de outubro de 2026, a página oficial do Firebase lista Spark como **sem custo e sem método de pagamento**; Authentication (exceto SMS/Phone Auth) está incluído. Para Firestore Standard, a página lista cotas gratuitas diárias de 50 mil leituras, 20 mil gravações e 20 mil exclusões, até 1 GiB armazenado e 10 GiB/mês de saída. Vercel Hobby é gratuito para uso pessoal/não comercial. As condições podem mudar; mantenha-se em Spark/Hobby e monitore o consumo. Se atingir os limites, o serviço pode ser limitado até a cota renovar; não habilite faturamento para “resolver” sem decidir conscientemente.

Trinta alunos, por si só, não garantem nem excedem uma cota: o uso depende das leituras/escritas por tela e por pessoa. Não há backend genérico; o placar ranqueado usa um listener Firestore em tempo real, enquanto os demais dados são consultados sob demanda. Confira o painel do Firebase depois de começar a usar.

## Solução rápida de erros

| Erro/sintoma | O que verificar |
| --- | --- |
| Tela de configuração Firebase | As seis variáveis `VITE_FIREBASE_*` estão salvas em Preview/Production? Faça um novo Redeploy. |
| `auth/operation-not-allowed` | Habilite Email/Password em Firebase Authentication → Sign-in method. |
| `auth/unauthorized-domain` | Adicione o hostname exato, como `meu-dashboard.vercel.app`, em Authentication → Settings → Authorized domains. Não use URL completa nem wildcard. |
| `permission-denied` no Firestore | Confira se publicou `firestore.rules` com o UID real, sem o marcador `REPLACE_WITH_ADMIN_UID`; confirme também a variável admin. |
| Assets CSS/JS 404 ou MIME `text/html` | Confirme que a implantação veio do commit com `vercel.json` Vite, build `pnpm build:vercel`, saída `dist`; o preset Express/saída `public` é configuração antiga. |
| `/api/blob` retorna HTML ou 404 | Confira se `api/blob.ts` está na raiz, se Root Directory é `./` e se a integração Vite publicou a Function. Não permita que o rewrite SPA capture `/api/blob`.
| “No blob credentials found” ou erro de credenciais Blob | Em **Storage → Blob**, confirme que a store **Private** está conectada a este projeto e aos ambientes **Preview/Production** que você está usando. Não cadastre `VERCEL_OIDC_TOKEN` manualmente: a Vercel o injeta no runtime. Salve e faça **Redeploy** depois de conectar. Como alternativa, o código aceita `BLOB_READ_WRITE_TOKEN` só no servidor; nunca use um `VITE_*` para esse token. Se continuar falhando, verifique se o deployment usa o projeto/ambiente correto e confira a resposta JSON de `/api/blob`; não faça upgrade nem ative cobrança.
| A multa não aparece exatamente no horário do vencimento | Nesta stack gratuita não há Cloud Function nem Cron. A página do aluno programa a verificação do próximo prazo enquanto estiver aberta e também reconcilia ao entrar/abrir o site. Se ninguém estiver conectado no vencimento, a perda será registrada no próximo acesso; cada atividade continua protegida por um único registro de multa.
| Atividade encerrada pelo administrador | O status editorial “Concluída” encerra aquela atividade para a turma: alunos que ainda não a concluíram não recebem nova conclusão nem multa; o controle aparece desabilitado. Quem já concluiu ainda pode reabri-la e reverter os RP concedidos.
| Upload PDF pede billing/Pro | Pare. Não associe cartão, não habilite billing e não mude o Firebase para Blaze. Anexos exigem Blob privado dentro das cotas Hobby.
| Download PDF retorna 404 | Confira se o pathname no documento corresponde ao anexo atual e se a store Blob privada continua conectada. URL assinada temporária não é pathname permanente.
| O cadastro mostra erro de JSON vindo de `/api` | Confirme que o formulário ainda chama Firebase Auth e que Vercel implantou o commit correto, sem código tRPC legado.
| Ainda aparece a versão antiga | Faça hard refresh; em caso de cache antigo do PWA, limpe os dados do site/service worker e abra novamente. |

## Fontes oficiais

- [Vercel — Vite, saída estática e rewrites SPA](https://vercel.com/docs/frameworks/frontend/vite)
- [Vercel — conectar repositório Git e deployments por branch](https://vercel.com/docs/git)
- [Vercel — variáveis por ambiente e novo deployment após alteração](https://vercel.com/docs/environment-variables)
- [Vercel Hobby — preço e escopo de uso](https://vercel.com/docs/plans/hobby)
- [Vercel Blob — preços e cotas](https://vercel.com/docs/vercel-blob/usage-and-pricing)
- [Vercel Blob — armazenamento privado](https://vercel.com/docs/vercel-blob/private-storage)
- [Vercel Blob — SDK e credenciais OIDC](https://vercel.com/docs/vercel-blob/using-blob-sdk)
- [Vercel Blob — autorização de client uploads](https://vercel.com/docs/vercel-blob/client-upload)
- [Vercel Functions — streaming de respostas](https://vercel.com/docs/functions/streaming)
- [Firebase — criar projeto e registrar app Web](https://firebase.google.com/docs/web/setup)
- [Firebase Auth — e-mail e senha](https://firebase.google.com/docs/auth/web/password-auth)
- [Firebase — publicar Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase — Spark e cotas](https://firebase.google.com/pricing)
- [Firestore — regiões; localização não pode ser alterada](https://firebase.google.com/docs/firestore/locations)
