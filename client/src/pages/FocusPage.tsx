import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { firebaseApi } from "@/lib/firebase-api";
import { nanoid } from "nanoid";
import { Bell, Coffee, Expand, Pause, Play, RotateCcw, Timer, Volume2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type Phase = "focus" | "break";
type SavedTimer = { uid: string; focusMinutes: number; remaining: number; phase: Phase; running: boolean; deadline: number | null; sessionId: string; subjectId?: string | null; activityId?: string | null };
const defaultFocusMinutes = 25;

function ringStyle(remaining: number, total: number) {
  const ratio = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
  return { background: `conic-gradient(var(--brand) ${ratio * 360}deg, rgba(255,255,255,.12) 0deg)` };
}

function playCompletionTone() {
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.setValueAtTime(660, context.currentTime);
    gain.gain.setValueAtTime(0.07, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.55);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.55);
    void context.close();
  } catch { /* áudio é opcional */ }
}

export default function FocusPage() {
  const me = firebaseApi.auth.me.useQuery();
  const uid = me.data?.uid ?? "";
  const [focusMinutes, setFocusMinutes] = useState(defaultFocusMinutes);
  const [custom, setCustom] = useState(defaultFocusMinutes);
  const [remaining, setRemaining] = useState(defaultFocusMinutes * 60);
  const [phase, setPhase] = useState<Phase>("focus");
  const [running, setRunning] = useState(false);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [activityId, setActivityId] = useState<string | null>(null);
  const [restoredUid, setRestoredUid] = useState("");
  const sessionId = useRef(nanoid(24));
  const handledDeadline = useRef<number | null>(null);
  const stats = firebaseApi.study.stats.useQuery(undefined, { refetchInterval: 30_000 });
  const subjects = firebaseApi.subjects.list.useQuery();
  const activities = firebaseApi.activities.list.useQuery();
  const utils = firebaseApi.useUtils();
  const record = firebaseApi.study.record.useMutation({
    onSuccess: result => {
      void utils.study.stats.invalidate();
      void utils.dashboard.summary.invalidate();
      void utils.achievements.list.invalidate();
      toast.success("Bloco de estudo registrado. Ele vale 0 RP.");
      if (result.newlyUnlocked.length) toast.success("Nova conquista de estudo!");
    },
    onError: error => toast.error(error.message),
  });
  const recordSession = record.mutate;

  const breakMinutes = focusMinutes === 50 ? 10 : 5;
  const totalSeconds = (phase === "focus" ? focusMinutes : breakMinutes) * 60;
  const clock = useMemo(() => `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`, [remaining]);
  const localKey = uid ? `dashboard2b-focus:${uid}` : "";

  useEffect(() => {
    if (!uid) {
      setRunning(false);
      setRestoredUid("");
      return;
    }
    let saved: SavedTimer | null = null;
    try { saved = JSON.parse(localStorage.getItem(`dashboard2b-focus:${uid}`) ?? "null") as SavedTimer | null; }
    catch { saved = null; }
    if (!saved || saved.uid !== uid) {
      setFocusMinutes(defaultFocusMinutes);
      setCustom(defaultFocusMinutes);
      setPhase("focus");
      setRemaining(defaultFocusMinutes * 60);
      setDeadline(null);
      setRunning(false);
      setSubjectId(null);
      setActivityId(null);
      sessionId.current = nanoid(24);
    } else {
      const nextPhase = saved.phase === "break" ? "break" : "focus";
      const now = Date.now();
      const elapsed = saved.running && saved.deadline ? Math.ceil((saved.deadline - now) / 1000) : saved.remaining;
      setFocusMinutes(Math.max(1, Math.min(180, saved.focusMinutes)));
      setCustom(Math.max(1, Math.min(180, saved.focusMinutes)));
      setPhase(nextPhase);
      setRemaining(Math.max(0, elapsed));
      setDeadline(saved.running && saved.deadline && elapsed > 0 ? saved.deadline : null);
      setRunning(Boolean(saved.running && saved.deadline && elapsed > 0));
      setSubjectId(saved.subjectId ?? null);
      setActivityId(saved.activityId ?? null);
      sessionId.current = saved.sessionId || nanoid(24);
      if (saved.running && saved.deadline && elapsed <= 0) {
        if (nextPhase === "focus") recordSession({ durationMinutes: saved.focusMinutes, subjectId: saved.subjectId ?? null, activityId: saved.activityId ?? null, kind: "pomodoro", sessionId: saved.sessionId || nanoid(24) });
        setPhase(nextPhase === "focus" ? "break" : "focus");
        setRemaining((nextPhase === "focus" ? (saved.focusMinutes === 50 ? 10 : 5) : saved.focusMinutes) * 60);
        setDeadline(null);
        setRunning(false);
        sessionId.current = nanoid(24);
      }
    }
    setRestoredUid(uid);
  }, [uid, recordSession]);

  useEffect(() => {
    if (!localKey || restoredUid !== uid) return;
    const saved: SavedTimer = { uid, focusMinutes, remaining, phase, running, deadline, sessionId: sessionId.current, subjectId, activityId };
    localStorage.setItem(localKey, JSON.stringify(saved));
  }, [uid, localKey, restoredUid, focusMinutes, remaining, phase, running, deadline, subjectId, activityId]);

  const finishPhase = useCallback(() => {
    if (deadline === null || handledDeadline.current === deadline) return;
    handledDeadline.current = deadline;
    setRunning(false);
    setDeadline(null);
    playCompletionTone();
    if (phase === "focus") {
      recordSession({ durationMinutes: focusMinutes, subjectId, activityId, kind: "pomodoro", sessionId: sessionId.current });
      sessionId.current = nanoid(24);
      setPhase("break");
      setRemaining(breakMinutes * 60);
      toast.success(`Bloco concluído. Pausa de ${breakMinutes} min; nenhum RP foi concedido.`);
    } else {
      setPhase("focus");
      setRemaining(focusMinutes * 60);
      toast.success("Pausa finalizada. Quando quiser, comece outro bloco.");
    }
    try {
      if ("Notification" in window && Notification.permission === "granted") new Notification("Dashboard do 2B", { body: phase === "focus" ? `Bloco concluído. Hora de descansar por ${breakMinutes} min.` : "Pausa concluída. Seu próximo bloco está pronto." });
    } catch { /* a notificação do sistema nunca deve impedir o avanço do ciclo */ }
  }, [deadline, phase, focusMinutes, breakMinutes, subjectId, activityId, recordSession]);

  useEffect(() => {
    if (!running || deadline === null) return;
    const tick = () => {
      const left = Math.ceil((deadline - Date.now()) / 1000);
      if (left <= 0) finishPhase();
      else setRemaining(left);
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [running, deadline, finishPhase]);

  const chooseDuration = (minutes: number) => {
    if (running) return toast.error("Pause o ciclo antes de trocar a duração.");
    setFocusMinutes(minutes);
    setCustom(minutes);
    setPhase("focus");
    setRemaining(minutes * 60);
    setDeadline(null);
    sessionId.current = nanoid(24);
  };
  const toggleTimer = () => {
    if (running) {
      const left = deadline === null ? remaining : Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);
      setDeadline(null);
      setRunning(false);
      return;
    }
    const left = Math.max(1, remaining);
    setRemaining(left);
    handledDeadline.current = null;
    setDeadline(Date.now() + left * 1000);
    setRunning(true);
  };
  const reset = () => {
    setRunning(false);
    setDeadline(null);
    setPhase("focus");
    setRemaining(focusMinutes * 60);
    sessionId.current = nanoid(24);
  };
  const requestNotification = async () => {
    if (!("Notification" in window)) return toast.error("Notificações não são suportadas neste navegador.");
    if (Notification.permission === "denied") return toast.error("Notificações estão bloqueadas nas permissões do navegador.");
    try {
      const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      toast.success(permission === "granted" ? "Avisos ativados para os seus ciclos." : "Avisos não ativados.");
    } catch { toast.error("O navegador não permitiu ativar notificações."); }
  };
  const goFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { toast.error("Não foi possível alternar a tela cheia neste navegador."); }
  };

  return <div className="editorial-page space-y-7">
    <header className="editorial-heading"><p className="eyebrow">Ritmo de estudo <span aria-hidden="true">/</span> ciclos pessoais</p><h1>Modo foco</h1><p className="lede">Trabalhe por blocos, descanse entre eles. O tempo é seu — e não vira RP.</p></header>
    <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
      <article className="rank-hero relative">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2">
          {[25, 50].map(minutes => <button key={minutes} type="button" disabled={running} onClick={() => chooseDuration(minutes)} aria-pressed={focusMinutes === minutes} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${focusMinutes === minutes ? "border-brand bg-brand text-brand-foreground" : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"}`}>{minutes}/{minutes === 25 ? 5 : 10}</button>)}
          <button type="button" disabled={running} onClick={() => chooseDuration(Math.max(1, Math.min(180, custom)))} aria-pressed={![25, 50].includes(focusMinutes)} className={`rounded-full border px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${![25, 50].includes(focusMinutes) ? "border-brand bg-brand text-brand-foreground" : "border-white/15 bg-white/5 text-white/70"}`}>Personalizado</button>
        </div><Button type="button" variant="outline" size="icon" onClick={() => void goFullscreen()} aria-label="Alternar tela cheia" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Expand className="size-4" /></Button></div>
        <div className="mx-auto my-9 grid size-60 place-items-center rounded-full p-3 sm:size-72" style={ringStyle(remaining, totalSeconds)}><div className="grid size-full place-items-center rounded-full bg-[#151918] shadow-inner"><div className="text-center"><Timer className="mx-auto mb-3 size-5 text-brand" /><p className="font-mono text-5xl font-bold tracking-tighter sm:text-6xl" aria-live="polite">{clock}</p><p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-[.18em] text-white/60">{phase === "focus" ? "bloco de foco" : "pausa"}</p></div></div></div>
        <div className="mx-auto flex max-w-sm items-center justify-center gap-3"><Button type="button" onClick={toggleTimer} className="min-w-36">{running ? <><Pause className="size-4" />Pausar</> : <><Play className="size-4" />{remaining < totalSeconds ? "Retomar" : phase === "break" ? "Começar pausa" : "Começar foco"}</>}</Button><Button type="button" variant="outline" onClick={reset} className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" aria-label="Reiniciar ciclo"><RotateCcw className="size-4" />Reiniciar</Button></div>
      </article>
      <aside className="editorial-panel sm:p-7">
        <p className="eyebrow">Intenção do bloco</p><h2 className="mt-2 font-editorial text-2xl">Escolha um próximo passo.</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Associações são opcionais e ajudam a organizar suas estatísticas.</p>
        <div className="mt-6 space-y-4">
          <div><label htmlFor="custom-minutes" className="mb-1.5 block text-xs font-bold">Bloco personalizado (1–180 min)</label><div className="flex gap-2"><Input id="custom-minutes" type="number" min={1} max={180} value={custom} onChange={event => setCustom(Number(event.target.value))} disabled={running} /><Button type="button" variant="outline" onClick={() => chooseDuration(Math.max(1, Math.min(180, custom)))} disabled={running}>Aplicar</Button></div></div>
          <div><label htmlFor="focus-subject" className="mb-1.5 block text-xs font-bold">Matéria</label><select id="focus-subject" disabled={running} className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm" value={subjectId ?? ""} onChange={event => setSubjectId(event.target.value || null)}><option value="">Sem associação</option>{subjects.data?.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></div>
          <div><label htmlFor="focus-activity" className="mb-1.5 block text-xs font-bold">Atividade</label><select id="focus-activity" disabled={running} className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm" value={activityId ?? ""} onChange={event => setActivityId(event.target.value || null)}><option value="">Sem associação</option>{activities.data?.filter(activity => !subjectId || activity.subjectId === subjectId).map(activity => <option key={activity.id} value={activity.id}>{activity.title}</option>)}</select></div>
          <Button type="button" variant="outline" className="w-full justify-start" onClick={() => void requestNotification()}><Bell className="size-4 text-brand" />Ativar aviso do navegador</Button>
          <p className="flex gap-2 rounded-lg bg-muted/50 p-3 text-xs leading-5 text-muted-foreground"><Volume2 className="mt-0.5 size-3.5 shrink-0 text-brand" />Ao concluir foco, seu bloco é registrado uma única vez. O cronômetro e as pausas não somam RP.</p>
        </div>
      </aside>
    </section>
    <section className="grid gap-3 sm:grid-cols-3">
      <article className="editorial-panel"><p className="eyebrow">Estudo registrado</p><p className="mt-2 font-mono text-3xl font-bold">{((stats.data?.totalMinutes ?? 0) / 60).toFixed(1)}<span className="ml-1 text-base text-muted-foreground">h</span></p><p className="mt-1 text-xs text-muted-foreground">tempo total de todas as modalidades</p></article>
      <article className="editorial-panel"><p className="eyebrow">Blocos concluídos</p><p className="mt-2 font-mono text-3xl font-bold">{stats.data?.totalSessions ?? 0}</p><p className="mt-1 text-xs text-muted-foreground">cada bloco salvo pertence só a você</p></article>
      <article className="editorial-panel"><p className="eyebrow">Sequência de estudo</p><p className="mt-2 flex items-center gap-2 font-mono text-3xl font-bold"><Coffee className="size-5 text-amber-200" />{stats.data?.streak ?? 0}<span className="text-base text-muted-foreground">dias</span></p><p className="mt-1 text-xs text-muted-foreground">um dia de cada vez</p></article>
    </section>
  </div>;
}
