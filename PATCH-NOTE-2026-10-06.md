# Patch note — 6 de outubro de 2026

## Ranqueada: atraso e perda de RP
- Uma atividade não concluída até o prazo gera **uma única multa de até −5 RP**, aplicada depois da tolerância de 12 horas após a data salva ao meio-dia.
- A perda efetiva é limitada ao saldo disponível; a classificação nunca fica abaixo de **0 RP**. Uma multa já registrada não é cobrada de novo.
- Ao concluir depois do prazo, a multa é registrada antes da conclusão e **não é devolvida**. Reabrir a atividade reverte os RP da conclusão, mas não apaga a multa.
- A verificação roda ao abrir/entrar no dashboard e, se a página do aluno continuar aberta, no horário do próximo prazo. Sem Cloud Function ou Cron, uma multa vencida enquanto ninguém estiver conectado será registrada no próximo acesso.
- Modo Foco e sessões de estudo continuam valendo **0 RP**.
- Se o administrador encerrar o status do quadro, a atividade fica isenta da multa e o controle de nova conclusão é desabilitado; uma conclusão já existente ainda pode ser reaberta para reverter seus RP.

## PDFs privados
- A Function agora distingue credenciais OIDC da Vercel (`BLOB_STORE_ID` + `VERCEL_OIDC_TOKEN`) do token de contingência no servidor e retorna orientação legível quando não encontra uma Blob privada conectada.
- Para habilitar anexos, conecte uma store **Private** ao projeto Vercel e aos ambientes Preview/Production e faça **Redeploy**. Limite por arquivo: **10 MiB**; não é necessário colocar tokens no frontend.

## Entrega e validação
- Os testes de Firestore Rules cobrem multa única e piso zero, conclusão atrasada antes/depois da multa e bloqueios para admin, tarefa sem prazo, tarefa/matéria arquivada e status encerrado pelo administrador.
- Validação local final: `pnpm check`, 11 testes unitários (`pnpm test`), `pnpm test:rules`, `pnpm build:vercel` e `git diff --check` passaram.
- **Alterações locais, sem deploy e sem criação/alteração de recursos externos.** Infraestrutura pretendida permanece Vercel Hobby + Firebase Spark.
