# Requisitos — Dashboard do 2B

## Visão do produto

App responsivo da turma para organizar matérias, atividades, prazos, estudo Pomodoro, metas e conquistas. O site é uma SPA Vite estática na Vercel; autenticação por Firebase Auth e dados em Firestore. O projeto não usa Manus para login/hosting e mira Firebase Spark + Vercel Hobby, sem cartão ou cobrança, dentro das cotas vigentes.

## Papéis e acesso

| Papel | Origem de confiança | Capacidades |
| --- | --- | --- |
| `admin` | Um UID escolhido no Firebase Auth e fixado nas regras `firestore.rules` | Criar/editar matérias e atividades globais; arquivá-las sem apagar o histórico |
| `student` | Qualquer conta autenticada que não seja o UID admin | Ler conteúdo da turma; registrar conclusões, sessões, notas e metas próprias |

O client mostra/esconde controles por perfil, mas as regras Firestore são a autorização efetiva. Cliente nunca pode criar/alterar o próprio papel para `admin`. Dados pessoais são armazenados sob `users/{uid}`.

## Autenticação

- Cadastro público por e-mail e senha para alunos; contas novas sempre recebem papel `student`.
- Login, logout e redefinição de senha pelo Firebase Authentication; sem Manus OAuth, sem backend de sessão local e sem SMS/Phone Auth.
- A identidade é o Firebase Auth UID; perfil de aluno só é criado para `users/{request.auth.uid}`.
- A conta admin é criada pelo proprietário no Console Firebase. Privilégios administrativos exigem UID igual ao UID autorizado nas regras Firestore.
- Regras Firestore precisam ser publicadas antes de abrir cadastro. Regras negam por padrão e validam campos/timestamps.
- O app mostra uma instrução clara quando faltam variáveis Firebase; falhas de rede/regras produzem feedback, não tela branca.

## Funcionalidades

### Matérias

- Admin pode criar, editar e arquivar matéria com nome, cor, professor, horário e descrição; não existe exclusão física do catálogo.
- Matéria arquivada sai da grade e das opções para novos registros, mas blocos, atividades e progresso histórico permanecem guardados.
- O administrador pode manter vários blocos por matéria em `subjectSchedule`, com dia útil, início/fim e sala; todos os alunos autenticados veem uma grade de segunda a sexta, sem depender de hover.
- Usuários autenticados podem consultar o catálogo e progresso.

### Atividades

- Admin pode gerenciar título, descrição, matéria, tipo (`tarefa`, `prova`, `trabalho`, `projeto`), prioridade (`baixa`, `media`, `alta`), status, prazo, link e estimativa.
- Alunos podem pesquisar e filtrar por matéria, tipo, prioridade, prazo e estado.
- Cada aluno pode concluir/reabrir somente sua própria conclusão, armazenada no caminho com seu UID.
- Admin pode arquivar, não apagar fisicamente, atividades. Tarefas pendentes arquivadas saem das listas; uma tarefa já concluída continua visível para aquele aluno até ele reabri-la, momento em que o ledger remove os RP e a tarefa arquivada deixa de aparecer.
- Arquivar atividade/matéria não apaga conclusões, ledger, RP ou PDF privado; regras negam deletes diretos de matérias e atividades.
- Mesmo que uma aba antiga mantenha atividade em tela, uma nova conclusão é recusada quando a tarefa ou sua matéria estiver arquivada; uma conclusão já existente ainda pode ser desfeita.
- Admin pode anexar/substituir/remover somente PDFs de até 10 MiB; alunos autenticados podem baixar somente o arquivo vinculado à atividade existente. Arquivos são privados no Vercel Blob Hobby; metadados ficam no documento da atividade.

### Dashboard e foco

