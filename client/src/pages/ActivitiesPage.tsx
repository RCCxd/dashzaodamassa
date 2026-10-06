import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { firebaseApi } from "@/lib/firebase-api";
import { deleteTaskPdf, downloadTaskPdf, uploadTaskPdf } from "@/lib/blob-client";
import type { Activity, ActivityInput, ActivityType, EditorialStatus, Priority } from "@/lib/firestore-data";
import { isPastDueDate } from "@/lib/ranking";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Archive, Check, Circle, Download, ExternalLink, FileText, Filter, Pencil, Plus, Search, Upload, X } from "lucide-react";
import { nanoid } from "nanoid";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

const types: ActivityType[] = ["tarefa", "prova", "trabalho", "projeto"];
const priorities: Priority[] = ["baixa", "media", "alta"];
const statuses: EditorialStatus[] = ["pendente", "em_andamento", "concluida"];
type FormState = { subjectId: string; title: string; description: string; type: ActivityType; priority: Priority; status: EditorialStatus; dueDate: string; resourceUrl: string; estimatedMinutes: number };
type EditableActivity = Pick<Activity, "id" | "subjectId" | "title" | "description" | "type" | "priority" | "status" | "dueDate" | "resourceUrl" | "estimatedMinutes" | "attachmentPath" | "attachmentName" | "attachmentSize">;
const blankForm = (subjectId = ""): FormState => ({ subjectId, title: "", description: "", type: "tarefa", priority: "media", status: "pendente", dueDate: "", resourceUrl: "", estimatedMinutes: 30 });
const statusLabels: Record<EditorialStatus, string> = { pendente: "Pendente", em_andamento: "Em andamento", concluida: "Concluída" };

function FieldLabel({ children, htmlFor }: { children: string; htmlFor: string }) {
  return <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-bold text-foreground">{children}</label>;
}

