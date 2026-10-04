# Tarefas — Dashboard do 2B

## MVP — implementação local

- [x] Interface responsiva de dashboard, matérias, atividades, foco, planner e conquistas.
- [x] Tema escuro permanente e PWA.
- [x] Firebase Auth web: e-mail/senha, cadastro de aluno e redefinição de senha.
- [x] Firestore client SDK para operações de domínio, com dados pessoais associados a UID.
- [x] Regras de segurança Firestore com papel admin ancorado a UID e negação padrão.
- [x] Vercel estático: build Vite em `dist/` e rewrites SPA, sem backend `/api`.
- [x] Importador legado MySQL→Firestore criado em modo dry-run por padrão.

## Configuração/validação ainda pendente

- [ ] Criar projeto Firebase Spark, habilitar Email/Password e provisionar Firestore em região escolhida com cuidado.
- [ ] Definir conta admin e UID fixo nas regras Firestore e variáveis públicas `VITE_FIREBASE_*` na Vercel.
- [ ] Publicar as regras e autorizar os hostnames exatos de Preview/Production em Firebase Auth (sem wildcard).
- [x] Typecheck geral/Vercel, 7 testes Vitest, 11 verificações de Rules no Emulator e build Vite passam localmente.
- [ ] Enviar correção por branch GitHub para um Preview Vercel; conferir se CSS/JS/manifest retornam 200 e MIME correto.
- [ ] Testar signup/login/recuperação, isolamento de dados entre dois alunos e CRUD administrativo.
- [ ] Criar contas Auth para os e-mails legados que precisam de dados; executar/revisar dry-run do importador.
- [ ] Só após revisão, importar dados com `--apply`; manter a origem intacta e orientar reset de senha aos usuários antigos.
- [ ] Depois de validar Preview, mesclar à branch `main` e conferir Production.

## Evoluções

- [ ] Verificação de e-mail e fluxo de convite/recuperação administrativa.
- [ ] Calendário interativo, uploads e notificações externas.
- [ ] Realtime multissessão se o uso de 30 alunos permanecer dentro da cota Spark.