- Dashboard mostra resumo de atividades do usuário, prazos, gráficos por matéria, conclusão e horas de estudo.
- Pomodoro oferece ciclos 25/5, 50/10 e duração personalizada; iniciar, pausar, resetar, som/aviso e modo tela cheia.
- Sessões registradas incluem duração, horário e associações opcionais a matéria/atividade.
- Pausa, retomada, reset, deadline absoluto, restauração após atualizar navegador, notificação opcional e tela cheia devem funcionar; a conclusão do Pomodoro registra no máximo uma sessão e concede exatamente 0 RP.
- Estatísticas incluem horas totais, sessões e sequência de dias.

### Conquistas, planner e exportação

- Conquistas incluem marcos de atividades, dias de estudo, sessões/horas Pomodoro e conclusão por matéria.
- Progresso é calculado dos registros do próprio UID; não aceitar escrita direta de badge pelo cliente.
- Cada usuário mantém nota rápida, metas semanais e exportação JSON/CSV somente dos próprios dados. A mesma nota abre pelo Planner, atalho global e prévia do dashboard.

### Ranqueada, aparência e ajuda

- Divisões inspiradas no Valorant vão de Ferro a Radiante, com 50 RP por divisão e Radiante a partir de 1.200 RP. RP combina prioridade (baixa 10, média 12, alta 15) e tipo (tarefa +0, prova +5, trabalho +3, projeto +4); Modo Foco, Pomodoro e sessões livres valem 0 RP.
- O ledger registra o valor concedido e se a conclusão está ativa. Desmarcar a atividade reverte exatamente o valor do ledger; marcar novamente reativa a pontuação uma vez. O app também corrige uma vez RP de atividades desmarcadas em versões anteriores que continuaram contabilizadas e repara um ledger inativo quando sua conclusão histórica ainda existe. Não há multa por prazo nesta versão.
- Página `/ranking` permite opt-in/opt-out explícito e apelido público de 2–32 caracteres. `leaderboard/{uid}` contém somente apelido, RP total e atualização; não contém e-mail, notas, metas, sessões ou papel.
- A tabela usa listener Firestore em tempo real e reflete alterações de saldo em sessões abertas sem polling periódico.
- Cores, fundos, textura e densidade visual são individuais por UID e persistem entre páginas/sessões. A interface oferece exclusivamente fundos escuros.
- Ações de ajuda contextual abrem pop-ups específicos da página, acessíveis por toque e teclado.

## Experiência e operação

- Tema escuro permanente, sem alternância de tema claro.
- Estética editorial de caderno escolar feita para leitura e estudo; conteúdo/títulos de matérias nunca ficam escondidos até hover.
- Interface em pt-BR, responsiva, acessível por teclado, sidebar desktop e navegação inferior mobile.
- PWA com manifest, ícones, service worker e tela offline mínima.
- Deploy SPA Vite em `dist/`; apenas `/api/blob` é uma Vercel Function restrita a autorizar uploads e servir anexos privados. Não há API de domínio/CRUD.
- Acesso direto ao Firestore com Rules; nenhuma service account no bundle/ambiente Vercel.
- Ficar no Spark (Auth e Firestore Standard) e Hobby; sem Blaze/billing, Cloud Functions, Phone Auth, App Hosting ou domínio pago.
- Migração MySQL opcional local, snapshot somente-leitura, destino apenas após dry-run, sem importar senhas/sessões antigas.

## Critérios de aceite da migração

- Build Vite, TypeScript e testes passam.
- Rotas SPA e assets carregam com HTTP 200 e MIME correto no Preview.
- Signup, login, logout e redefinição de senha funcionam pelo Firebase Auth.
- Firestore Rules impedem um aluno de editar catálogo e ler/gravar dados de outro aluno; só o UID admin arquiva e deletes físicos de matérias/atividades são negados para preservar referências e RP.
- Admin UID consegue gerir catálogo; alunos só veem seus próprios dados privados.
- Nenhuma variável MySQL, token de sessão legado ou chave de service account é enviada à Vercel.

## Fora do MVP

Calendário mensal interativo, push/e-mail externo, verificação de e-mail obrigatória, convites privados, realtime multissessão fora do placar ranqueado e provisionamento automático de contas.
