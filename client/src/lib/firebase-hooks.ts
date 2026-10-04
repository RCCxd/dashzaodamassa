import { useQuery } from "@tanstack/react-query";
import {
  getDashboardData,
  getPlannerNote,
  getStudyStats,
  getWeeklyGoal,
  listAchievements,
  listActivities,
  listSubjects,
} from "@/lib/firestore-data";

export const queryKeys = {
  subjects: ["firebase", "subjects"] as const,
  activities: (uid: string) => ["firebase", "activities", uid] as const,
  dashboard: (uid: string) => ["firebase", "dashboard", uid] as const,
  study: (uid: string) => ["firebase", "study", uid] as const,
  achievements: (uid: string) => ["firebase", "achievements", uid] as const,
  plannerNote: (uid: string) => ["firebase", "planner-note", uid] as const,
  weeklyGoal: (uid: string) => ["firebase", "weekly-goal", uid] as const,
};

function requireUid(uid: string | null | undefined): string {
  if (!uid) throw new Error("Entre na sua conta para carregar seus dados.");
  return uid;
}

export function useSubjects() {
  return useQuery({ queryKey: queryKeys.subjects, queryFn: listSubjects });
}

export function useActivities(uid: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.activities(uid ?? ""),
    queryFn: () => listActivities(requireUid(uid)),
    enabled: Boolean(uid),
  });
}

export function useDashboard(uid: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.dashboard(uid ?? ""),
    queryFn: () => getDashboardData(requireUid(uid)),
    enabled: Boolean(uid),
    refetchInterval: 30_000,
  });
}

export function useStudyStats(uid: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.study(uid ?? ""),
    queryFn: () => getStudyStats(requireUid(uid)),
    enabled: Boolean(uid),
    refetchInterval: 30_000,
  });
}

export function useAchievements(uid: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.achievements(uid ?? ""),
    queryFn: () => listAchievements(requireUid(uid)),
    enabled: Boolean(uid),
  });
}

export function usePlannerNote(uid: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.plannerNote(uid ?? ""),
    queryFn: () => getPlannerNote(requireUid(uid)),
    enabled: Boolean(uid),
  });
}

export function useWeeklyGoal(uid: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.weeklyGoal(uid ?? ""),
    queryFn: () => getWeeklyGoal(requireUid(uid)),
    enabled: Boolean(uid),
  });
}