function PriorityTag({ priority }: { priority: Priority }) {
  const styles: Record<Priority, string> = { baixa: "bg-emerald-400/10 text-emerald-300", media: "bg-amber-300/10 text-amber-200", alta: "bg-rose-400/10 text-rose-200" };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${styles[priority]}`}>{priority}</span>;
}

export default function ActivitiesPage() {
  const me = firebaseApi.auth.me.useQuery();
  const subjects = firebaseApi.subjects.list.useQuery();
  const [search, setSearch] = useState("");
  const [state, setState] = useState<"todas" | "concluidas" | "pendentes" | "atrasadas">("todas");
  const [subjectId, setSubjectId] = useState("todas");
  const [type, setType] = useState("todas");
  const [priorityFilter, setPriorityFilter] = useState("todas");
  const [deadline, setDeadline] = useState("todas");
  const listInput = { search: search || undefined, state, subjectId: subjectId === "todas" ? undefined : subjectId, type: type === "todas" ? undefined : type as ActivityType, priority: priorityFilter === "todas" ? undefined : priorityFilter as Priority };
  const activities = firebaseApi.activities.list.useQuery(listInput);
  const utils = firebaseApi.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EditableActivity | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(blankForm());
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [removePdf, setRemovePdf] = useState(false);
  const [saving, setSaving] = useState(false);
  const isAdmin = me.data?.role === "admin";
  const subjectOptions = (subjects.data ?? []).filter(subject => !subject.archived);
  const rows = (activities.data ?? []).filter(item => {
    if (deadline === "com_prazo") return Boolean(item.dueDate);
    if (deadline === "sem_prazo") return !item.dueDate;
    if (deadline === "proximos_7") return Boolean(item.dueDate && item.dueDate >= new Date() && item.dueDate <= new Date(Date.now() + 7 * 86_400_000));
    return true;
  });

  const toggle = firebaseApi.completions.toggle.useMutation({
    onError: error => toast.error(error.message),
    onSuccess: result => {
      void utils.activities.list.invalidate();
      void utils.dashboard.summary.invalidate();
      void utils.achievements.list.invalidate();
      void utils.ranking.state.invalidate();
      void utils.ranking.leaderboard.invalidate();
      toast.success(result.completed
        ? `Atividade concluída · +${result.earnedRP} RP${result.lostRP ? ` (correção de saldo anterior: −${result.lostRP} RP)` : ""}.`
        : result.lostRP ? `Atividade reaberta · −${result.lostRP} RP.` : "Atividade reaberta.");
      if (result.latePenaltyCount) {
        toast.warning(result.lateLostRP
          ? `Multa por atraso: −${result.lateLostRP} RP em ${result.latePenaltyCount} atividade${result.latePenaltyCount === 1 ? "" : "s"}.`
          : `Multa por atraso registrada em ${result.latePenaltyCount} atividade${result.latePenaltyCount === 1 ? "" : "s"}; seu saldo já estava em 0 RP.`);
      }
      if (result.newlyUnlocked.length) toast.success("Nova conquista desbloqueada!");
    },
  });
  const archive = firebaseApi.activities.archive.useMutation({
    onSuccess: () => {
      void utils.activities.list.invalidate();
      void utils.dashboard.summary.invalidate();
      toast.success("Atividade arquivada; histórico e pontos foram preservados.");
    },
    onError: error => toast.error(error.message),
  });
  const create = firebaseApi.activities.create.useMutation();
  const update = firebaseApi.activities.update.useMutation();
  const pending = saving || create.isPending || update.isPending;

  const openCreate = () => {
    setEditing(null);
    setForm(blankForm(subjectOptions[0]?.id ?? ""));
    setPdfFile(null);
    setRemovePdf(false);
    setDialogOpen(true);
  };
  const openEdit = (activity: EditableActivity) => {
    setEditing(activity);
    setForm({ subjectId: activity.subjectId, title: activity.title, description: activity.description ?? "", type: activity.type, priority: activity.priority, status: activity.status, dueDate: activity.dueDate ? format(activity.dueDate, "yyyy-MM-dd") : "", resourceUrl: activity.resourceUrl ?? "", estimatedMinutes: activity.estimatedMinutes });
    setPdfFile(null);
    setRemovePdf(false);
    setDialogOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.subjectId) return toast.error("Escolha uma matéria.");
    if (!isAdmin) return toast.error("Somente o administrador pode alterar atividades.");
    const activityId = editing?.id ?? nanoid(14);
    let uploadedPath: string | null = null;
    setSaving(true);
    try {
      const uploaded = pdfFile ? await uploadTaskPdf(pdfFile, activityId) : null;
      uploadedPath = uploaded?.attachmentPath ?? null;
      const currentPath = editing?.attachmentPath ?? null;
      const keepExisting = Boolean(currentPath && !pdfFile && !removePdf);
      const values: ActivityInput = {
        ...form,
        description: form.description || null,
        resourceUrl: form.resourceUrl || null,
        dueDate: form.dueDate ? new Date(`${form.dueDate}T12:00:00`) : null,
        attachmentPath: uploaded?.attachmentPath ?? (keepExisting ? currentPath : null),
        attachmentName: uploaded?.attachmentName ?? (keepExisting ? editing?.attachmentName ?? null : null),
        attachmentSize: uploaded?.attachmentSize ?? (keepExisting ? editing?.attachmentSize ?? null : null),
      };
      if (editing) await update.mutateAsync({ id: activityId, ...values });
      else await create.mutateAsync({ id: activityId, ...values });

      if (currentPath && (uploaded || removePdf)) {
        try { await deleteTaskPdf(currentPath, activityId); }
        catch { toast.warning("A atividade foi salva; o PDF anterior não foi removido do Blob."); }
      }
      setDialogOpen(false);
      setPdfFile(null);
      setRemovePdf(false);
    } catch (error) {
      if (uploadedPath) {
        try { await deleteTaskPdf(uploadedPath, activityId); } catch { /* arquivo órfão pode ser limpo no painel Blob */ }
      }
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a atividade.");
    } finally {
      setSaving(false);
    }
  };

  const archiveActivity = async () => {
    if (!deleting) return;
    try {
      await archive.mutateAsync({ id: deleting });
    } catch {
      // A mutation já mostra a falha via onError; evita promise não tratada no handler do diálogo.
    } finally {
      setDeleting(null);
    }
  };

  const handlePdfDownload = (activity: Activity) => {
    if (!activity.attachmentPath) return;
    void downloadTaskPdf(activity.attachmentPath, activity.id, activity.attachmentName ?? "atividade.pdf").catch(error => toast.error(error instanceof Error ? error.message : "Não foi possível abrir o PDF."));
  };

  const counts = useMemo(() => ({ total: rows.length, overdue: rows.filter(item => !item.completed && item.status !== "concluida" && !item.archived && !item.subject.archived && isPastDueDate(item.dueDate)).length }), [rows]);

  return <div className="editorial-page space-y-7">
    <header className="editorial-heading flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div><p className="eyebrow">Caderno da turma <span aria-hidden="true">/</span> {counts.total} itens</p><h1 className="font-editorial mt-1 text-4xl sm:text-5xl">Atividades</h1><p className="lede">A lista de trabalho do 2B. Marque o que terminou e siga para o próximo passo.</p></div>
      {isAdmin && <Button className="self-start md:self-auto" onClick={openCreate}><Plus className="size-4" />Nova atividade</Button>}
    </header>

    <section className="editorial-panel grid gap-2 p-3 md:grid-cols-3 xl:grid-cols-[1.5fr_repeat(5,minmax(110px,.7fr)]">
      <div className="relative"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={event => setSearch(event.target.value)} className="pl-9" placeholder="Buscar atividade ou matéria" aria-label="Buscar atividade ou matéria" /></div>
      <select value={subjectId} onChange={event => setSubjectId(event.target.value)} className="h-9 rounded-md border border-input bg-card px-3 text-sm"><option value="todas">Todas as matérias</option>{subjectOptions.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select>
      <select value={type} onChange={event => setType(event.target.value)} className="h-9 rounded-md border border-input bg-card px-3 text-sm"><option value="todas">Todos os tipos</option>{types.map(option => <option key={option} value={option}>{option}</option>)}</select>
      <select value={priorityFilter} onChange={event => setPriorityFilter(event.target.value)} className="h-9 rounded-md border border-input bg-card px-3 text-sm"><option value="todas">Prioridades</option>{priorities.map(option => <option key={option} value={option}>{option}</option>)}</select>
      <select value={deadline} onChange={event => setDeadline(event.target.value)} className="h-9 rounded-md border border-input bg-card px-3 text-sm"><option value="todas">Todos os prazos</option><option value="proximos_7">Próximos 7 dias</option><option value="com_prazo">Com prazo</option><option value="sem_prazo">Sem prazo</option></select>
      <select value={state} onChange={event => setState(event.target.value as typeof state)} className="h-9 rounded-md border border-input bg-card px-3 text-sm"><option value="todas">Todos os estados</option><option value="pendentes">Pendentes</option><option value="concluidas">Concluídas por mim</option><option value="atrasadas">Atrasadas</option></select>
    </section>

    <section className="editorial-panel p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3"><p className="eyebrow">Quadro de tarefas <span aria-hidden="true">/</span> compartilhado pela turma</p><p className="font-mono text-[10px] text-muted-foreground">{counts.overdue ? `${counts.overdue} em atraso` : "sem urgências críticas"}</p></div>
      {activities.isLoading ? <div className="space-y-3 p-5">{[1, 2, 3].map(item => <div key={item} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div>
        : rows.length ? <div className="divide-y divide-border">{rows.map(activity => {
          const overdue = !activity.completed && activity.status !== "concluida" && isPastDueDate(activity.dueDate);
          const closedByAdmin = !activity.completed && activity.status === "concluida";
          return <article key={activity.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
            <button type="button" onClick={() => toggle.mutate({ activityId: activity.id })} disabled={toggle.isPending || closedByAdmin} title={closedByAdmin ? "Encerrada pelo administrador; não pode ser concluída." : undefined} className={`grid size-7 shrink-0 place-items-center rounded-full border-2 transition disabled:cursor-not-allowed disabled:opacity-40 ${activity.completed ? "border-brand bg-brand text-brand-foreground" : "border-muted-foreground/40 text-transparent hover:border-brand"}`} aria-label={closedByAdmin ? `${activity.title} foi encerrada pelo administrador` : activity.completed ? `Reabrir ${activity.title}` : `Concluir ${activity.title}`}>{activity.completed ? <Check className="size-4" /> : <Circle className="size-3" />}</button>
            <span className="hidden h-9 w-[3px] shrink-0 rounded-full sm:block" style={{ background: activity.subject.color }} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><h2 className={`font-semibold ${activity.completed ? "text-muted-foreground line-through" : ""}`}>{activity.title}</h2><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{activity.type}</span><PriorityTag priority={activity.priority} />{(activity.archived || activity.subject.archived) && <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/10 px-2 py-0.5 text-[10px] font-bold text-amber-100"><Archive className="size-3" />Arquivada</span>}{activity.attachmentPath && <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand"><FileText className="size-3" />PDF</span>}</div>
              <p className="mt-1 truncate text-xs text-muted-foreground">{activity.subject.name}{activity.description ? ` · ${activity.description}` : ""}</p>
            </div>
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <div className="text-right"><p className={`text-xs font-bold ${overdue ? "text-rose-300" : "text-foreground"}`}>{activity.dueDate ? format(activity.dueDate, "dd MMM", { locale: ptBR }) : "Sem prazo"}</p><p className="mt-1 text-[10px] text-muted-foreground">{activity.estimatedMinutes} min · {statusLabels[activity.status]}</p></div>
              <div className="flex items-center gap-1">
                {activity.attachmentPath && <button type="button" onClick={() => handlePdfDownload(activity)} className="editorial-icon-button size-8 p-0" aria-label={`Baixar ${activity.attachmentName ?? "PDF da atividade"}`} title="Baixar PDF"><Download className="size-4" /></button>}
                {activity.resourceUrl && <a href={activity.resourceUrl} target="_blank" rel="noreferrer" className="editorial-icon-button size-8 p-0" aria-label="Abrir link de apoio"><ExternalLink className="size-4" /></a>}
                {isAdmin && !activity.archived && <><button type="button" onClick={() => openEdit(activity)} className="editorial-icon-button size-8 p-0" aria-label="Editar atividade"><Pencil className="size-4" /></button><button type="button" onClick={() => setDeleting(activity.id)} className="editorial-icon-button size-8 p-0" aria-label="Arquivar atividade" title="Arquivar atividade"><Archive className="size-4" /></button></>}
              </div>
            </div>
          </article>;
        })}</div> : <div className="grid min-h-64 place-items-center p-8 text-center"><div><Filter className="mx-auto size-8 text-brand" /><h2 className="mt-3 font-editorial text-xl">Nenhuma atividade nesta lista.</h2><p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros ou aguarde o próximo combinado do 2B.</p>{isAdmin && <Button variant="outline" className="mt-4" onClick={openCreate}>Criar atividade</Button>}</div></div>}
    </section>

    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle className="font-editorial text-2xl">{editing ? "Editar atividade" : "Nova atividade"}</DialogTitle><DialogDescription>Deixe claro o próximo passo para a turma.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="mt-2 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><FieldLabel htmlFor="activity-title">Título</FieldLabel><Input id="activity-title" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="Ex.: Resolver lista 3" required maxLength={160} /></div>
          <div className="sm:col-span-2"><FieldLabel htmlFor="activity-description">Descrição</FieldLabel><Textarea id="activity-description" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Instruções, conteúdo ou critério de entrega" maxLength={2000} /></div>
          <div><FieldLabel htmlFor="activity-subject">Matéria</FieldLabel><select id="activity-subject" value={form.subjectId} onChange={event => setForm({ ...form, subjectId: event.target.value })} className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm" required><option value="">Selecione</option>{subjectOptions.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></div>
          <div><FieldLabel htmlFor="activity-type">Tipo</FieldLabel><select id="activity-type" value={form.type} onChange={event => setForm({ ...form, type: event.target.value as ActivityType })} className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm">{types.map(option => <option key={option} value={option}>{option}</option>)}</select></div>
          <div><FieldLabel htmlFor="activity-priority">Prioridade (define RP)</FieldLabel><select id="activity-priority" value={form.priority} onChange={event => setForm({ ...form, priority: event.target.value as Priority })} className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm">{priorities.map(option => <option key={option} value={option}>{option}</option>)}</select></div>
          <div><FieldLabel htmlFor="activity-status">Status do quadro</FieldLabel><select id="activity-status" value={form.status} onChange={event => setForm({ ...form, status: event.target.value as EditorialStatus })} className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm">{statuses.map(option => <option key={option} value={option}>{statusLabels[option]}</option>)}</select></div>
          <div><FieldLabel htmlFor="activity-due-date">Prazo</FieldLabel><Input id="activity-due-date" type="date" value={form.dueDate} onChange={event => setForm({ ...form, dueDate: event.target.value })} /></div>
          <div><FieldLabel htmlFor="activity-estimate">Estimativa (minutos)</FieldLabel><Input id="activity-estimate" type="number" min={5} max={1440} value={form.estimatedMinutes} onChange={event => setForm({ ...form, estimatedMinutes: Number(event.target.value) })} /></div>
          <div className="sm:col-span-2"><FieldLabel htmlFor="activity-resource-url">Link de apoio (opcional)</FieldLabel><Input id="activity-resource-url" type="url" value={form.resourceUrl} onChange={event => setForm({ ...form, resourceUrl: event.target.value })} placeholder="https://" /></div>
          <div className="sm:col-span-2 rounded-xl border border-dashed border-border p-4">
            <FieldLabel htmlFor="activity-pdf">Arquivo PDF da tarefa</FieldLabel>
            {editing?.attachmentPath && !removePdf && !pdfFile && <div className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2"><span className="flex min-w-0 items-center gap-2 truncate text-xs"><FileText className="size-4 shrink-0 text-brand" /><span className="truncate">{editing.attachmentName}</span><span className="shrink-0 text-muted-foreground">{Math.max(1, Math.round((editing.attachmentSize ?? 0) / 1024))} KB</span></span><button type="button" onClick={() => setRemovePdf(true)} className="editorial-icon-button size-7 p-0" aria-label="Remover PDF atual"><X className="size-3.5" /></button></div>}
            {removePdf && <p className="mb-3 text-xs text-amber-200">O anexo atual será removido ao salvar. Você pode selecionar outro PDF abaixo.</p>}
            <Input id="activity-pdf" type="file" accept="application/pdf,.pdf" onChange={event => setPdfFile(event.target.files?.[0] ?? null)} className="file:mr-3 file:rounded-md file:border-0 file:bg-brand/10 file:px-3 file:py-1 file:text-xs file:font-bold file:text-brand" aria-label="Selecionar PDF" />
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Apenas PDF até 10 MB. O arquivo fica em armazenamento privado; anexe apenas materiais que a turma pode acessar.</p>
            {pdfFile && <p className="mt-2 flex items-center gap-2 text-xs text-brand"><Upload className="size-3.5" />{pdfFile.name} · {Math.max(1, Math.round(pdfFile.size / 1024))} KB <button type="button" className="underline" onClick={() => setPdfFile(null)}>remover seleção</button></p>}
          </div>
          <div className="flex justify-end gap-2 pt-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit" disabled={pending}>{pending ? "Salvando…" : editing ? "Salvar alterações" : "Criar atividade"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog open={deleting !== null} onOpenChange={open => !open && setDeleting(null)}><DialogContent><DialogHeader><DialogTitle className="font-editorial text-2xl">Arquivar atividade?</DialogTitle><DialogDescription>Ela sai das listas de tarefas pendentes, mas o histórico é mantido. Quem já concluiu poderá reabri-la para retirar os RP; o PDF também continua guardado.</DialogDescription></DialogHeader><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDeleting(null)}>Cancelar</Button><Button onClick={() => void archiveActivity()} disabled={archive.isPending}>{archive.isPending ? "Arquivando…" : "Arquivar"}</Button></div></DialogContent></Dialog>
  </div>;
}
