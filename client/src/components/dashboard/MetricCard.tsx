import type { LucideIcon } from "lucide-react";

const tones = {
  brand: "bg-brand/10 text-brand",
  mint: "bg-emerald-400/10 text-emerald-300",
  amber: "bg-amber-300/10 text-amber-200",
  rose: "bg-rose-400/10 text-rose-200",
};

export function MetricCard({ label, value, caption, icon: Icon, tone = "brand" }: { label: string; value: string | number; caption: string; icon: LucideIcon; tone?: keyof typeof tones }) {
  return <article className="editorial-panel flex min-h-[126px] flex-col justify-between p-4 sm:p-5">
    <div className="flex items-start justify-between gap-3"><div><p className="eyebrow">{label}</p><p className="mt-3 font-mono text-3xl font-bold tracking-tight">{value}</p></div><span className={`grid size-9 shrink-0 place-items-center rounded-lg ${tones[tone]}`}><Icon className="size-[18px]" /></span></div>
    <p className="mt-3 text-xs leading-5 text-muted-foreground">{caption}</p>
  </article>;
}
