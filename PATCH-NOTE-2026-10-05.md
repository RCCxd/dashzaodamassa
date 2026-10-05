# Patch note — 5 de outubro de 2026

## Ranqueada
- Subida mais rápida: cada divisão agora exige **50 RP**; Radiante começa em **1.200 RP**.
- Pontuação por prioridade: baixa **10**, média **12**, alta **15 RP**; bônus por tipo: tarefa **+0**, prova **+5**, trabalho **+3**, projeto **+4**.
- Desmarcar uma atividade remove os RP daquela conclusão; marcar de novo pontua uma vez. Saldos antigos deixados por desmarcações também são corrigidos.
- O placar atualiza em tempo real. Pomodoro, sessões livres e tempo de foco continuam valendo **0 RP**.

## Integridade do histórico
Matérias e tarefas agora são arquivadas em vez de apagadas. O histórico de conclusões, RP e PDFs é preservado; um aluno que já concluiu uma tarefa arquivada ainda pode reabri-la e perder os RP correspondentes.
Tarefas sob matéria arquivada também não podem gerar novos RP por uma aba antiga. O reparo de saldo agora cobre ledger inativo quando a conclusão histórica ainda existe.

## Melhorias da versão
Visual editorial escuro e responsivo, matérias em grade semanal, notas persistentes com atalho global, personalização por aluno, ajuda contextual, Pomodoro mais confiável e PDFs privados anexados às tarefas.

**Infraestrutura:** as alterações foram feitas localmente; não houve deploy. Para PDFs em produção, o projeto Vercel precisa de um Blob privado dentro da cota gratuita do Hobby.
