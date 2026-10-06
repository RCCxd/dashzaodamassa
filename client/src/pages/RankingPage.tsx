import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { firebaseApi } from "@/lib/firebase-api";
import { subscribeLeaderboard, type LeaderboardEntry } from "@/lib/firestore-data";
import { progressToNextRank, resolveValorantRank } from "@/lib/ranking";
import { ArrowDownUp, Eye, EyeOff, Medal, ShieldCheck, Sparkles, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function DivisionMark({ points, small = false }: { points: number; small?: boolean }) {
  const rank = resolveValorantRank(points);
  return <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-bold ${small ? "text-xs" : "text-sm"}`} style={{ color: rank.color, borderColor: `${rank.color}55`, backgroundColor: `${rank.color}12` }}>
    <Medal className={small ? "size-3.5" : "size-4"} />{rank.label}
  </span>;
}

export default function RankingPage() {
  const me = firebaseApi.auth.me.useQuery();
  const state = firebaseApi.ranking.state.useQuery();
  const settings = firebaseApi.ranking.settings.useQuery();
  const utils = firebaseApi.useUtils();
  const [publicName, setPublicName] = useState("");
  const [visible, setVisible] = useState(false);
  const [leaderboardRows, setLeaderboardRows] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState(false);
  const rankState = state.data ?? { totalRP: 0, rankedActivities: 0 };
  const rank = resolveValorantRank(rankState.totalRP);
  const progress = progressToNextRank(rank);
  const position = leaderboardRows.findIndex(item => item.uid === me.data?.uid);

  useEffect(() => subscribeLeaderboard(rows => {
    setLeaderboardRows(rows);
    setLeaderboardLoading(false);
    setLeaderboardError(false);
  }, error => {
    console.error("Falha ao acompanhar o placar ranqueado", error);
    setLeaderboardLoading(false);
    setLeaderboardError(true);
  }), []);

  useEffect(() => {
    if (!settings.data) return;
    setPublicName(settings.data.publicName || me.data?.name || "");
    setVisible(settings.data.visible);
  }, [settings.data, me.data?.name]);

  const saveSettings = firebaseApi.ranking.saveSettings.useMutation({
    onSuccess: () => {
      void utils.ranking.settings.invalidate();
      void utils.ranking.leaderboard.invalidate();
      toast.success(visible ? "Seu apelido entrou na classificação." : "Preferência de privacidade atualizada.");
    },
    onError: error => toast.error(error.message),
  });

  const persist = () => {
    if (publicName.trim().length < 2 || publicName.trim().length > 32) return toast.error("Use um apelido entre 2 e 32 caracteres.");
    saveSettings.mutate({ publicName: publicName.trim(), visible });
  };

  return <div className="editorial-page space-y-8">
    <header className="editorial-heading">
      <p className="eyebrow">Placar da turma <span aria-hidden="true">/</span> temporada de estudos</p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1>Ranqueada</h1><p className="lede">Uma tarefa concluída por vez. O relógio de foco não conta como ponto.</p></div>
        <div className="font-mono text-xs text-muted-foreground">01 · 2B</div>
      </div>
    </header>

    <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <article className="rank-hero">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div><p className="eyebrow text-white/65">Sua divisão</p><h2 className="mt-3 font-editorial text-4xl sm:text-5xl" style={{ color: rank.color }}>{rank.label}</h2><p className="mt-2 text-sm text-white/65">{rankState.totalRP.toLocaleString("pt-BR")} RP acumulados</p></div>
          <div className="rank-hero-seal" style={{ color: rank.color, borderColor: `${rank.color}70` }}><Medal className="size-8" /><span>{rank.division ? rank.division : "R"}</span></div>
        </div>
        <div className="mt-8">
          <div className="mb-2 flex justify-between gap-4 font-mono text-xs text-white/65"><span>{rank.rr} / 50 RP nesta divisão</span><span>{rank.nextThreshold === null ? "Topo da escada" : `${rank.nextThreshold - rankState.totalRP} RP até ${resolveValorantRank(rank.nextThreshold).label}`}</span></div>
          <Progress value={progress} className="h-2 bg-white/15 [&>div]:bg-[var(--brand)]" />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/65"><span className="inline-flex items-center gap-2"><Sparkles className="size-3.5 text-[var(--brand)]" />{rankState.rankedActivities} atividades pontuadas</span><span className="inline-flex items-center gap-2"><Timer className="size-3.5" />Foco: 0 RP</span></div>
      </article>

      <article className="editorial-panel flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-brand" /><p className="eyebrow">Privacidade por escolha</p></div>
          <h2 className="mt-3 font-editorial text-2xl">Aparecer no placar?</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">O ranking mostra somente o apelido escolhido e os RP. E-mail, notas e sessões ficam fora.</p>
        </div>
        <div className="mt-6 space-y-4">
          <label className="block text-xs font-bold" htmlFor="rank-alias">Apelido público</label>
          <Input id="rank-alias" value={publicName} onChange={event => setPublicName(event.target.value)} maxLength={32} placeholder={me.data?.name || "Seu apelido"} />
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3">
            <input type="checkbox" checked={visible} onChange={event => setVisible(event.target.checked)} className="mt-0.5 accent-[var(--brand)]" />
            <span><span className="block text-sm font-semibold">Mostrar meu apelido no placar</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Você pode ocultá-lo depois; e-mail, notas e sessões não aparecem.</span></span>
          </label>
          <Button onClick={persist} disabled={saveSettings.isPending || settings.isLoading} className="w-full">
            {saveSettings.isPending ? "Salvando…" : visible ? <><Eye className="size-4" />Salvar e aparecer</> : <><EyeOff className="size-4" />Salvar sem aparecer</>}
          </Button>
        </div>
      </article>
    </section>

    <section className="editorial-panel p-0">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border p-5 sm:p-6">
        <div><p className="eyebrow">2B · classificação geral</p><h2 className="mt-1 font-editorial text-2xl">Quem está no placar</h2><p className="mt-1 text-sm text-muted-foreground">Somente alunos que escolheram exibir um apelido.</p></div>
        <span className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground"><ArrowDownUp className="size-3.5" />ao vivo · ordenado por RP</span>
      </div>
      {leaderboardLoading ? <div className="space-y-3 p-5">{[1, 2, 3].map(row => <div key={row} className="h-14 animate-pulse rounded-lg bg-muted" />)}</div>
        : leaderboardError ? <div role="status" className="p-6 text-sm text-muted-foreground">Não foi possível acompanhar o placar agora. Confira a conexão e recarregue a página.</div>
        : leaderboardRows.length ? <ol className="divide-y divide-border">
          {leaderboardRows.map((entry, index) => <li key={entry.uid} className={`flex flex-wrap items-center gap-3 px-5 py-4 sm:px-6 ${entry.uid === me.data?.uid ? "bg-brand/5" : ""}`}>
            <span className={`grid size-8 shrink-0 place-items-center rounded-full font-mono text-xs font-bold ${index < 3 ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground"}`}>{String(index + 1).padStart(2, "0")}</span>
            <span className="min-w-0 flex-1 truncate font-semibold">{entry.displayName}{entry.uid === me.data?.uid && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-brand">você</span>}</span>
            <DivisionMark points={entry.totalRP} small />
            <span className="w-16 text-right font-mono text-xs font-bold">{entry.totalRP.toLocaleString("pt-BR")} RP</span>
          </li>)}
        </ol> : <div className="grid min-h-52 place-items-center p-8 text-center"><div><Medal className="mx-auto size-8 text-brand" /><h3 className="mt-3 font-editorial text-xl">O placar está em branco — por enquanto.</h3><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Quando os alunos ativarem a exibição e concluírem atividades, as divisões aparecem aqui.</p></div></div>}
      {position >= 0 && <p className="border-t border-border px-5 py-3 font-mono text-xs text-muted-foreground sm:px-6">Sua posição atual: #{position + 1} de {leaderboardRows.length} · {rankState.totalRP} RP</p>}
    </section>
    <p className="text-xs leading-5 text-muted-foreground">Cada divisão pede 50 RP. Base por prioridade: baixa 10 · média 12 · alta 15. Bônus por tipo: tarefa +0 · prova +5 · trabalho +3 · projeto +4. Reabrir uma atividade reverte os RP daquela conclusão. Após o fim do dia do prazo (12 horas depois da data salva), uma atividade pendente perde até 5 RP uma única vez, limitada ao saldo; concluir depois não devolve a multa. Pomodoro, sessões livres e tempo de foco não dão RP.</p>
  </div>;
}
