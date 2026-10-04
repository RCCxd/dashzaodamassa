import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useFirebaseAuth, logoutFromFirebase } from "@/contexts/FirebaseAuthContext";
import {
  createActivity,
  createSubject,
  exportUserData,
  getDashboardData,
  getPlannerNote,
  getStudyStats,
  getWeeklyGoal,
  listAchievements,
  listActivities,
  listSubjects,
  recordStudySession,
  removeActivity,
  removeSubject,
  savePlannerNote,
  saveWeeklyGoal,
  toggleCompletion,
  updateActivity,
  updateSubject,
  type ActivityInput,
  type ActivityType,
  type Priority,
  type SubjectInput,
} from "@/lib/firestore-data";
import { queryKeys } from "@/lib/firebase-hooks";

export type ActivityFilters = {
  search?: string;
  subjectId?: string;
  type?: ActivityType;
  priority?: Priority;
  state?: "todas" | "concluidas" | "pendentes" | "atrasadas";
};

type QueryOptions<T> = Omit<UseQueryOptions<T, Error, T, QueryKey>, "queryKey" | "queryFn">;
type MutationOptions<TData, TVariables> = UseMutationOptions<TData, Error, TVariables, unknown>;

function keyWithInput(base: readonly unknown[], input: unknown) {
  return [...base, input ?? {}] as const;
}

function queryWithOptions<T>(key: QueryKey, queryFn: () => Promise<T>, options?: QueryOptions<T>) {
  return useQuery({ queryKey: key, queryFn, ...(options ?? {}) });
}

function mutationWithOptions<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: MutationOptions<TData, TVariables>,
) {
  return useMutation({ mutationFn, ...(options ?? {}) });
}

function filteredActivities(uid: string, input?: ActivityFilters) {
  return listActivities(uid).then(rows => {
    let result = rows;
    if (input?.search) {
      const needle = input.search.toLocaleLowerCase("pt-BR");
      result = result.filter(item => `${item.title} ${item.description ?? ""} ${item.subject.name}`.toLocaleLowerCase("pt-BR").includes(needle));
    }
    if (input?.subjectId) result = result.filter(item => item.subjectId === input.subjectId);
    if (input?.type) result = result.filter(item => item.type === input.type);
    if (input?.priority) result = result.filter(item => item.priority === input.priority);
    if (input?.state === "concluidas") result = result.filter(item => item.completed);
    if (input?.state === "pendentes") result = result.filter(item => !item.completed);
    if (input?.state === "atrasadas") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      result = result.filter(item => !item.completed && Boolean(item.dueDate && item.dueDate < today));
    }
    return result;
  });
}

