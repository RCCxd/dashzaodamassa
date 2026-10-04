import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-background p-8">
          <section className="flex w-full max-w-xl flex-col items-center rounded-3xl border border-border bg-card p-8 text-center">
            <AlertTriangle size={44} className="mb-5 text-destructive" />
            <h1 className="text-xl font-bold">Não foi possível abrir esta página</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Ocorreu um erro inesperado. Tente recarregar; se continuar, avise o administrador da turma.</p>
            <button
              onClick={() => window.location.reload()}
              className={cn("mt-6 flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground", "hover:opacity-90")}
            >
              <RotateCcw size={16} />
              Recarregar
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
