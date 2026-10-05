import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FirebaseAuthProvider, useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { firebaseConfigured, missingFirebaseConfig } from "@/lib/firebase";
import LoginPage from "@/pages/LoginPage";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const ActivitiesPage = lazy(() => import("@/pages/ActivitiesPage"));
const SubjectsPage = lazy(() => import("@/pages/SubjectsPage"));
const FocusPage = lazy(() => import("@/pages/FocusPage"));
const RankingPage = lazy(() => import("@/pages/RankingPage"));
const AchievementsPage = lazy(() => import("@/pages/AchievementsPage"));
const PlannerPage = lazy(() => import("@/pages/PlannerPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function AuthenticatedRoutes() {
  return <Suspense fallback={<div className="grid min-h-64 place-items-center"><span className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin text-brand" />Abrindo seu caderno…</span></div>}><Switch>
    <Route path="/" component={DashboardPage} />
    <Route path="/activities" component={ActivitiesPage} />
    <Route path="/subjects" component={SubjectsPage} />
    <Route path="/focus" component={FocusPage} />
    <Route path="/ranking" component={RankingPage} />
    <Route path="/achievements" component={AchievementsPage} />
    <Route path="/planner" component={PlannerPage} />
    <Route path="/settings" component={SettingsPage} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch></Suspense>;
}

function FirebaseSetupNotice() {
  return <main className="app-frame grid min-h-screen place-items-center p-6"><section className="editorial-panel w-full max-w-2xl p-7 sm:p-10"><span className="brand-monogram">2B</span><p className="eyebrow mt-6">Configuração necessária</p><h1 className="mt-2 font-editorial text-3xl">Falta conectar o Firebase</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">A interface está carregada, mas as variáveis públicas do Firebase não foram configuradas neste deploy. Adicione-as na Vercel e faça um novo deploy.</p><p className="eyebrow mt-5">Variáveis ausentes</p><code className="mt-2 block break-words rounded-lg bg-muted p-4 font-mono text-xs text-brand">{missingFirebaseConfig.map(name => `VITE_FIREBASE_${name.replace(/[A-Z]/g, letter => `_${letter}`).toUpperCase()}`).join(" · ")}</code><p className="mt-5 text-xs leading-5 text-muted-foreground">No Firebase, habilite Authentication por e-mail/senha e crie o Firestore. Não coloque chaves de conta de serviço neste front-end.</p></section></main>;
}

function AppContent() {
  const auth = useFirebaseAuth();
  const [location] = useLocation();
  if (!firebaseConfigured) return <FirebaseSetupNotice />;
  if (auth.loading) return <div className="app-frame grid min-h-screen place-items-center"><Loader2 className="size-7 animate-spin text-brand" /></div>;
  if (auth.user && auth.profileError) return <main className="app-frame grid min-h-screen place-items-center p-6"><section className="editorial-panel max-w-lg p-8 text-center"><h1 className="font-editorial text-2xl">Não foi possível abrir seu perfil</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">{auth.profileError}</p><button className="mt-5 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-brand-foreground" onClick={() => void auth.refreshProfile()}>Tentar novamente</button></section></main>;
  if (!auth.user || !auth.profile || location === "/login") return <LoginPage />;
  return <AppShell user={auth.profile}><AuthenticatedRoutes /></AppShell>;
}

export default function App() {
  return <ErrorBoundary><FirebaseAuthProvider><ThemeProvider><TooltipProvider><Toaster richColors position="top-right" /><AppContent /></TooltipProvider></ThemeProvider></FirebaseAuthProvider></ErrorBoundary>;
}
