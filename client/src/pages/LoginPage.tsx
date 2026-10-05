import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithPassword, registerStudent } from "@/contexts/FirebaseAuthContext";
import { requireAuth } from "@/lib/firebase";
import { ArrowRight, CheckCircle2, ListChecks, Loader2, Timer, Trophy } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

type Mode = "login" | "register";

function authMessage(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code) : "";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") return "E-mail ou senha incorretos.";
  if (code === "auth/email-already-in-use") return "Este e-mail já possui uma conta. Entre ou redefina sua senha.";
  if (code === "auth/weak-password") return "Escolha uma senha mais forte (mínimo de 10 caracteres).";
  if (code === "auth/invalid-email") return "Confira o formato do e-mail.";
  if (code === "auth/too-many-requests") return "Muitas tentativas. Aguarde um pouco e tente novamente.";
  if (code === "auth/network-request-failed") return "Falha de conexão. Verifique sua internet e tente de novo.";
  if (code === "permission-denied" || code === "firestore/permission-denied") return "O Firestore recusou a operação. Confira se as regras foram publicadas.";
  return error instanceof Error ? error.message : "Não foi possível autenticar. Tente novamente.";
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      if (mode === "login") await loginWithPassword(email, password);
      else await registerStudent(name, email, password);
      window.location.replace("/");
    } catch (cause) {
      setError(authMessage(cause));
    } finally {
      setPending(false);
    }
  }

  async function resetPassword() {
    if (!email.trim()) {
      setError("Digite seu e-mail acima para receber o link de redefinição.");
      return;
    }
    setError("");
    setPending(true);
    try {
      await sendPasswordResetEmail(requireAuth(), email.trim().toLowerCase());
      toast.success("Se houver uma conta para esse e-mail, o Firebase enviará as instruções de redefinição.");
    } catch (cause) {
      setError(authMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="app-frame texture-grid grid min-h-screen place-items-center p-4 sm:p-8">
      <section className="w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-card lg:grid lg:grid-cols-[1.12fr_0.88fr]">
        <div className="p-6 sm:p-10 lg:p-14">
          <div className="mb-10 flex items-center gap-3"><span className="brand-monogram">2B</span><span><span className="eyebrow block">caderno de bordo</span><span className="font-editorial text-xl">Dashboard do 2B</span></span></div>
          <p className="eyebrow text-brand">Rotina escolar, sem complicação</p>
          <h1 className="mt-4 max-w-md font-editorial text-4xl leading-[1.05] sm:text-5xl">Seu próximo passo, <span className="text-brand">à vista.</span></h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">Matérias, prazos, notas e estudo em um espaço feito para a rotina real do 2B.</p>

          <div className="mt-8 flex gap-1 rounded-lg bg-muted p-1" role="tablist" aria-label="Acesso">
            <button type="button" role="tab" aria-selected={mode === "login"} aria-controls="auth-form" onClick={() => { setMode("login"); setError(""); }} className={`flex-1 rounded-md px-3 py-2 text-sm font-bold transition ${mode === "login" ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground"}`}>Entrar</button>
            <button type="button" role="tab" aria-selected={mode === "register"} aria-controls="auth-form" onClick={() => { setMode("register"); setError(""); }} className={`flex-1 rounded-md px-3 py-2 text-sm font-bold transition ${mode === "register" ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground"}`}>Criar conta</button>
          </div>

          <form id="auth-form" className="mt-5 space-y-4" onSubmit={submit}>
            {mode === "register" && <div className="space-y-2"><Label htmlFor="name">Nome</Label><Input id="name" autoComplete="name" required minLength={2} maxLength={120} value={name} onChange={event => setName(event.target.value)} className="bg-card" placeholder="Seu nome" /></div>}
            <div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" autoComplete="email" required maxLength={320} value={email} onChange={event => setEmail(event.target.value)} className="bg-card" placeholder="voce@exemplo.com" /></div>
            <div className="space-y-2"><Label htmlFor="password">Senha</Label><Input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "register" ? 10 : 1} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} className="bg-card" placeholder={mode === "register" ? "Pelo menos 10 caracteres" : "Sua senha"} /></div>
            {mode === "register" && <p className="text-xs leading-5 text-muted-foreground">Cadastro aberto: novas contas entram como aluno. A senha deve ter pelo menos 10 caracteres.</p>}
            {mode === "login" && <button type="button" className="text-xs font-semibold text-brand underline-offset-4 hover:underline" disabled={pending} onClick={resetPassword}>Esqueci minha senha</button>}
            {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200">{error}</p>}
            <Button type="submit" size="lg" disabled={pending} className="h-12 w-full rounded-xl px-5">
              {pending ? <Loader2 className="size-4 animate-spin" /> : <>{mode === "login" ? "Entrar no Dashboard" : "Criar minha conta"}<ArrowRight className="size-4" /></>}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">Login pelo Firebase Authentication.</p>
        </div>
        <div className="border-t border-border bg-surface-alt p-6 sm:p-10 lg:border-l lg:border-t-0 lg:p-14">
          <p className="eyebrow text-brand">O essencial da semana</p>
          <div className="mt-8 space-y-6">
            {[
              [ListChecks, "Prazos no lugar", "Organize matérias e marque cada tarefa que terminou."],
              [Timer, "Foco com pausa", "Registre blocos de estudo e respeite seu descanso."],
              [Trophy, "Progresso justo", "Atividades concluídas dão RP; o tempo de foco não."],
            ].map(([Icon, title, text]) => {
              const FeatureIcon = Icon as typeof CheckCircle2;
              return <div key={title as string} className="flex gap-4"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand"><FeatureIcon className="size-4.5" /></span><div><h2 className="font-semibold">{title as string}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{text as string}</p></div></div>;
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
