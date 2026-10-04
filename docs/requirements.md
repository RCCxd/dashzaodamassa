# Requisitos — Dashboard do 2B

## Visão do produto

App responsivo da turma para organizar matérias, atividades, prazos, estudo Pomodoro, metas e conquistas. O site é uma SPA Vite estática na Vercel; autenticação por Firebase Auth e dados em Firestore. O projeto não usa Manus para login/hosting e mira Firebase Spark + Vercel Hobby, sem cartão ou cobrança, dentro das cotas vigentes.

## Papéis e acesso

| Papel | Origem de confiança | Capacidades |
| --- | --- | --- |
| `admin` | Um UID escolhido no Firebase Auth e fixado nas regras `firestore.rules` | Criar/editar/excluir matérias e atividades globais |
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

- Admin pode criar, editar e excluir matéria com nome, cor, professor, horário e descrição.
- Usuários autenticados podem consultar o catálogo e progresso.

### Atividades

- Admin pode gerenciar título, descrição, matéria, tipo (`tarefa`, `prova`, `trabalho`, `projeto`), prioridade (`baixa`, `media`, `alta`), status, prazo, link e estimativa.
- Alunos podem pesquisar e filtrar por matéria, tipo, prioridade, prazo e estado.
- Cada aluno pode concluir/reabrir somente sua própria conclusão, armazenada no caminho com seu UID.

### Dashboard e foco

- Dashboard mostra resumo de atividades do usuário, prazos, gráficos por matéria, conclusão e horas de estudo.
- Pomodoro oferece ciclos 25/5, 50/10 e duração personalizada; iniciar, pausar, resetar, som/aviso e modo tela cheia.
- Sessões registradas incluem duração, horário e associações opcionais a matéria/atividade.
- Estatísticas incluem horas totais, sessões e sequência de dias.

### Conquistas, planner e exportação

- Badges iniciais: primeira atividade, 10/100 atividades, 7 dias de estudo, 10h de Pomodoro, completar matéria e estudar 5 dias na semana.
- Progresso é calculado dos registros do próprio UID; não aceitar escrita direta de badge pelo cliente.
- Cada usuário mantém uma nota rápida, metas semanais e exportação JSON/CSV somente dos próprios dados.

## Experiência e operação

- Tema escuro permanente, sem alternância de tema claro.
- Interface em pt-BR, responsiva, acessível por teclado, sidebar desktop e navegação inferior mobile.
- PWA com manifest, ícones, service worker e tela offline mínima.
- Deploy estático Vite em `dist/`, sem Function de aplicação própria ou rota `/api`.
- Acesso direto ao Firestore com Rules; nenhuma service account no bundle/ambiente Vercel.
- Ficar no Spark (Auth e Firestore Standard) e Hobby; sem Blaze/billing, Cloud Functions, Phone Auth, App Hosting ou domínio pago.
- Migração MySQL opcional local, snapshot somente-leitura, destino apenas após dry-run, sem importar senhas/sessões antigas.

## Critérios de aceite da migração

- Build Vite, TypeScript e testes passam.
- Rotas SPA e assets carregam com HTTP 200 e MIME correto no Preview.
- Signup, login, logout e redefinição de senha funcionam pelo Firebase Auth.
- Firestore Rules impedem um aluno de editar catálogo e ler/gravar dados de outro aluno.
- Admin UID consegue gerir catálogo; alunos só veem seus próprios dados privados.
- Nenhuma variável MySQL, token de sessão legado ou chave de service account é enviada à Vercel.

## Fora do MVP

Calendário mensal interativo, anexos, ranking, push/e-mail externo, verificação de e-mail obrigatória, convites, realtime multissessão e provisionamento automático de contas.
