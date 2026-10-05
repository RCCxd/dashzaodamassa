import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CircleHelp } from "lucide-react";

const helpByRoute: Record<string, { title: string; intro: string; points: string[] }> = {
  "/": { title: "Seu panorama", intro: "Um retrato rápido da semana, sem transformar o estudo em corrida.", points: ["Prazos próximos usam a matéria e prioridade cadastradas pelo admin.", "Horas de foco e sequência são pessoais; não geram RP.", "Abra Atividades para concluir uma tarefa e ganhar pontos uma única vez."] },
  "/activities": { title: "Atividades", intro: "A lista reúne o que a turma precisa fazer; sua conclusão é privada.", points: ["Marque o círculo ao terminar. Reabrir uma atividade não retira RP já ganho.", "Prioridade média vale 12 RP, alta 15 RP e baixa 10 RP.", "Os PDFs de apoio são enviados pelo administrador e baixados por uma rota autenticada."] },
  "/subjects": { title: "Grade da semana", intro: "Leia cada coluna como um dia e cada linha como um horário.", points: ["A grade organiza as aulas de segunda a sexta; role na horizontal no celular.", "Somente o administrador altera matérias e horários.", "Sala e professor aparecem junto da matéria quando foram informados."] },
  "/focus": { title: "Modo foco", intro: "Use o temporizador para estudar em blocos com pausas sustentáveis.", points: ["25/5 e 50/10 representam minutos de estudo e descanso.", "O relógio usa o horário final do ciclo e continua correto após mudar de aba.", "Sessões registram seu estudo, mas nunca adicionam RP à classificação."] },
  "/ranking": { title: "Classificação", intro: "Uma escadaria de divisões inspirada no Valorant, feita para reconhecer atividades concluídas.", points: ["Cada atividade concede RP uma vez; o valor segue sua prioridade. Conclusões anteriores também são consideradas uma vez.", "Horas, pausas e sessões do Modo Foco valem zero RP.", "Sua aparição global é opcional e publica apenas o apelido e os RP."] },
  "/achievements": { title: "Conquistas", intro: "Marcos de consistência aparecem conforme as atividades e sessões são registradas.", points: ["As conquistas são calculadas dos seus próprios dados.", "Algumas celebram tarefas; outras celebram hábitos de estudo.", "Conquista e Modo Foco não alteram a pontuação rankeada."] },
  "/planner": { title: "Planner", intro: "Um espaço pessoal para rascunhar e acompanhar metas semanais.", points: ["A nota é salva na sua conta e também pode ser aberta pelo botão Nota do topo.", "Metas e sessões são privadas e não entram no ranking.", "As metas acompanham o tempo e os ciclos registrados nesta conta."] },
  "/settings": { title: "Ajustes", intro: "Personalize a leitura sem perder o modo escuro permanente.", points: ["Cor, superfície, textura e densidade são salvas apenas no seu perfil.", "Você pode exportar seus dados pessoais em JSON ou CSV.", "Sair encerra a sessão no navegador atual."] },
};

export function ContextualHelpDialog({ route }: { route: string }) {
  const help = helpByRoute[route] ?? helpByRoute["/"]!;
  return <Dialog>
    <DialogTrigger asChild>
      <button type="button" className="editorial-icon-button" aria-label={`Ajuda: ${help.title}`} title="Ajuda desta tela"><CircleHelp className="size-4" /><span className="hidden text-xs font-semibold sm:inline">Ajuda</span></button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="font-editorial text-2xl">{help.title}</DialogTitle>
        <DialogDescription>{help.intro}</DialogDescription>
      </DialogHeader>
      <ul className="space-y-3 pt-1">
        {help.points.map(point => <li key={point} className="flex gap-3 text-sm leading-6 text-muted-foreground"><span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />{point}</li>)}
      </ul>
      <div className="flex justify-end pt-2"><DialogTrigger asChild><Button variant="outline">Entendi</Button></DialogTrigger></div>
    </DialogContent>
  </Dialog>;
}
