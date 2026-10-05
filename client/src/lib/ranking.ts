import type { Priority } from "@/lib/firestore-data";

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

export type ValorantRank = {
  label: string;
  group: string;
  division: string | null;
  color: string;
  totalRP: number;
  rr: number;
  nextThreshold: number | null;
};

/** Uma conclusão escolar dá RP uma única vez; Pomodoro e sessões livres nunca entram nesta conta. */
export function pointsForActivity(priority: Priority): number {
  return 10 + (priority === "alta" ? 5 : priority === "media" ? 2 : 0);
}

export function resolveValorantRank(rawTotalRP: number): ValorantRank {
  const totalRP = Math.max(0, Math.floor(Number.isFinite(rawTotalRP) ? rawTotalRP : 0));
  const radiantStart = RANK_GROUPS.length * DIVISIONS.length * 100;
  if (totalRP >= radiantStart) {
    return {
      label: "Radiante",
      group: "Radiante",
      division: null,
      color: "#f4d56f",
      totalRP,
      rr: totalRP - radiantStart,
      nextThreshold: null,
    };
  }
  const tierIndex = Math.floor(totalRP / 100);
  const group = RANK_GROUPS[Math.floor(tierIndex / DIVISIONS.length)];
  const division = DIVISIONS[tierIndex % DIVISIONS.length];
  return {
    label: `${group.name} ${division}`,
    group: group.name,
    division,
    color: group.color,
    totalRP,
    rr: totalRP % 100,
    nextThreshold: (tierIndex + 1) * 100,
  };
}

export function progressToNextRank(rank: ValorantRank): number {
  if (rank.nextThreshold === null) return 100;
  return Math.max(0, Math.min(100, Math.round((rank.rr / 100) * 100)));
}
