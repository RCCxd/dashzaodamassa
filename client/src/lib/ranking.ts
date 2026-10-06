import type { ActivityType, Priority } from "@/lib/firestore-data";

const DIVISIONS = ["I", "II", "III"] as const;
const RANK_GROUPS = [
  { name: "Ferro", color: "#8f969e" },
  { name: "Bronze", color: "#bc7b52" },
  { name: "Prata", color: "#a9b4c4" },
  { name: "Ouro", color: "#d9b24c" },
  { name: "Platina", color: "#55c8b2" },
  { name: "Diamante", color: "#7ca9ed" },
  { name: "Ascendente", color: "#64bd75" },
  { name: "Imortal", color: "#ce6677" },
] as const;

export const RP_PER_DIVISION = 50;
export const RADIANT_START_RP = RANK_GROUPS.length * DIVISIONS.length * RP_PER_DIVISION;
const TYPE_BONUS: Record<ActivityType, number> = { tarefa: 0, prova: 5, trabalho: 3, projeto: 4 };
export const LATE_PENALTY_RP = 5;
export const DUE_DATE_GRACE_HOURS = 12;

export function latePenaltyLoss(totalRP: number): number {
  const balance = Math.max(0, Math.trunc(Number.isFinite(totalRP) ? totalRP : 0));
  return Math.min(LATE_PENALTY_RP, balance);
}

export function deadlineAtEndOfDueDate(dueDate: Date): Date {
  return new Date(dueDate.getTime() + DUE_DATE_GRACE_HOURS * 60 * 60 * 1000);
}

export function isPastDueDate(dueDate: Date | null, now = new Date()): boolean {
  return dueDate !== null && now.getTime() > deadlineAtEndOfDueDate(dueDate).getTime();
}

export type ValorantRank = {
  label: string;
  group: string;
  division: string | null;
  color: string;
  totalRP: number;
  rr: number;
  nextThreshold: number | null;
};

/** RP combinam prioridade e tipo; Pomodoro, sessões livres e tempo de foco nunca entram nesta conta. */
export function pointsForActivity(priority: Priority, type: ActivityType = "tarefa"): number {
  const priorityPoints = 10 + (priority === "alta" ? 5 : priority === "media" ? 2 : 0);
  return priorityPoints + TYPE_BONUS[type];
}

export function resolveValorantRank(rawTotalRP: number): ValorantRank {
  const totalRP = Math.max(0, Math.floor(Number.isFinite(rawTotalRP) ? rawTotalRP : 0));
  if (totalRP >= RADIANT_START_RP) {
    return {
      label: "Radiante",
      group: "Radiante",
      division: null,
      color: "#f4d56f",
      totalRP,
      rr: totalRP - RADIANT_START_RP,
      nextThreshold: null,
    };
  }
  const tierIndex = Math.floor(totalRP / RP_PER_DIVISION);
  const group = RANK_GROUPS[Math.floor(tierIndex / DIVISIONS.length)];
  const division = DIVISIONS[tierIndex % DIVISIONS.length];
  return {
    label: `${group.name} ${division}`,
    group: group.name,
    division,
    color: group.color,
    totalRP,
    rr: totalRP % RP_PER_DIVISION,
    nextThreshold: (tierIndex + 1) * RP_PER_DIVISION,
  };
}

export function progressToNextRank(rank: ValorantRank): number {
  if (rank.nextThreshold === null) return 100;
  return Math.max(0, Math.min(100, Math.round((rank.rr / RP_PER_DIVISION) * 100)));
}
