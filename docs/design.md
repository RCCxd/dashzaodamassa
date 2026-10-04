# Design — Dashboard do 2B

## Arquitetura

O frontend React/Vite é compilado para `dist/` e servido como conteúdo estático pela CDN da Vercel. Não há Function/API própria no runtime. O browser usa Firebase Authentication para a sessão e o SDK web modular para ler/gravar no Cloud Firestore. As permissões reais são impostas no Firestore Security Rules; verificações de papel no React servem somente à interface.

```text
Navegador
├── Vercel CDN: dist/index.html, assets JS/CSS, manifest e PWA
└── Firebase Web SDK
    ├── Firebase Authentication: e-mail/senha + recuperação
    └── Cloud Firestore (Spark)
        ├── subjects/{subjectId}                catálogo comum
        ├── activities/{activityId}              catálogo comum
        └── users/{uid}                          perfil próprio
            ├── activityCompletions/{activityId}
            ├── studySessions/{sessionId}
            ├── planner/quickNote
            └── weeklyGoals/{weekStart}
```

`vercel.json` define o preset Vite, saída `dist/` e rewrites para as páginas SPA. O fluxo de cadastro não chama `/api/*`; o erro antigo de JSON era resposta HTML 404 do backend que não existia. O app agora realiza autenticação e dados pelo Firebase.

## Autenticação e autorização

- Firebase Auth controla credenciais, recuperação de senha e UID; senha nunca é lida nem armazenada pelo código do Dashboard.
- Cadastro público cria somente o próprio documento `users/{auth.uid}` com papel `student`.
- O administrador é identificado por um UID fixo configurado em `firestore.rules` e `VITE_FIREBASE_ADMIN_UID`. Editar `subjects` e `activities` exige `request.auth.uid` igual ao UID admin dentro das regras do servidor Firestore.
- Cada usuário só lê/escreve seus próprios registros em `users/{uid}/...`; sessões de estudo não podem ser atualizadas/deletadas pelo cliente depois de registradas.
- Dados globais de matérias/atividades são legíveis somente por usuário autenticado e graváveis apenas pelo admin.
- Regra final `/{document=**}` nega o que não foi permitido explicitamente. Revisar/publicar as regras antes de abrir o cadastro.
- A chave da Firebase Web App é pública por desenho. A service account do Admin SDK é um segredo local de migração e nunca entra no frontend, Vercel ou Git.

## Modelo Firestore

| Caminho | Conteúdo | Autorização |
| --- | --- | --- |
| `users/{uid}` | UID, nome, e-mail e papel (`student` ou `admin`) | Próprio UID; admin UID pode criar/administer seu perfil |
| `subjects/{id}` | Nome, cor, professor, horário e descrição | Leitura autenticada; CRUD admin |
| `activities/{id}` | Matéria, título, tipo, prioridade, status, prazo, link e estimativa | Leitura autenticada; CRUD admin |
| `users/{uid}/activityCompletions/{activityId}` | Timestamp da conclusão individual | Próprio UID; alternar é excluir/recriar |
| `users/{uid}/studySessions/{id}` | Duração, associação e modalidade Pomodoro/livre | Próprio UID; create/read, sem edição/exclusão |
| `users/{uid}/planner/quickNote` | Nota rápida individual | Próprio UID |
| `users/{uid}/weeklyGoals/{weekStart}` | Meta de minutos/sessões da semana | Próprio UID |

Conquistas são calculadas client-side a partir do catálogo fixo e dos registros do usuário. O cliente não pode gravar um badge de conquista arbitrário. `drizzle/schema.ts` e a base SQL antiga são apenas fontes do importador de dados legado, não dependências do build/deploy atual.

## Experiência

**Academic Command Center** usa base escura permanente (`#10111a`, superfícies `#181a25`), Índigo 2B (`#5B6CFF`), verde-menta para progresso, Plus Jakarta Sans e DM Mono para métricas. Desktop usa sidebar; celular usa barra inferior. Estados de carregamento, vazio, erro, sucesso e confirmação estão presentes. A PWA possui manifesto, ícones, service worker e tela offline mínima.

Se Firebase Web config estiver ausente, a aplicação mostra uma tela de configuração explícita, nunca um `#root` vazio. Se a conexão de rede ou as regras Firestore falharem, a UI exibe erro/toast correspondente.

## Operação e custo

O deploy Vercel é somente estático; não há servidor, DB connection pool, MySQL, TiDB, Cloud Functions, Cloud Run, Phone Auth/SMS, App Hosting ou Firebase Storage. O plano Spark declara sem método de pagamento obrigatório, mas possui cotas gratuitas. As condições podem mudar; o operador deve permanecer no Spark e parar se o console solicitar faturamento.
