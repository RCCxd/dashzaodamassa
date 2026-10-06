# Modelo de dados — Cloud Firestore

O runtime usa Cloud Firestore, não SQL. As regras completas estão em `firestore.rules`. `drizzle/schema.ts` e as tabelas MySQL continuam somente como formato de leitura da origem durante a importação; nenhuma migration SQL é executada no deploy Vercel.

## Coleções e documentos

| Caminho | Campos principais | Observações |
| --- | --- | --- |
| `users/{uid}` | `uid`, `name`, `email`, `role`, timestamps | UID é igual ao Firebase Auth UID; `role` é `student` ou `admin` |
| `subjects/{id}` | `name`, `color`, `teacher`, `schedule`, `description`, `archived`, `archivedAt?`, timestamps | Catálogo comum; CRUD de criação/edição e arquivamento somente admin; sem delete físico |
| `activities/{id}` | `subjectId`, `title`, `description`, `type`, `priority`, `status`, `dueDate`, `resourceUrl`, `estimatedMinutes`, `attachmentPath?`, `attachmentName?`, `attachmentSize?`, `archived`, `archivedAt?`, timestamps | `subjectId` referencia `subjects/{id}`; tarefas arquivadas preservam conclusões/RP e o PDF privado |
| `users/{uid}/activityCompletions/{activityId}` | `activityId`, `completedAt` | Um documento por atividade e aluno; desmarcar apaga o documento |
| `users/{uid}/studySessions/{sessionId}` | `durationMinutes`, `subjectId?`, `activityId?`, `kind`, `startedAt`, `completedAt` | Registros são imutáveis no cliente depois de criados |
| `users/{uid}/planner/quickNote` | `content`, `updatedAt` | Nota pessoal, documento fixo |
| `users/{uid}/weeklyGoals/{weekStart}` | `weekStart`, `targetMinutes`, `targetSessions`, `updatedAt` | Uma meta por semana ISO/local do app |
| `subjectSchedule/{slotId}` | `subjectId`, `day` (1–5), `startTime`, `endTime`, `room?`, timestamps | Bloco da planilha semanal; leitura autenticada, CRUD admin |
| `users/{uid}/preferences/visual` | `accent`, `surface`, `texture`, `density`, `updatedAt` | Personalização escura privada |
| `users/{uid}/ranking/state` | `totalRP`, `rankedActivities`, `lastActivityId`, `updatedAt` | Progresso rankeado privado da conta |
| `users/{uid}/ranking/settings` | `publicName`, `visible`, `updatedAt` | Opt-in e apelido escolhido pelo aluno |
| `users/{uid}/rankedActivities/{activityId}` | `activityId`, `points`, `awardedAt`, `active`, `reversedAt?` | Ledger não é apagado: `active=false` registra reversão quando o aluno desmarca a atividade; reconclusão ativa-o novamente |
| `users/{uid}/latePenalties/{activityId}` | `activityId`, `penaltyRP`, `lostRP`, `dueAt`, `penalizedAt` | Multa imutável e única por tarefa/aluno; nunca reduz o saldo abaixo de zero e não depende de scheduler de nuvem |
| `leaderboard/{uid}` | `displayName`, `totalRP`, `updatedAt` | Índice público mínimo; gravado apenas se `visible=true` |

Os bytes dos PDFs são gravados como blobs **privados** sob `2b-private/{adminUid}/{activityId}/...pdf`. `api/blob.ts` valida Firebase Auth, reserva upload apenas para admin, valida o caminho do anexo no Firestore em cada download e transmite o conteúdo privado. Tamanho máximo: 10 MiB; tipos aceitos: `application/pdf`. Não persistir URLs assinadas como caminho permanente; salvar somente o pathname, o nome e o tamanho no documento da atividade.

O catálogo inicial de conquistas é definido no cliente. O desbloqueio e o progresso são calculados com atividades concluídas e sessões daquele próprio UID; não há coleção pública de badges gravável pelo browser.

## Regras de acesso

- `firestore.rules` começa com negação por padrão e só abre caminhos declarados.
- Qualquer conta autenticada pode ler matérias/atividades; apenas o UID admin fixo pode criá-las/alterá-las/arquivá-las. As regras negam delete físico para preservar referências e histórico.
- O aluno só lê e escreve debaixo de `users/{request.auth.uid}`. O campo `uid` no perfil precisa coincidir com o ID do documento e com o token autenticado.
- O aluno não pode atribuir papel `admin`; o papel administrativo exige igualdade do UID com o marcador substituído em `firestore.rules`.
- Completions e sessões aceitam somente campos permitidos e timestamps; a regra final nega documentos não previstos.
- Multas só podem ser criadas pelo próprio aluno quando o prazo passou segundo `request.time`, a atividade e a matéria estão ativas e não existe completion; a transação precisa manter saldo e placar consistentes. Multas não podem ser alteradas nem apagadas pelo cliente.
- Publicar regras e substituir o UID admin antes de cadastrar a conta administrativa ou estudantes.

## Dados de origem MySQL

`scripts/migrate-mysql-to-firestore.ts` pode copiar matérias, atividades, perfis, conclusões, Pomodoro, notas e metas para o modelo acima. O script lê a origem MySQL em snapshot somente-leitura, requer `--apply` para gravar e nunca apaga dados da origem. Para associar os dados, as contas Firebase Auth correspondentes precisam existir com o mesmo e-mail. Senhas scrypt, cookies/sessões e rate limits legados não são portados; cada pessoa define nova senha no Firebase Auth.
