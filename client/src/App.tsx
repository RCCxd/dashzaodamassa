import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FirebaseAuthProvider, useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { firebaseConfigured, missingFirebaseConfig } from "@/lib/firebase";
import AchievementsPage from "@/pages/AchievementsPage";
import ActivitiesPage from "@/pages/ActivitiesPage";
import DashboardPage from "@/pages/DashboardPage";
import FocusPage from "@/pages/FocusPage";
import LoginPage from "@/pages/LoginPage";
import NotFound from "@/pages/NotFound";
import PlannerPage from "@/pages/PlannerPage";
import SettingsPage from "@/pages/SettingsPage";
import SubjectsPage from "@/pages/SubjectsPage";
import { Loader2 } from "lucide-react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function AuthenticatedRoutes() {
  return <Switch>
    <Route path="/" component={DashboardPage} />
    <Route path="/activities" component={ActivitiesPage} />
    <Route path="/subjects" component={SubjectsPage} />
    <Route path="/focus" component={FocusPage} />
    <Route path="/achievements" component={AchievementsPage} />
    <Route path="/planner" component={PlannerPage} />
    <Route path="/settings" component={SettingsPage} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

function FirebaseSetupNotice() {
  return <main className="grid min-h-screen place-items-center bg-[#10111a] p-6 text-slate-100"><section className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#181a25] p-7 sm:p-10"><span className="grid size-12 place-items-center rounded-2xl bg-[#5B6CFF] font-mono text-xl font-black">2B</span><h1 className="mt-6 text-2xl font-black">Falta conectar o Firebase</h1><p className="mt-3 text-sm leading-6 text-slate-300">A interface está carregada, mas as variáveis públicas do projeto Firebase não foram configuradas neste deploy. Adicione-as na Vercel e faça um novo deploy.</p><p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-400">Variáveis ausentes</p><code className="mt-2 block break-words rounded-xl bg-black/30 p-4 text-xs text-[#B6BEFF]">{missingFirebaseConfig.map(name => `VITE_FIREBASE_${name.replace(/[A-Z]/g, letter => `_${letter}`).toUpperCase()}`).join(" · ")}</code><p className="mt-5 text-xs text-slate-400">No Firebase, habilite Authentication por e-mail/senha e crie o banco Firestore. Não coloque chaves de conta de serviço neste front-end.</p></section></main>;
}

function AppContent() {
  const auth = useFirebaseAuth();
  const [location] = useLocation();
  if (!firebaseConfigured) return <FirebaseSetupNotice />;
  if (auth.loading) return <div className="grid min-h-screen place-items-center bg-[#10111a]"><Loader2 className="size-7 animate-spin text-[#5B6CFF]" /></div>;
  if (auth.user && auth.profileError) return <main className="grid min-h-screen place-items-center bg-[#10111a] p-6 text-slate-100"><section className="max-w-lg rounded-3xl border border-white/10 bg-[#181a25] p-8 text-center"><h1 className="text-xl font-black">Não foi possível abrir seu perfil</h1><p className="mt-3 text-sm leading-6 text-slate-400">{auth.profileError}</p><button className="mt-5 rounded-xl bg-[#5B6CFF] px-4 py-2 text-sm font-bold" onClick={() => void auth.refreshProfile()}>Tentar novamente</button></section></main>;
  if (!auth.user || !auth.profile || location === "/login") return <LoginPage />;
  return <AppShell user={auth.profile}><AuthenticatedRoutes /></AppShell>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider><FirebaseAuthProvider><TooltipProvider><Toaster richColors position="top-right" /><AppContent /></TooltipProvider></FirebaseAuthProvider></ThemeProvider></ErrorBoundary>;
}
