import { Award, BookOpen, LayoutDashboard, ListTodo, Medal, NotebookPen, Settings, Timer } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ContextualHelpDialog } from "@/components/ContextualHelpDialog";
import { QuickNoteDialog } from "@/components/QuickNoteDialog";
import { firebaseApi } from "@/lib/firebase-api";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

const navigation = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  { href: "/activities", label: "Atividades", icon: ListTodo },
  { href: "/subjects", label: "Matérias", icon: BookOpen },
  { href: "/focus", label: "Modo foco", icon: Timer },
  { href: "/ranking", label: "Ranqueada", icon: Medal },
  { href: "/achievements", label: "Conquistas", icon: Award },
  { href: "/planner", label: "Planner", icon: NotebookPen },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

type UserProfile = { name: string | null; email: string | null; role: "admin" | "user" | "student" };

export function AppShell({ children, user }: { children: ReactNode; user: UserProfile }) {
  const [location] = useLocation();
  const auth = useFirebaseAuth();
  const utils = firebaseApi.useUtils();
  const historyMigration = firebaseApi.ranking.backfill.useMutation();
  const checkedUid = useRef("");
  const mutationRef = useRef(historyMigration.mutateAsync);
  const utilsRef = useRef(utils);
  mutationRef.current = historyMigration.mutateAsync;
  utilsRef.current = utils;
  const uid = auth.user?.uid ?? "";
  const firstName = user.name?.split(" ")[0] || user.email?.split("@")[0] || "Estudante";

  useEffect(() => {
    if (!uid) {
      checkedUid.current = "";
      return;
    }
    const sessionKey = `${uid}:${user.role}`;
    if (checkedUid.current === sessionKey) return;
    checkedUid.current = sessionKey;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const reconcile = async (notify: boolean) => {
      try {
        const result = await mutationRef.current();
        if (cancelled) return;
        if (result.awarded || result.reversed || result.latePenaltyCount) {
          void utilsRef.current.ranking.state.invalidate();
          void utilsRef.current.ranking.leaderboard.invalidate();
        }
        if (notify && (result.awarded || result.reversed)) {
          const awarded = result.awarded ? `+${result.earnedRP} RP em ${result.awarded} atividade${result.awarded === 1 ? "" : "s"}` : "";
          const reversed = result.reversed ? `−${result.lostRP} RP de ${result.reversed} atividade${result.reversed === 1 ? " reaberta" : "s reabertas"}` : "";
          toast.success(`Histórico ranqueado ajustado: ${[awarded, reversed].filter(Boolean).join("; ")}.`);
        }
        if (notify && result.latePenaltyCount) {
          const activities = `${result.latePenaltyCount} atividade${result.latePenaltyCount === 1 ? "" : "s"}`;
          toast.warning(result.lateLostRP
            ? `Atraso registrado: −${result.lateLostRP} RP em ${activities}. A perda é única e limitada ao seu saldo.`
            : `Atraso registrado em ${activities}. Seu saldo já estava em 0 RP; a multa não será repetida.`);
        }
        if (result.nextPenaltyAt) {
          const delay = Math.max(1_000, Math.min(2_147_000_000, result.nextPenaltyAt.getTime() - Date.now()));
          timer = setTimeout(() => { void reconcile(true); }, delay);
        }
      } catch (error) {
        if (!cancelled) {
          if (notify) toast.error(error instanceof Error ? `Ranqueada não atualizada: ${error.message}` : "Não foi possível atualizar a ranqueada.");
          timer = setTimeout(() => { void reconcile(false); }, 5 * 60_000);
        }
      }
    };

    void reconcile(true);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [uid, user.role]);

  return <div className="app-frame min-h-screen bg-background text-foreground">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[244px] flex-col border-r border-border bg-card px-4 py-6 lg:flex">
      <Link href="/" className="mb-10 flex items-center gap-3 px-2">
        <span className="brand-monogram">2B</span>
        <span><span className="block text-[10px] font-bold uppercase tracking-[.22em] text-muted-foreground">caderno de bordo</span><span className="block font-editorial text-xl">Dashboard do 2B</span></span>
      </Link>
      <p className="eyebrow mb-3 px-3">Turma · 2026</p>
      <nav className="flex flex-1 flex-col gap-1" aria-label="Navegação principal">
        {navigation.map(item => {
          const active = item.href === "/" ? location === "/" : location.startsWith(item.href);
          const Icon = item.icon;
          return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`nav-link ${active ? "nav-link-active" : ""}`}><Icon className="size-[17px]" /><span>{item.label}</span>{active && <i aria-hidden="true" className="nav-link-mark" />}</Link>;
        })}
      </nav>
      <div className="mt-6 border-t border-border pt-4"><p className="font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Uma coisa de cada vez.</p><p className="mt-2 text-xs leading-5 text-muted-foreground">O foco ajuda. As atividades concluídas movem a ranqueada.</p></div>
    </aside>

    <div className="min-h-screen lg:pl-[244px]">
      <header className="sticky top-0 z-20 flex min-h-[68px] items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-md sm:px-7">
        <div className="flex min-w-0 items-center gap-3 lg:hidden"><Link href="/" className="brand-monogram brand-monogram-small">2B</Link><span className="truncate font-editorial text-lg">Caderno do 2B</span></div>
        <div className="hidden lg:block"><p className="eyebrow">Organização de turma <span aria-hidden="true">/</span> {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</p></div>
        <div className="ml-auto flex items-center gap-2">
          <QuickNoteDialog />
          <ContextualHelpDialog route={location} />
          <div className="ml-1 flex items-center gap-2 border-l border-border pl-3">
            <span className="grid size-8 place-items-center rounded-full border border-border bg-surface-alt font-mono text-xs font-bold">{firstName.slice(0, 1).toUpperCase()}</span>
            <span className="hidden max-w-28 truncate text-xs font-semibold sm:block">{firstName}</span>
            <span className={`hidden rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider sm:block ${user.role === "admin" ? "bg-amber-400/15 text-amber-300" : "bg-emerald-400/10 text-emerald-300"}`}>{user.role === "admin" ? "admin" : "aluno"}</span>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1480px] px-4 pt-7 pb-24 sm:px-7 sm:pt-9 lg:px-10 lg:pb-12">{children}</main>
    </div>

    <nav className="mobile-nav fixed inset-x-0 bottom-0 z-30 flex gap-1 overflow-x-auto border-t border-border bg-card/95 px-2 py-2 backdrop-blur-lg lg:hidden" aria-label="Navegação móvel">
      {navigation.map(item => {
        const active = item.href === "/" ? location === "/" : location.startsWith(item.href);
        const Icon = item.icon;
        return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`mobile-nav-link ${active ? "mobile-nav-link-active" : ""}`}><Icon className="size-[17px]" /><span>{item.label.split(" ")[0]}</span></Link>;
      })}
    </nav>
  </div>;
}
