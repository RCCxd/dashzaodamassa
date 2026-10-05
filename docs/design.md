# Design — Dashboard do 2B

## Arquitetura

O frontend React/Vite é compilado para `dist/` e servido como conteúdo estático pela Vercel Hobby. A única Vercel Function é `api/blob.ts`, limitada à autorização de PDFs privados no Vercel Blob. O browser usa Firebase Authentication e o SDK Web para Firestore; as Security Rules controlam os dados. Nenhuma API genérica de domínio ou Express é usada.

```text
Navegador
├── Vercel Hobby: dist/index.html, assets JS/CSS, manifest e PWA
├── /api/blob: verificação Firebase JWT + upload/download/delete de PDFs privados
├── Vercel Blob (private): bytes de PDFs; OIDC gerenciado ao conectar store
└── Firebase Web SDK
    ├── Firebase Authentication: e-mail/senha + recuperação
    └── Cloud Firestore (Spark)
        ├── subjects/{subjectId}                catálogo comum
        ├── activities/{activityId}              catálogo comum
        └── users/{uid}                          perfil próprio
            ├── activityCompletions/{activityId}
            ├── studySessions/{sessionId}
            ├── planner/quickNote
            ├── weeklyGoals/{weekStart}
            ├── preferences/visual
            ├── ranking/state + ranking/settings
            └── rankedActivities/{activityId}
        ├── subjectSchedule/{slotId}              blocos semanais comuns
        └── leaderboard/{uid}                     apelido + RP apenas com opt-in
```

`vercel.json` define Vite, saída `dist/` e rewrites para páginas SPA. O cadastro e o CRUD continuam no Firebase SDK; somente anexos usam `/api/blob`, que não deve ser capturado pelo rewrite SPA. A Function valida JWT Firebase, limita upload a PDF de 10 MB, restringe token de upload/exclusão ao admin, e transmite downloads privados apenas após conferir o caminho no documento Firestore da atividade.

## Autenticação e autorização

- Firebase Auth controla credenciais, recuperação de senha e UID; senha nunca é lida nem armazenada pelo código do Dashboard.
- Cadastro público cria somente o próprio documento `users/{auth.uid}` com papel `student`.
- O administrador é identificado por um UID fixo configurado em `firestore.rules` e `VITE_FIREBASE_ADMIN_UID`. Editar `subjects` e `activities` exige `request.auth.uid` igual ao UID admin dentro das regras do servidor Firestore.
- Cada usuário só lê/escreve seus próprios registros em `users/{uid}/...`; sessões de estudo não podem ser atualizadas/deletadas pelo cliente depois de registradas.
- `leaderboard/{uid}` contém somente apelido, RP e atualização e é publicado/removido junto ao consentimento explícito em transação; os campos privados da conta não são copiados.
- RP é vinculado a uma conclusão única por atividade e a um ledger imutável. Registros do Modo Foco nunca são fonte de RP.
- Dados globais de matérias/atividades são legíveis somente por usuário autenticado e graváveis apenas pelo admin.
- Regra final `/{document=**}` nega o que não foi permitido explicitamente. Revisar/publicar as regras antes de abrir o cadastro.
- A chave da Firebase Web App é pública por desenho. A service account do Admin SDK é um segredo local de migração e nunca entra no frontend, Vercel ou Git.

## Modelo Firestore

| Caminho | Conteúdo | Autorização |
| --- | --- | --- |
| `users/{uid}` | UID, nome, e-mail e papel (`student` ou `admin`) | Próprio UID; admin UID pode criar/administer seu perfil |
| `subjects/{id}` | Nome, cor, professor, horário e descrição | Leitura autenticada; CRUD admin |
| `activities/{id}` | Matéria, título, tipo, prioridade, status, prazo, link, estimativa e caminho/nome/tamanho de anexo | Leitura autenticada; CRUD admin; os bytes ficam privados no Blob |
| `users/{uid}/activityCompletions/{activityId}` | Timestamp da conclusão individual | Próprio UID; alternar é excluir/recriar |
| `users/{uid}/studySessions/{id}` | Duração, associação e modalidade Pomodoro/livre | Próprio UID; create/read, sem edição/exclusão |
| `users/{uid}/planner/quickNote` | Nota rápida individual | Próprio UID |
| `users/{uid}/weeklyGoals/{weekStart}` | Meta de minutos/sessões da semana | Próprio UID |
| `users/{uid}/preferences/visual` | Destaque, superfície escura, textura e densidade | Próprio UID |
| `users/{uid}/ranking/state` | RP e quantidade de atividades pontuadas | Próprio UID; atualizada pela transação de conclusão |
| `users/{uid}/ranking/settings` | Apelido e consentimento de exibição | Próprio UID |
| `users/{uid}/rankedActivities/{activityId}` | Pontos concedidos uma única vez por atividade | Próprio UID; ledger imutável |
| `subjectSchedule/{slotId}` | Dia útil, início/fim, sala e matéria | Leitura autenticada; CRUD admin |
| `leaderboard/{uid}` | Apelido público, RP total e data de atualização | Leitura para alunos autenticados; gravação apenas coerente com o opt-in validado pelas Rules |

Conquistas são calculadas client-side a partir do catálogo fixo e dos registros do usuário. O cliente não pode gravar um badge de conquista arbitrário. `drizzle/schema.ts` e a base SQL antiga são apenas fontes do importador de dados legado, não dependências do build/deploy atual.

## Experiência

O movimento visual é de caderno editorial independente: tinta grafite escura permanente, Fraunces em títulos, DM Sans na leitura e DM Mono em datas/RP. Verde marca-texto `#B7E36A` é o destaque de marca inicial; quatro acentos e três fundos escuros são preferências pessoais. A composição usa hierarquia, linhas de margem, rótulos de caderno e grade semanal de tabela, não um mural de cartões SaaS repetidos. Texto e matéria permanecem visíveis sem hover; foco do teclado e controle por toque são explícitos. Desktop usa navegação lateral; celular, navegação inferior rolável. A PWA mantém manifesto, service worker e tela offline mínima.

Se Firebase Web config estiver ausente, a aplicação mostra uma tela de configuração explícita, nunca um `#root` vazio. Se a conexão de rede ou as regras Firestore falharem, a UI exibe erro/toast correspondente.

## Operação e custo

Os arquivos HTML/JS/CSS são estáticos. `/api/blob` é uma Function pequena de arquivos; os bytes PDF ficam em Blob privado (não Firebase Storage). Dentro das cotas oficiais do Vercel Hobby não há cobrança automática por excedente; o recurso pode ser suspenso ao atingir limites. Firebase Auth/Firestore permanecem Spark, sem Blaze, cartão, service account ou Cloud Functions. As cotas/termos podem mudar: pare se a Console pedir upgrade ou billing.
