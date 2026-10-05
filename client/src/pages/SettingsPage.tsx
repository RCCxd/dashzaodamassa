import { Button } from "@/components/ui/button";
import { firebaseApi } from "@/lib/firebase-api";
import { Download, FileJson, FileSpreadsheet, LogOut, Moon, Palette, Rows3 } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";

function downloadFile(content: string, name: string, type: string) { const blob = new Blob([content], { type }); const href = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = href; link.download = name; link.click(); window.setTimeout(() => URL.revokeObjectURL(href), 1000); }

const accents = [
  { id: "lime", label: "Marca-texto", color: "#B7E36A" },
  { id: "indigo", label: "Índigo", color: "#9AABFF" },
  { id: "coral", label: "Coral", color: "#FF9A78" },
  { id: "violet", label: "Violeta", color: "#C3A1FF" },
] as const;
const surfaces = [
  { id: "graphite", label: "Grafite", sample: "#1A1E1D" },
  { id: "ink", label: "Tinta azul", sample: "#172126" },
  { id: "plum", label: "Ameixa", sample: "#201A1E" },
] as const;

export default function SettingsPage() {
  const theme = useTheme();
  const exportData = firebaseApi.export.data.useQuery(undefined, { enabled: false });
  const logout = firebaseApi.auth.logout.useMutation({ onSuccess: () => window.location.assign("/") });
  const updatePreference = (patch: Partial<typeof theme.preferences>) => theme.updatePreferences({ ...theme.preferences, ...patch });
  const runExport = async (kind: "json" | "csv") => {
    try {
      const result = await exportData.refetch();
      if (!result.data) return toast.error("Não foi possível preparar a exportação.");
      downloadFile(kind === "json" ? result.data.json : result.data.csv, `${result.data.fileName}.${kind}`, kind === "json" ? "application/json" : "text/csv;charset=utf-8");
      toast.success("Arquivo exportado.");
    } catch {
      toast.error("A exportação falhou. Tente novamente.");
    }
  };
  return <div className="editorial-page max-w-4xl space-y-8">
    <header className="editorial-heading"><p className="eyebrow">Conta <span aria-hidden="true">/</span> visual e dados</p><h1>Ajustes</h1><p className="lede">Escolha como quer ler o seu caderno. Todas as opções são guardadas só nesta conta.</p></header>

    <section className="editorial-panel">
      <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand"><Palette className="size-4" /></span><div><h2 className="font-semibold">Cor de destaque</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Botões, marcadores e posição ativa no menu.</p></div></div>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{accents.map(option => <button type="button" key={option.id} onClick={() => updatePreference({ accent: option.id })} aria-pressed={theme.preferences.accent === option.id} className={`flex min-h-12 items-center gap-2 rounded-lg border px-3 text-left text-xs font-semibold transition ${theme.preferences.accent === option.id ? "border-brand bg-brand/10" : "border-border hover:border-muted-foreground/50"}`}><span className="size-4 rounded-full border border-black/15" style={{ backgroundColor: option.color }} />{option.label}</button>)}</div>
    </section>

    <section className="editorial-panel">
      <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand"><Moon className="size-4" /></span><div><h2 className="font-semibold">Modo escuro permanente</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">O 2B permanece escuro em todas as telas. Escolha apenas a tonalidade de fundo.</p></div></div>
      <div className="mt-5 grid gap-2 sm:grid-cols-3">{surfaces.map(option => <button type="button" key={option.id} onClick={() => updatePreference({ surface: option.id })} aria-pressed={theme.preferences.surface === option.id} className={`flex min-h-16 items-center gap-3 rounded-lg border p-3 text-left transition ${theme.preferences.surface === option.id ? "border-brand bg-brand/10" : "border-border hover:border-muted-foreground/50"}`}><span className="size-8 rounded-md border border-white/15" style={{ backgroundColor: option.sample }} /><span className="text-xs font-semibold">{option.label}</span></button>)}</div>
    </section>

    <section className="editorial-panel flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand"><Rows3 className="size-4" /></span><div><h2 className="font-semibold">Textura de caderno</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Uma grade bem sutil no fundo, sem esconder o conteúdo.</p></div></div>
      <div className="flex flex-wrap gap-2"><div className="flex gap-2">{(["plain", "grid"] as const).map(value => <Button key={value} type="button" size="sm" variant={theme.preferences.texture === value ? "default" : "outline"} aria-pressed={theme.preferences.texture === value} onClick={() => updatePreference({ texture: value })}>{value === "plain" ? "Lisa" : "Quadriculada"}</Button>)}</div><div className="flex gap-2">{(["comfortable", "compact"] as const).map(value => <Button key={value} type="button" size="sm" variant={theme.preferences.density === value ? "default" : "outline"} aria-pressed={theme.preferences.density === value} onClick={() => updatePreference({ density: value })}>{value === "comfortable" ? "Confortável" : "Compacta"}</Button>)}</div></div>
    </section>

    <section className="editorial-panel">
      <div><h2 className="font-semibold">Exportar meus dados</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Baixe atividades, horários de estudo, nota rápida, metas e conquistas em um formato portátil.</p></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => runExport("json")} className="flex items-center gap-3 rounded-lg border border-border p-4 text-left transition hover:border-brand hover:bg-brand/5"><span className="grid size-10 place-items-center rounded-lg bg-brand/10 text-brand"><FileJson className="size-5" /></span><span><span className="block text-sm font-bold">JSON</span><span className="mt-0.5 block text-xs text-muted-foreground">Backup estruturado</span></span><Download className="ml-auto size-4 text-muted-foreground" /></button><button type="button" onClick={() => runExport("csv")} className="flex items-center gap-3 rounded-lg border border-border p-4 text-left transition hover:border-brand hover:bg-brand/5"><span className="grid size-10 place-items-center rounded-lg bg-brand/10 text-brand"><FileSpreadsheet className="size-5" /></span><span><span className="block text-sm font-bold">CSV</span><span className="mt-0.5 block text-xs text-muted-foreground">Planilha de atividades</span></span><Download className="ml-auto size-4 text-muted-foreground" /></button></div>
    </section>

    <section className="flex flex-col justify-between gap-4 rounded-xl border border-rose-400/20 bg-rose-400/[.04] p-5 sm:flex-row sm:items-center"><div><h2 className="font-semibold text-rose-200">Encerrar sessão</h2><p className="mt-1 text-sm text-rose-200/70">Sai da sua conta neste navegador.</p></div><Button variant="destructive" onClick={() => logout.mutate()} disabled={logout.isPending}><LogOut className="size-4" />{logout.isPending ? "Saindo…" : "Sair da conta"}</Button></section>
  </div>;
}
