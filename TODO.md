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
- [x] `pnpm check`, `pnpm check:vercel`, `pnpm check:api`, Vitest, `pnpm test:rules` no Emulator e `pnpm build:vercel` passaram localmente.

## Preparação externa necessária

As ações externas ainda pendentes aparecem uma única vez na seção **Preparação externa pendente — não executar nesta tarefa** abaixo.

## Evoluções ainda fora desta fase

- [ ] Verificação de e-mail, convite privado por turma, notificações externas e realtime fora do placar ranqueado.

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

## Atualização da ranqueada — solicitação de 2026-10-05

- [x] **Progressão e fontes de RP:** tornar a subida de divisão mais fácil (50 RP por divisão; Radiante a partir de 1.200 RP); conceder pontos por prioridade de atividade (baixa 10, média 12, alta 15) e bônus por tipo (tarefa +0, prova +5, trabalho +3, projeto +4); o Modo Foco, Pomodoro e sessões livres continuam valendo 0 RP.
- [x] **Perda e correção do saldo:** ao desmarcar uma atividade, remover do saldo os RP exatos registrados no ledger da conclusão; armazenar a conclusão/ledger como ativa ou revertida; ao marcar de novo, reativar a pontuação sem duplicar; corrigir, uma única vez, RP de atividades desmarcadas em versões antigas mas ainda contabilizadas e reativar ledger inativo quando a conclusão histórica continua existindo.
- [x] **Placar automático:** atualizar a tabela global imediatamente em sessões conectadas via listener Firestore em tempo real, sem polling oneroso; manter consentimento por apelido, isolamento de dados privados e mesma pontuação no placar e no saldo do aluno.

## Integridade de catálogo e histórico — solicitação de 2026-10-05

- [x] **Arquivamento preserva dados:** substituir a exclusão física de matérias e atividades compartilhadas por arquivamento lógico; matérias/atividades arquivadas saem da grade/listas novas, mas conclusões/ledgers de cada aluno e PDFs permanecem guardados. Tarefas concluídas arquivadas seguem visíveis somente para o aluno que as concluiu até que ele as reabra; ao reabrir, os pontos são retirados e o item deixa as listas comuns.
- [x] **Regras protegem transições:** só o UID admin pode arquivar; regras negam excluir fisicamente matérias/atividades; aluno ainda pode reverter os RP de uma conclusão já existente em item arquivado, mas não pode concluir/reconcluir atividade arquivada nem atividade sob matéria arquivada para ganhar pontos, mesmo por uma aba antiga.


## Prazo e correção do Blob — solicitação de 2026-10-06

- [x] **Perda por atraso:** aluno perde uma única vez até 5 RP por atividade com prazo ultrapassado, depois da tolerância de 12 horas após o `dueDate` salvo ao meio-dia; o débito real é limitado ao saldo e RP nunca ficam negativos; tarefas sem prazo, concluídas no prazo, arquivadas, sob matéria arquivada ou encerradas pelo administrador no status editorial não geram multa; uma conclusão posterior ao prazo recebe a multa antes dos pontos de conclusão; administrador não recebe multa; reabrir não devolve uma multa já registrada; atividade encerrada pelo admin não pode receber nova conclusão.
- [x] **Aplicação automática e visível:** a reconciliação ocorre ao entrar/abrir o app e agenda o próximo prazo enquanto a página do aluno permanece aberta; a integração de concluir atividade executa a reconciliação antes da conclusão, atualiza o saldo/placar e exibe o aviso; sem Cron ou Cloud Function, uma multa vencida enquanto ninguém estiver conectado será registrada no próximo acesso; ID do documento por aluno/atividade impede repetição entre abas e sessões.
- [x] **Autorização da multa:** Firestore Rules só permitem ao UID do aluno criar um registro imutável em `latePenalties/{activityId}`, depois do prazo confirmado por `request.time`; a regra verifica atividade/matéria ativas, não repetição, conclusão no prazo, débito limitado ao saldo e sincronização do saldo/placar na mesma transação.
- [x] **Erro de credenciais Blob:** se não há token de escrita ou par OIDC + store ID, a Function retorna erro JSON 503 em português com orientação; aceita OIDC gerenciado pela Vercel e alternativa somente-server `BLOB_READ_WRITE_TOKEN`; PDFs continuam autenticados por Firebase Auth e nenhuma credencial privada vai para o cliente.
- [ ] **Setup externo ainda necessário:** proprietário conecta uma store Vercel Blob **privada** ao projeto e aos ambientes Preview/Production no plano Hobby e cria um novo deploy para o runtime receber as credenciais; este trabalho local não cria store, não adiciona cartão/billing e não publica.
