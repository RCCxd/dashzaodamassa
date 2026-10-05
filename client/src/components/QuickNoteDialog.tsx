import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { firebaseApi } from "@/lib/firebase-api";
import { NotebookPen, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function QuickNoteDialog() {
  const note = firebaseApi.planner.note.useQuery();
  const utils = firebaseApi.useUtils();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const save = firebaseApi.planner.saveNote.useMutation({
    onSuccess: () => {
      void utils.planner.note.invalidate();
      toast.success("Nota salva. Ela continuará disponível no seu Planner.");
      setOpen(false);
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (open && note.data) setContent(note.data.content);
  }, [open, note.data]);

  return <>
    <button type="button" onClick={() => setOpen(true)} className="editorial-icon-button" aria-label="Abrir minhas notas" title="Nota rápida">
      <NotebookPen className="size-4" />
      <span className="hidden text-xs font-semibold sm:inline">Nota</span>
    </button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-editorial text-2xl">Sua nota de bordo</DialogTitle>
          <DialogDescription>Privada para sua conta; a mesma nota aparece no Planner.</DialogDescription>
        </DialogHeader>
        <Textarea value={content} disabled={note.isLoading} onChange={event => setContent(event.target.value)} className="min-h-64 resize-y leading-6" placeholder={note.isLoading ? "Carregando sua nota…" : "Rascunhos, dúvidas ou algo para revisar…"} aria-label="Conteúdo da nota rápida" />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">{note.isLoading ? "Abrindo nota…" : `${content.length}/5.000 caracteres`}</span>
          <Button onClick={() => save.mutate({ content })} disabled={note.isLoading || save.isPending || content.length > 5000}>
            <Save className="size-4" />{save.isPending ? "Salvando…" : "Salvar nota"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