export const firebaseApi = {
  auth: {
    me: {
      useQuery() {
        const auth = useFirebaseAuth();
        return { data: auth.profile ?? undefined, isLoading: auth.loading, error: auth.profileError ? new Error(auth.profileError) : null, refetch: auth.refreshProfile };
      },
    },
    logout: {
      useMutation(options?: MutationOptions<{ success: true }, void>) {
        return mutationWithOptions(async () => {
          await logoutFromFirebase();
          return { success: true as const };
        }, options);
      },
    },
  },
  subjects: {
    list: {
      useQuery(options?: QueryOptions<Awaited<ReturnType<typeof listSubjects>>>) {
        return queryWithOptions(queryKeys.subjects, listSubjects, options);
      },
    },
    create: {
      useMutation(options?: MutationOptions<{ id: string }, SubjectInput>) {
        return mutationWithOptions(async input => ({ id: await createSubject(input) }), options);
      },
    },
    update: {
      useMutation(options?: MutationOptions<{ success: true }, SubjectInput & { id: string }>) {
        return mutationWithOptions(async ({ id, ...input }) => {
          await updateSubject(id, input);
          return { success: true as const };
        }, options);
      },
    },
    remove: {
      useMutation(options?: MutationOptions<{ success: true }, { id: string }>) {
        return mutationWithOptions(async ({ id }) => {
          await removeSubject(id);
          return { success: true as const };
        }, options);
      },
    },
  },
  activities: {
    list: {
      useQuery(input?: ActivityFilters, options?: QueryOptions<Awaited<ReturnType<typeof listActivities>>>) {
        const auth = useFirebaseAuth();
        const uid = auth.user?.uid ?? "";
        return queryWithOptions(keyWithInput(queryKeys.activities(uid), input), () => filteredActivities(uid, input), { ...options, enabled: Boolean(uid) && (options?.enabled ?? true) });
      },
    },
    create: {
      useMutation(options?: MutationOptions<{ id: string }, ActivityInput>) {
        return mutationWithOptions(async input => ({ id: await createActivity(input) }), options);
      },
    },
    update: {
      useMutation(options?: MutationOptions<{ success: true }, ActivityInput & { id: string }>) {
        return mutationWithOptions(async ({ id, ...input }) => {
          await updateActivity(id, input);
          return { success: true as const };
        }, options);
      },
    },
    remove: {
      useMutation(options?: MutationOptions<{ success: true }, { id: string }>) {
        return mutationWithOptions(async ({ id }) => {
          await removeActivity(id);
          return { success: true as const };
        }, options);
      },
    },
  },
  completions: {
    toggle: {
      useMutation(options?: MutationOptions<Awaited<ReturnType<typeof toggleCompletion>>, { activityId: string }>) {
        const auth = useFirebaseAuth();
        return mutationWithOptions(input => {
          if (!auth.user) throw new Error("Entre na sua conta novamente.");
          return toggleCompletion(auth.user.uid, input.activityId);
        }, options);
      },
    },
  },
  dashboard: {
    summary: {
      useQuery(_input?: void, options?: QueryOptions<Awaited<ReturnType<typeof getDashboardData>>>) {
        const auth = useFirebaseAuth();
        const uid = auth.user?.uid ?? "";
        return queryWithOptions(queryKeys.dashboard(uid), () => getDashboardData(uid), { ...options, enabled: Boolean(uid) && (options?.enabled ?? true) });
      },
    },
  },
  study: {
    stats: {
      useQuery(_input?: void, options?: QueryOptions<Awaited<ReturnType<typeof getStudyStats>>>) {
        const auth = useFirebaseAuth();
        const uid = auth.user?.uid ?? "";
        return queryWithOptions(queryKeys.study(uid), () => getStudyStats(uid), { ...options, enabled: Boolean(uid) && (options?.enabled ?? true) });
      },
    },
    record: {
      useMutation(options?: MutationOptions<Awaited<ReturnType<typeof recordStudySession>>, { durationMinutes: number; subjectId?: string | null; activityId?: string | null; kind?: "pomodoro" | "livre" }>) {
        const auth = useFirebaseAuth();
        return mutationWithOptions(input => {
          if (!auth.user) throw new Error("Entre na sua conta novamente.");
          return recordStudySession({ uid: auth.user.uid, durationMinutes: input.durationMinutes, subjectId: input.subjectId ?? null, activityId: input.activityId ?? null, kind: input.kind ?? "pomodoro" });
        }, options);
      },
    },
  },
  achievements: {
    list: {
      useQuery(_input?: void, options?: QueryOptions<Awaited<ReturnType<typeof listAchievements>>>) {
        const auth = useFirebaseAuth();
        const uid = auth.user?.uid ?? "";
        return queryWithOptions(queryKeys.achievements(uid), () => listAchievements(uid), { ...options, enabled: Boolean(uid) && (options?.enabled ?? true) });
      },
    },
  },
  planner: {
    note: {
      useQuery(_input?: void, options?: QueryOptions<Awaited<ReturnType<typeof getPlannerNote>>>) {
        const auth = useFirebaseAuth();
        const uid = auth.user?.uid ?? "";
        return queryWithOptions(queryKeys.plannerNote(uid), () => getPlannerNote(uid), { ...options, enabled: Boolean(uid) && (options?.enabled ?? true) });
      },
    },
    saveNote: {
      useMutation(options?: MutationOptions<{ success: true }, { content: string }>) {
        const auth = useFirebaseAuth();
        return mutationWithOptions(async ({ content }) => {
          if (!auth.user) throw new Error("Entre na sua conta novamente.");
          await savePlannerNote(auth.user.uid, content);
          return { success: true as const };
        }, options);
      },
    },
    goal: {
      useQuery(_input?: void, options?: QueryOptions<Awaited<ReturnType<typeof getWeeklyGoal>>>) {
        const auth = useFirebaseAuth();
        const uid = auth.user?.uid ?? "";
        return queryWithOptions(queryKeys.weeklyGoal(uid), () => getWeeklyGoal(uid), { ...options, enabled: Boolean(uid) && (options?.enabled ?? true) });
      },
    },
    saveGoal: {
      useMutation(options?: MutationOptions<{ success: true }, { targetMinutes: number; targetSessions: number }>) {
        const auth = useFirebaseAuth();
        return mutationWithOptions(async input => {
          if (!auth.user) throw new Error("Entre na sua conta novamente.");
          await saveWeeklyGoal(auth.user.uid, input.targetMinutes, input.targetSessions);
          return { success: true as const };
        }, options);
      },
    },
  },
  export: {
    data: {
      useQuery(_input?: void, options?: QueryOptions<Awaited<ReturnType<typeof exportUserData>>>) {
        const auth = useFirebaseAuth();
        const uid = auth.user?.uid ?? "";
        return queryWithOptions(["firebase", "export", uid], () => exportUserData(uid), { ...options, enabled: Boolean(uid) && (options?.enabled ?? true) });
      },
    },
  },
  useUtils() {
    const queryClient = useQueryClient();
    const auth = useFirebaseAuth();
    const uid = auth.user?.uid ?? "";
    const activityBase = queryKeys.activities(uid);
    const activityKey = (input?: ActivityFilters) => keyWithInput(activityBase, input);
    const makeQueryUtils = (queryKey: QueryKey) => ({
      invalidate: async (_input?: unknown) => queryClient.invalidateQueries({ queryKey }),
    });
    return {
      auth: { me: {
        setData: (_input: unknown, updater: unknown) => queryClient.setQueryData(["firebase", "auth", "me"], updater),
        invalidate: () => queryClient.invalidateQueries({ queryKey: ["firebase", "auth", "me"] }),
      } },
      subjects: { list: makeQueryUtils(queryKeys.subjects) },
      activities: { list: {
        invalidate: async (_input?: ActivityFilters) => queryClient.invalidateQueries({ queryKey: activityBase }),
        cancel: (input?: ActivityFilters) => queryClient.cancelQueries({ queryKey: activityKey(input), exact: true }),
        getData: (input?: ActivityFilters) => queryClient.getQueryData<Awaited<ReturnType<typeof listActivities>>>(activityKey(input)),
        setData: (input: ActivityFilters | undefined, updater: (current: Awaited<ReturnType<typeof listActivities>> | undefined) => Awaited<ReturnType<typeof listActivities>> | undefined) => queryClient.setQueryData(activityKey(input), updater),
      } },
      dashboard: { summary: makeQueryUtils(queryKeys.dashboard(uid)) },
      study: { stats: makeQueryUtils(queryKeys.study(uid)) },
      achievements: { list: makeQueryUtils(queryKeys.achievements(uid)) },
      planner: { note: makeQueryUtils(queryKeys.plannerNote(uid)), goal: makeQueryUtils(queryKeys.weeklyGoal(uid)) },
    };
  },
};
