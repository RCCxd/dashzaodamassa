import { MetricCard } from "@/components/dashboard/MetricCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { firebaseApi } from "@/lib/firebase-api";
import { resolveValorantRank } from "@/lib/ranking";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, ArrowRight, CheckCircle2, CircleDashed, Clock3, FileText, ListTodo, Medal, NotebookPen, TrendingUp } from "lucide-react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Link } from "wouter";

const tooltipStyle = { borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: 12 };

export default function DashboardPage() {
  const dashboard = firebaseApi.dashboard.summary.useQuery(undefined, { refetchInterval: 30_000 });
  const study = firebaseApi.study.stats.useQuery(undefined, { refetchInterval: 30_000 });
  const note = firebaseApi.planner.note.useQuery();
  const ranking = firebaseApi.ranking.state.useQuery();
  const data = dashboard.data;

  if (dashboard.isLoading) return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-xl bg-muted" />)}</div>;
  if (!data) return <section className="editorial-panel border-dashed p-10 text-center"><p className="font-semibold">Não foi possível carregar o seu panorama.</p><Button className="mt-4" onClick={() => void dashboard.refetch()}>Tentar novamente</Button></section>;

  const hours = ((study.data?.weekMinutes ?? 0) / 60).toFixed(1);
  const rank = resolveValorantRank(ranking.data?.totalRP ?? 0);
  return <div className="editorial-page space-y-7">
    <header className="editorial-heading flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="eyebrow">Caderno de bordo <span aria-hidden="true">/</span> hoje</p><h1>Bom ritmo para continuar.</h1><p className="lede">Seu panorama do 2B, com próximos passos à vista.</p></div><Link href="/activities"><Button><ListTodo className="size-4" />Ver atividades</Button></Link></header>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Atividades" value={data.summary.total} caption="no quadro da turma" icon={ListTodo} />
      <MetricCard label="Concluídas" value={data.summary.completed} caption={`${data.summary.progress}% do seu progresso`} icon={CheckCircle2} tone="mint" />
      <MetricCard label="Pendentes" value={data.summary.pending} caption="aguardando o próximo passo" icon={CircleDashed} tone="amber" />
      <MetricCard label="Atrasadas" value={data.summary.overdue} caption={data.summary.overdue ? "vale priorizar" : "sem urgências críticas"} icon={AlertTriangle} tone="rose" />
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.45fr_.8fr]">
      <article className="editorial-panel p-0">
        <div className="flex items-end justify-between gap-3 border-b border-border px-5 py-4"><div><p className="eyebrow">Prazos em movimento</p><h2 className="mt-1 font-editorial text-2xl">Próximas atividades</h2></div><Link href="/activities" className="text-xs font-bold text-brand underline-offset-4 hover:underline">Ver todas <ArrowRight className="inline size-3.5" /></Link></div>
        {data.upcoming.length ? <div className="divide-y divide-border">{data.upcoming.map(item => {
          const late = Boolean(item.dueDate && item.dueDate < new Date());
          return <div className="flex items-center gap-3 px-5 py-4" key={item.id}><span className="h-10 w-[3px] shrink-0 rounded-full" style={{ background: late ? "#d95463" : item.subject.color }} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-semibold">{item.title}</p><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{item.priority}</span>{item.attachmentPath && <FileText className="size-3.5 text-brand" aria-label="Tem PDF anexado" />}</div><p className="mt-1 text-xs text-muted-foreground">{item.subject.name} · {item.estimatedMinutes} min</p></div><div className="text-right"><p className={`text-xs font-bold ${late ? "text-rose-300" : "text-foreground"}`}>{item.dueDate && formatDistanceToNow(item.dueDate, { addSuffix: true, locale: ptBR })}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{item.dueDate && format(item.dueDate, "dd MMM", { locale: ptBR })}</p></div></div>;
        })}</div> : <div className="grid min-h-44 place-items-center p-6 text-center"><div><CheckCircle2 className="mx-auto size-8 text-brand" /><p className="mt-3 text-sm font-semibold">Seu quadro está livre.</p><p className="mt-1 text-xs text-muted-foreground">Quando houver novos prazos, eles aparecem aqui.</p></div></div>}
      </article>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
        <Link href="/ranking" className="editorial-panel block transition hover:border-brand/50"><div className="flex items-center justify-between"><span className="eyebrow">Ranqueada · sua divisão</span><Medal className="size-4 text-brand" /></div><p className="mt-3 font-editorial text-3xl" style={{ color: rank.color }}>{rank.label}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{(ranking.data?.totalRP ?? 0).toLocaleString("pt-BR")} RP <span aria-hidden="true">·</span> atividades concluídas</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand">Abrir placar <ArrowRight className="size-3.5" /></span></Link>
        <article className="editorial-panel"><div className="flex items-center justify-between"><span className="eyebrow">Estudo registrado · esta semana</span><Clock3 className="size-4 text-brand" /></div><p className="mt-3 font-mono text-4xl font-bold">{hours}<span className="ml-1 text-base text-muted-foreground">h</span></p><p className="mt-2 text-xs leading-5 text-muted-foreground">{study.data?.streak ? `Sequência atual: ${study.data.streak} dia${study.data.streak > 1 ? "s" : ""}.` : "Comece um bloco de estudo quando fizer sentido para você."}</p><Link href="/focus" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-brand">Abrir modo foco <ArrowRight className="size-3.5" /></Link></article>
      </div>
    </section>

    <section className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <article className="editorial-panel"><div className="flex items-center gap-2"><NotebookPen className="size-4 text-brand" /><p className="eyebrow">Nota rápida · privada</p></div><h2 className="mt-3 font-editorial text-xl">Um lembrete para você</h2><p className="mt-2 min-h-[72px] whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">{note.data?.content.trim() ? note.data.content.slice(0, 260) : "Anote uma dúvida, uma ideia ou o que revisar depois. Sua nota fica no Planner e no botão Nota do topo."}{(note.data?.content.length ?? 0) > 260 ? "…" : ""}</p><Link href="/planner" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand">Abrir Planner <ArrowRight className="size-3.5" /></Link></article>
      <article className="editorial-panel"><div className="mb-3 flex items-center justify-between"><div><p className="eyebrow">Mapa de progresso</p><h2 className="mt-1 font-editorial text-xl">Matérias em andamento</h2></div><TrendingUp className="size-4 text-brand" /></div>{data.subjectProgress.length ? <div className="space-y-4">{data.subjectProgress.slice(0, 5).map(subject => <div key={subject.id}><div className="flex justify-between gap-3 text-xs"><span className="font-semibold">{subject.name}</span><span className="font-mono" style={{ color: subject.color }}>{subject.progress}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full transition-all" style={{ width: `${subject.progress}%`, background: subject.color }} /></div><p className="mt-1 text-[10px] text-muted-foreground">{subject.completed} de {subject.total} concluídas</p></div>)}</div> : <p className="text-sm text-muted-foreground">Adicione uma matéria para acompanhar o progresso.</p>}</article>
    </section>

    <section className="grid gap-5 lg:grid-cols-3">
      <article className="editorial-panel lg:col-span-1"><div className="mb-3"><p className="eyebrow">Distribuição</p><h2 className="mt-1 font-semibold">Por matéria</h2></div><div className="h-48">{data.activityDistribution.length ? <ResponsiveContainer><PieChart><Pie data={data.activityDistribution} dataKey="value" nameKey="name" innerRadius={52} outerRadius={72} paddingAngle={4}>{data.activityDistribution.map(item => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart></ResponsiveContainer> : <div className="grid h-full place-items-center text-sm text-muted-foreground">Ainda sem dados.</div>}</div></article>
      <article className="editorial-panel"><div className="mb-3"><p className="eyebrow">Ritmo da turma</p><h2 className="mt-1 font-semibold">Atividades concluídas</h2></div><div className="h-48"><ResponsiveContainer><BarChart data={data.completionSeries}><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#a8afa3" }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#a8afa3" }} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="concluídas" radius={[5, 5, 1, 1]} fill="var(--brand)" /></BarChart></ResponsiveContainer></div></article>
      <article className="editorial-panel"><div className="mb-3"><p className="eyebrow">Foco</p><h2 className="mt-1 font-semibold">Horas por dia</h2></div><div className="h-48"><ResponsiveContainer><BarChart data={data.studySeries}><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#a8afa3" }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#a8afa3" }} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="horas" radius={[5, 5, 1, 1]} fill="var(--brand)" /></BarChart></ResponsiveContainer></div></article>
    </section>
  </div>;
}
