import { Progress } from "@/components/ui/progress";
import { firebaseApi } from "@/lib/firebase-api";
import { Award, BookOpenCheck, CalendarDays, CheckCheck, Flame, GraduationCap, Medal, NotebookPen, Sparkles, Timer, Trophy } from "lucide-react";
import { Link } from "wouter";

const icons = { Sparkles, BookOpenCheck, CheckCheck, NotebookPen, Medal, Trophy, Flame, Timer, GraduationCap, CalendarDays };

export default function AchievementsPage() {
  const achievements = firebaseApi.achievements.list.useQuery();
  const unlocked = achievements.data?.filter(item => item.unlocked).length ?? 0;
  return <div className="editorial-page space-y-8">
    <header className="editorial-heading"><p className="eyebrow">Marcos pessoais <span aria-hidden="true">/</span> progresso real</p><h1>Conquistas</h1><p className="lede">Pequenos marcos para lembrar que constância também merece ser notada.</p></header>
    <section className="rank-hero flex flex-wrap items-center justify-between gap-5"><div><p className="eyebrow text-white/60">Seu mural de progresso</p><p className="mt-2 font-mono text-4xl font-bold"><span className="text-brand">{unlocked}</span><span className="text-white/45"> / {achievements.data?.length ?? 12}</span></p><p className="mt-2 max-w-md text-sm leading-6 text-white/65">Conquistas vêm das atividades e dos seus hábitos de estudo. Nenhuma delas adiciona RP.</p></div><Trophy className="size-12 text-brand" /><Link href="/ranking" className="w-full text-xs font-bold text-brand underline-offset-4 hover:underline sm:w-auto">Ver divisão ranqueada →</Link></section>
    {achievements.isLoading ? <div className="divide-y divide-border border-y border-border">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-20 animate-pulse bg-muted/40" />)}</div> : <section className="divide-y divide-border border-y border-border">{achievements.data?.map(item => {
      const Icon = icons[item.icon as keyof typeof icons] ?? Award;
      const percent = Math.min(100, Math.round((item.progress / item.target) * 100));
      return <article key={item.code} className="grid gap-3 py-4 sm:grid-cols-[42px_1fr_180px] sm:items-center">
        <span className={`grid size-9 place-items-center rounded-lg ${item.unlocked ? "bg-brand/10 text-brand" : "bg-muted text-muted-foreground"}`}><Icon className="size-4.5" /></span>
        <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{item.title}</h2>{item.unlocked && <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand">conquistada</span>}</div><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description} <span className="text-muted-foreground/70">· {item.category === "foco" ? "hábito de estudo" : "atividade"}</span></p></div>
        <div className="flex items-center gap-3 sm:block"><span className="min-w-14 font-mono text-[10px] text-muted-foreground sm:mb-1 sm:block">{item.progress}/{item.target}{item.code === "ten_pomodoro_hours" ? " min" : ""}</span><Progress value={percent} className="h-1.5 flex-1 sm:w-full" /></div>
      </article>;
    })}</section>}
  </div>;
}
