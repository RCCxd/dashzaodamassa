# Entregas do Dashboard do 2B

## Implementado no código

- [x] Dashboard responsivo para desktop/celular, matérias, atividades, gráficos, prazos, Pomodoro, metas, notas, conquistas e exportação.
- [x] Tema escuro permanente e PWA com manifest, service worker e página offline.
- [x] Frontend migrado para Firebase Auth por e-mail/senha, cadastro aberto, recuperação de senha e perfil associado ao UID.
- [x] Operações de domínio migradas de tRPC para SDK web Firestore.
- [x] Regras Firestore fail-closed: dados pessoais por UID, catálogo legível para autenticados e edição exclusiva de admin por UID autorizado.
- [x] Deploy com SPA estática em `dist/` e uma Function restrita `/api/blob` para anexos privados; sem backend genérico ou API de cadastro.
- [x] Tela de configuração explícita se faltarem credenciais Firebase.
- [x] Importador MySQL→Firestore em dry-run por padrão; origem somente-leitura e nenhum hash/sessão antiga é migrado.
- [x] `pnpm check`, `pnpm check:vercel`, Vitest, `pnpm test:rules` no Emulator e `pnpm build:vercel` passaram localmente.

## Preparação externa necessária

As ações externas ainda pendentes aparecem uma única vez na seção **Preparação externa pendente — não executar nesta tarefa** abaixo.

## Evoluções ainda fora desta fase

- [ ] Verificação de e-mail, convite privado por turma, notificações externas e realtime multissessão.


## Fase 2 — critérios de aceite

- [x] **Estética e visibilidade:** refazer a parte estética para não parecer feita por IA, usando composição editorial/caderno escolar; corrigir o bug em que matérias e outros conteúdos só ficam visíveis quando passo o mouse por cima; preservar o tema escuro permanentemente e manter a interface responsiva.
- [x] **Ranked Valorant:** criar níveis e divisões inspirados nos rankings do Valorant, com RP ganho por atividade escolar concluída e sem conceder pontos pelo tempo/sessões do Modo Foco; evitar pontuação duplicada ao reabrir e concluir novamente a mesma atividade.
- [x] **Ranking global e privacidade:** criar uma página global de classificação dos alunos; mostrar somente o apelido escolhido voluntariamente, divisão e RP; não expor e-mail, notas, metas, sessões ou dados pessoais de outro aluno; permitir adesão/saída explícita da classificação.
- [x] **Modo foco:** verificar e melhorar os ciclos Pomodoro de 25/5, 50/10 e duração personalizada, controles iniciar/pausar/retomar/resetar, alertas sonoro/visual/notificação, tela cheia e registro da sessão; uma conclusão de ciclo deve registrar no máximo uma sessão e nunca gerar RP.
- [x] **Horário semanal:** fazer a página Matérias funcionar como uma planilha/grade visual da semana, com dias, horários e matérias claramente visíveis sem hover; permitir ao administrador manter blocos estruturados e aos alunos consultar a grade em desktop e celular.
- [x] **Notas acessíveis:** garantir que notas salvas persistam no Firestore do próprio aluno, estejam disponíveis no Planner e possam ser abertas/consultadas em outras áreas do site sem copiar para a conta de outro usuário.
- [x] **Personalização visual:** oferecer a cada usuário opções pessoais de cor de destaque, fundo escuro e densidade/apresentação; salvar e aplicar preferências entre páginas e sessões; não oferecer tema claro.
- [x] **Ajuda contextual:** adicionar popups de ajuda aos usuários, com conteúdo adequado à tela atual e controles utilizáveis por teclado e toque.
- [x] **PDFs em tarefas:** permitir ao administrador anexar, substituir e remover PDFs de tarefas e aos alunos autenticados baixá-los; aceitar somente PDF de até 10 MB; manter os arquivos privados no Vercel Blob e permanecer no uso gratuito do Vercel Hobby, sem ativar cobrança automática, cartão ou Blaze.
- [x] **Conquistas:** acrescentar conquistas úteis ou substituí-las por progressão ranqueada quando mais claro; toda conquista deve derivar de atividade/sessão real do próprio usuário, e tempo de foco não deve conceder RP.

## Preparação externa pendente — não executar nesta tarefa

- [ ] Criar/selecionar projeto Firebase no plano Spark; habilitar Auth e Firestore, sem mudar para Blaze ou adicionar cartão.
- [ ] Escolher cuidadosamente a localização do Firestore; a região não pode ser alterada depois de criar o banco.
- [ ] Registrar Firebase Web App e adicionar variáveis `VITE_FIREBASE_*` no Vercel (Preview e Production).
- [ ] Criar uma conta admin no Firebase Auth, copiar UID, substituir `REPLACE_WITH_ADMIN_UID` nas regras e publicar `firestore.rules`.
- [ ] Autorizar os hostnames exatos do Preview e do site em produção no Firebase Auth (sem wildcard).
- [ ] Conectar um Blob **privado** ao projeto Vercel Hobby e confirmar a cota incluída antes de compartilhar PDFs; não ativar billing/Blaze nem adicionar cartão.
- [ ] Enviar esta versão em branch Preview pelo GitHub e validar assets, Auth e regras; só então promover à branch `main`.
- [ ] Criar contas Firebase para os e-mails que já têm dados na origem; executar dry-run e revisar contagens do importador antes de `--apply`.
- [ ] Preservar a origem Manus/MySQL como backup; confirmar e comunicar que usuários legados precisam redefinir a senha.
