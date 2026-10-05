import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { firebaseApi } from "@/lib/firebase-api";
import type { Subject, SubjectSlotInput } from "@/lib/firestore-data";
import { Archive, BookOpen, CalendarDays, Clock3, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

const weekdays = [{ day: 1, label: "Segunda" }, { day: 2, label: "Terça" }, { day: 3, label: "Quarta" }, { day: 4, label: "Quinta" }, { day: 5, label: "Sexta" }];
type SlotForm = SubjectSlotInput & { room: string };
type SubjectForm = { name: string; color: string; teacher: string; schedule: string; description: string; weeklySlots: SlotForm[] };
const blankSlot = (): SlotForm => ({ day: 1, startTime: "08:00", endTime: "08:50", room: "" });
const blank = (): SubjectForm => ({ name: "", color: "#B7E36A", teacher: "", schedule: "", description: "", weeklySlots: [] });

export default function SubjectsPage() {
  const me = firebaseApi.auth.me.useQuery();
  const list = firebaseApi.subjects.list.useQuery();
  const utils = firebaseApi.useUtils();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [form, setForm] = useState<SubjectForm>(blank());
  const isAdmin = me.data?.role === "admin";
  const create = firebaseApi.subjects.create.useMutation({ onSuccess: () => { void utils.subjects.list.invalidate(); toast.success("Matéria adicionada à grade."); setOpen(false); } });
  const update = firebaseApi.subjects.update.useMutation({ onSuccess: () => { void utils.subjects.list.invalidate(); toast.success("Matéria e horários atualizados."); setOpen(false); } });
  const archive = firebaseApi.subjects.archive.useMutation({ onSuccess: () => { void utils.subjects.list.invalidate(); void utils.activities.list.invalidate(); void utils.dashboard.summary.invalidate(); toast.success("Matéria arquivada; o histórico de tarefas e RP foi preservado."); }, onError: error => toast.error(error.message) });

  const subjects = (list.data ?? []).filter(subject => !subject.archived);
  const rows = useMemo(() => [...new Set(subjects.flatMap(subject => subject.weeklySlots.map(slot => slot.startTime)))].sort(), [subjects]);
  const slotCount = subjects.reduce((total, subject) => total + subject.weeklySlots.length, 0);
  const startCreate = () => { setEditing(null); setForm(blank()); setOpen(true); };
  const startEdit = (subject: Subject) => {
    setEditing(subject);
    setForm({ name: subject.name, color: subject.color, teacher: subject.teacher ?? "", schedule: subject.schedule ?? "", description: subject.description ?? "", weeklySlots: subject.weeklySlots.map(slot => ({ id: slot.id, day: slot.day, startTime: slot.startTime, endTime: slot.endTime, room: slot.room ?? "" })) });
    setOpen(true);
  };
  const patchSlot = (index: number, change: Partial<SlotForm>) => setForm(current => ({ ...current, weeklySlots: current.weeklySlots.map((slot, slotIndex) => slotIndex === index ? { ...slot, ...change } : slot) }));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const invalid = form.weeklySlots.find(slot => slot.startTime >= slot.endTime);
    if (invalid) return toast.error("O horário de término precisa ser depois do início.");
    const slots: SubjectSlotInput[] = form.weeklySlots.map(({ room, ...slot }) => ({ ...slot, room: room.trim() || null }));
    const values = { name: form.name.trim(), color: form.color, teacher: form.teacher.trim() || null, schedule: form.schedule.trim() || null, description: form.description.trim() || null, weeklySlots: slots };
    if (editing) update.mutate({ id: editing.id, ...values });
    else create.mutate(values);
  };

  return <div className="editorial-page space-y-8">
    <header className="editorial-heading flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div><p className="eyebrow">Horários da turma <span aria-hidden="true">/</span> segunda a sexta</p><h1 className="mt-1 font-editorial text-4xl sm:text-5xl">Matérias</h1><p className="lede">A semana inteira numa folha só. Role para o lado no celular; cada cor identifica uma matéria.</p></div>
      {isAdmin && <Button onClick={startCreate} className="self-start md:self-auto"><Plus className="size-4" />Nova matéria</Button>}
    </header>

    <section className="editorial-panel overflow-hidden p-0">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-5 py-4"><div><p className="eyebrow">Planilha semanal</p><h2 className="mt-1 font-editorial text-2xl">Grade de aulas</h2></div><span className="font-mono text-[10px] text-muted-foreground">{slotCount} {slotCount === 1 ? "horário" : "horários"} cadastrados</span></div>
      {list.isLoading ? <div className="space-y-3 p-5">{[1, 2, 3].map(item => <div key={item} className="h-16 animate-pulse rounded-lg bg-muted" />)}</div>
        : rows.length ? <div className="overflow-x-auto"><table className="timetable-table"><thead><tr><th scope="col">Início</th>{weekdays.map(day => <th scope="col" key={day.day}>{day.label}</th>)}</tr></thead><tbody>{rows.map(time => <tr key={time}><th scope="row" className="font-mono">{time}</th>{weekdays.map(day => {
          const entries = subjects.flatMap(subject => subject.weeklySlots.filter(slot => slot.day === day.day && slot.startTime === time).map(slot => ({ subject, slot })));
          return <td key={day.day}>{entries.map(({ subject, slot }) => <div key={slot.id} className="timetable-entry" style={{ borderLeftColor: subject.color }}><span className="block truncate font-semibold">{subject.name}</span><span className="mt-1 flex items-center gap-1 font-mono text-[10px] text-muted-foreground"><Clock3 className="size-3" />{slot.startTime}–{slot.endTime}</span>{slot.room && <span className="mt-1 block truncate text-[10px] text-muted-foreground">Sala {slot.room}</span>}</div>)}</td>;
        })}</tr>)}</tbody></table></div>
        : <div className="grid min-h-60 place-items-center p-8 text-center"><div><CalendarDays className="mx-auto size-8 text-brand" /><h3 className="mt-3 font-editorial text-xl">A grade ainda não tem horários.</h3><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{isAdmin ? "Edite uma matéria para adicionar dias, horários e salas." : "O administrador ainda não cadastrou a grade semanal."}</p>{isAdmin && <Button className="mt-4" onClick={startCreate}>Adicionar primeira matéria</Button>}</div></div>}
      <p className="border-t border-border px-5 py-3 text-[11px] leading-5 text-muted-foreground">A grade usa dias úteis (segunda a sexta). O campo livre de horário legado fica preservado como observação da matéria.</p>
    </section>

    <section>
      <div className="mb-4 flex items-end justify-between gap-3"><div><p className="eyebrow">Referência</p><h2 className="mt-1 font-editorial text-2xl">Catálogo de matérias</h2></div><span className="font-mono text-[10px] text-muted-foreground">{subjects.length} cadastradas</span></div>
      {subjects.length ? <div className="divide-y divide-border border-y border-border">{subjects.map(subject => <article key={subject.id} className="flex flex-wrap items-start gap-4 py-4">
        <span className="mt-1 size-3 shrink-0 rounded-sm" style={{ background: subject.color }} aria-hidden="true" />
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><h3 className="font-semibold">{subject.name}</h3>{subject.teacher && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><UserRound className="size-3" />{subject.teacher}</span>}</div>{subject.description && <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">{subject.description}</p>}{subject.schedule && <p className="mt-1 text-xs text-muted-foreground">Observação de horário: {subject.schedule}</p>}</div>
        {isAdmin && <div className="flex gap-1"><button type="button" onClick={() => startEdit(subject)} className="editorial-icon-button size-8 p-0" aria-label={`Editar ${subject.name}`}><Pencil className="size-4" /></button><button type="button" onClick={() => setRemoving(subject.id)} className="editorial-icon-button size-8 p-0" aria-label={`Arquivar ${subject.name}`} title="Arquivar matéria"><Archive className="size-4" /></button></div>}
      </article>)}</div> : <p className="py-8 text-center text-sm text-muted-foreground">{isAdmin ? "Crie uma matéria para começar a organizar a turma." : "As matérias criadas pelo administrador aparecerão aqui."}</p>}
    </section>

    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle className="font-editorial text-2xl">{editing ? "Editar matéria" : "Nova matéria"}</DialogTitle><DialogDescription>Cadastre a referência da matéria e seus blocos de aula na semana.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="mt-2 space-y-4">
          <div><label htmlFor="subject-name" className="mb-1.5 block text-xs font-bold">Nome da matéria</label><Input id="subject-name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Matemática" required maxLength={120} /></div>
          <div className="grid grid-cols-[72px_1fr] gap-3"><div><label htmlFor="subject-color" className="mb-1.5 block text-xs font-bold">Cor</label><Input id="subject-color" type="color" className="h-9 p-1" value={form.color} onChange={event => setForm({ ...form, color: event.target.value })} /></div><div><label htmlFor="subject-teacher" className="mb-1.5 block text-xs font-bold">Professor(a)</label><Input id="subject-teacher" value={form.teacher} onChange={event => setForm({ ...form, teacher: event.target.value })} placeholder="Nome do professor" maxLength={120} /></div></div>
          <div className="rounded-xl border border-border p-3 sm:p-4"><div className="mb-3 flex items-center justify-between gap-3"><div><p className="eyebrow">Grade semanal</p><p className="mt-1 text-xs text-muted-foreground">Um bloco por aula. Dia 1 = segunda-feira.</p></div><Button type="button" size="sm" variant="outline" onClick={() => setForm(current => ({ ...current, weeklySlots: [...current.weeklySlots, blankSlot()] }))}><Plus className="size-3.5" />Adicionar bloco</Button></div>
            {form.weeklySlots.length ? <div className="space-y-3">{form.weeklySlots.map((slot, index) => <div key={slot.id ?? `new-${index}`} className="grid gap-2 rounded-lg bg-muted/45 p-3 sm:grid-cols-[1fr_95px_95px_1fr_32px] sm:items-end">
              <div><label htmlFor={`slot-day-${index}`} className="mb-1 block text-[10px] font-bold text-muted-foreground">Dia</label><select id={`slot-day-${index}`} value={slot.day} onChange={event => patchSlot(index, { day: Number(event.target.value) })} className="h-9 w-full rounded-md border border-input bg-card px-2 text-xs">{weekdays.map(day => <option key={day.day} value={day.day}>{day.label}</option>)}</select></div>
              <div><label htmlFor={`slot-start-${index}`} className="mb-1 block text-[10px] font-bold text-muted-foreground">Início</label><Input id={`slot-start-${index}`} type="time" required value={slot.startTime} onChange={event => patchSlot(index, { startTime: event.target.value })} className="px-2 text-xs" /></div>
              <div><label htmlFor={`slot-end-${index}`} className="mb-1 block text-[10px] font-bold text-muted-foreground">Término</label><Input id={`slot-end-${index}`} type="time" required value={slot.endTime} onChange={event => patchSlot(index, { endTime: event.target.value })} className="px-2 text-xs" /></div>
              <div><label htmlFor={`slot-room-${index}`} className="mb-1 block text-[10px] font-bold text-muted-foreground">Sala (opcional)</label><Input id={`slot-room-${index}`} value={slot.room} onChange={event => patchSlot(index, { room: event.target.value })} placeholder="Sala" maxLength={80} className="text-xs" /></div>
              <Button type="button" variant="ghost" size="icon" aria-label="Remover bloco da grade" onClick={() => setForm(current => ({ ...current, weeklySlots: current.weeklySlots.filter((_, slotIndex) => slotIndex !== index) }))}><Trash2 className="size-4" /></Button>
            </div>)}</div> : <p className="rounded-lg bg-muted/45 p-3 text-xs text-muted-foreground">Nenhum bloco. A matéria continuará visível no catálogo.</p>}
          </div>
          <div><label htmlFor="subject-schedule-note" className="mb-1.5 block text-xs font-bold">Observação de horário (legado, opcional)</label><Input id="subject-schedule-note" value={form.schedule} onChange={event => setForm({ ...form, schedule: event.target.value })} placeholder="Ex.: laboratório em semanas alternadas" maxLength={160} /></div>
          <div><label htmlFor="subject-description" className="mb-1.5 block text-xs font-bold">Descrição</label><Textarea id="subject-description" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Objetivos, materiais ou combinados" maxLength={2000} /></div>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={create.isPending || update.isPending}>{create.isPending || update.isPending ? "Salvando…" : editing ? "Salvar matéria" : "Criar matéria"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
    <Dialog open={removing !== null} onOpenChange={next => !next && setRemoving(null)}><DialogContent><DialogHeader><DialogTitle className="font-editorial text-2xl">Arquivar matéria?</DialogTitle><DialogDescription>A matéria sai da grade e das novas atividades. Tarefas concluídas continuam visíveis até cada aluno reabri-las; notas, conclusões e RP não são apagados.</DialogDescription></DialogHeader><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setRemoving(null)}>Cancelar</Button><Button onClick={() => { if (removing) archive.mutate({ id: removing }); setRemoving(null); }} disabled={archive.isPending}>Arquivar</Button></div></DialogContent></Dialog>
  </div>;
}
