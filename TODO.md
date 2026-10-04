# Entregas do Dashboard do 2B

## Implementado no código

- [x] Dashboard responsivo para desktop/celular, matérias, atividades, gráficos, prazos, Pomodoro, metas, notas, conquistas e exportação.
- [x] Tema escuro permanente e PWA com manifest, service worker e página offline.
- [x] Frontend migrado para Firebase Auth por e-mail/senha, cadastro aberto, recuperação de senha e perfil associado ao UID.
- [x] Operações de domínio migradas de tRPC para SDK web Firestore.
- [x] Regras Firestore fail-closed: dados pessoais por UID, catálogo legível para autenticados e edição exclusiva de admin por UID autorizado.
- [x] Deploy Vercel estático em `dist/`; removida a antiga Function `/api/*` que respondia HTML 404 no cadastro.
- [x] Tela de configuração explícita se faltarem credenciais Firebase.
- [x] Importador MySQL→Firestore em dry-run por padrão; origem somente-leitura e nenhum hash/sessão antiga é migrado.
- [x] `pnpm check`, `pnpm check:vercel`, Vitest, `pnpm test:rules` no Emulator e `pnpm build:vercel` passaram localmente.

## Preparação externa necessária

- [ ] Criar/selecionar projeto Firebase no plano Spark; habilitar Auth e Firestore, sem mudar para Blaze ou adicionar cartão.
- [ ] Escolher cuidadosamente a localização do Firestore; a região não pode ser alterada depois de criar o banco.
- [ ] Registrar Firebase Web App e adicionar variáveis `VITE_FIREBASE_*` no Vercel (Preview e Production).
- [ ] Criar uma conta admin no Firebase Auth, copiar UID, substituir `REPLACE_WITH_ADMIN_UID` nas regras e publicar `firestore.rules`.
- [ ] Autorizar os hostnames exatos do Preview e do site em produção no Firebase Auth (sem wildcard).
- [ ] Enviar esta versão em branch Preview pelo GitHub e validar assets, Auth e regras; só então promover à branch `main`.
- [ ] Criar contas Firebase para os e-mails que já têm dados na origem; executar dry-run e revisar contagens do importador antes de `--apply`.
- [ ] Preservar a origem Manus/MySQL como backup; confirmar e comunicar que usuários legados precisam redefinir a senha.

## Evoluções pós-MVP

- [ ] Verificação de e-mail, convite privado por turma e ferramentas administrativas de recuperação.
- [ ] Calendário mensal/semanal interativo.
- [ ] Upload de anexos em provedor aprovado pelo limite gratuito.
- [ ] Ranking opcional e notificações externas.
- [ ] Realtime multissessão após validar quotas de leituras.
