import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { firebaseApi } from "@/lib/firebase-api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Check, ClipboardPenLine, Flag, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function PlannerPage() {
  const note = firebaseApi.planner.note.useQuery();
  const goal = firebaseApi.planner.goal.useQuery();
  const study = firebaseApi.study.stats.useQuery();
  const dashboard = firebaseApi.dashboard.summary.useQuery();
  const utils = firebaseApi.useUtils();
  const [noteText, setNoteText] = useState("");
  const [minutes, setMinutes] = useState(120);
  const [sessions, setSessions] = useState(4);
  useEffect(() => { if (note.data) setNoteText(note.data.content); }, [note.data]);
  useEffect(() => { if (goal.data) { setMinutes(goal.data.targetMinutes); setSessions(goal.data.targetSessions); } }, [goal.data]);
  const saveNote = firebaseApi.planner.saveNote.useMutation({ onSuccess: () => { void utils.planner.note.invalidate(); toast.success("Nota salva. Ela também está no botão Nota do topo."); } });
  const saveGoal = firebaseApi.planner.saveGoal.useMutation({ onSuccess: () => { void utils.planner.goal.invalidate(); toast.success("Meta semanal atualizada."); } });
  const minutesDone = study.data?.weekMinutes ?? 0;
  const sessionsDone = study.data?.weekSessions ?? 0;
  const goalPercent = Math.min(100, Math.round((minutesDone / Math.max(1, minutes)) * 100));

  return <div className="editorial-page space-y-7">
    <header className="editorial-heading"><p className="eyebrow">Espaço pessoal <span aria-hidden="true">/</span> só para você</p><h1>Planner</h1><p className="lede">Rascunhe sem pressa e acompanhe uma meta que caiba na sua semana.</p></header>
    <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
      <article className="editorial-panel"><div className="flex items-start justify-between gap-3"><div><p className="eyebrow">Seu espaço</p><h2 className="mt-1 font-editorial text-2xl">Nota rápida</h2><p className="mt-1 text-xs text-muted-foreground">A mesma nota pode ser aberta pelo botão Nota no topo.</p></div><ClipboardPenLine className="size-5 text-brand" /></div><Textarea value={noteText} onChange={event => setNoteText(event.target.value)} className="mt-5 min-h-64 resize-y leading-6" maxLength={5000} placeholder="Ideias, dúvidas, pontos para revisar…" aria-label="Sua nota rápida" /><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="font-mono text-[10px] text-muted-foreground">{noteText.length}/5.000</span><Button onClick={() => saveNote.mutate({ content: noteText })} disabled={saveNote.isPending || noteText.length > 5000}><Save className="size-4" />{saveNote.isPending ? "Salvando…" : "Salvar nota"}</Button></div></article>
      <article className="editorial-panel"><div className="flex items-start justify-between"><div><p className="eyebrow">Meta da semana</p><h2 className="mt-1 font-editorial text-2xl">Ritmo sustentável</h2></div><Flag className="size-5 text-brand" /></div><div className="mt-7"><div className="flex justify-between gap-3 font-mono text-xs"><span>{minutesDone} de {minutes} min</span><span className="text-brand">{goalPercent}%</span></div><Progress value={goalPercent} className="mt-3 h-2" /><p className="mt-3 text-xs text-muted-foreground">{sessionsDone} de {sessions} blocos registrados.</p></div><div className="mt-6 grid grid-cols-2 gap-3"><label className="text-xs font-semibold">Minutos por semana<Input type="number" min={15} max={2400} value={minutes} onChange={event => setMinutes(Number(event.target.value))} className="mt-2" /></label><label className="text-xs font-semibold">Blocos por semana<Input type="number" min={1} max={50} value={sessions} onChange={event => setSessions(Number(event.target.value))} className="mt-2" /></label></div><Button className="mt-5 w-full" onClick={() => saveGoal.mutate({ targetMinutes: minutes, targetSessions: sessions })} disabled={saveGoal.isPending}><Check className="size-4" />{saveGoal.isPending ? "Atualizando…" : "Atualizar meta"}</Button><p className="mt-3 text-[11px] leading-5 text-muted-foreground">As sessões são estatísticas pessoais; elas não concedem RP.</p></article>
    </section>
    <section className="editorial-panel p-0"><div className="flex items-end justify-between gap-4 border-b border-border px-5 py-4"><div><p className="eyebrow">Agenda rápida</p><h2 className="mt-1 font-editorial text-2xl">Próximos prazos</h2></div><CalendarDays className="size-4 text-brand" /></div>{dashboard.data?.upcoming.length ? <div className="divide-y divide-border">{dashboard.data.upcoming.map(item => <div key={item.id} className="flex items-center gap-3 px-5 py-3.5"><span className="h-9 w-[3px] shrink-0 rounded-full" style={{ background: item.subject.color }} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.subject.name}</p></div><span className="font-mono text-[10px] text-muted-foreground">{item.dueDate && format(item.dueDate, "EEE, dd MMM", { locale: ptBR })}</span></div>)}</div> : <div className="px-5 py-6 text-sm text-muted-foreground">Nenhum prazo agendado. <Link href="/activities" className="font-semibold text-brand underline">Ver atividades</Link></div>}</section>
  </div>;
}
