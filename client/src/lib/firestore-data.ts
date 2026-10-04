import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  query,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { requireFirestore } from "@/lib/firebase";

export type ActivityType = "tarefa" | "prova" | "trabalho" | "projeto";
export type Priority = "baixa" | "media" | "alta";
export type EditorialStatus = "pendente" | "em_andamento" | "concluida";

export type Subject = {
  id: string;
  name: string;
  color: string;
  teacher: string | null;
  schedule: string | null;
  description: string | null;
};

export type Activity = {
  id: string;
  subjectId: string;
  subject: Subject;
  title: string;
  description: string | null;
  type: ActivityType;
  priority: Priority;
  status: EditorialStatus;
  dueDate: Date | null;
  resourceUrl: string | null;
  estimatedMinutes: number;
  completed: boolean;
  completedAt: Date | null;
};

export type StudySession = {
  id: string;
  durationMinutes: number;
  subjectId: string | null;
  activityId: string | null;
  kind: "pomodoro" | "livre";
  startedAt: Date;
  completedAt: Date;
};

export type SubjectInput = Omit<Subject, "id">;
export type ActivityInput = Omit<Activity, "id" | "subject" | "completed" | "completedAt">;

const achievementCatalog = [
  { code: "first_completion", title: "Primeiro passo", description: "Conclua sua primeira atividade.", icon: "Sparkles", target: 1, category: "atividades" },
  { code: "ten_completions", title: "Ritmo de estudo", description: "Conclua 10 atividades.", icon: "CheckCheck", target: 10, category: "atividades" },
  { code: "hundred_completions", title: "Centurião", description: "Conclua 100 atividades.", icon: "Trophy", target: 100, category: "atividades" },
  { code: "seven_day_streak", title: "Semana em chamas", description: "Estude por 7 dias seguidos.", icon: "Flame", target: 7, category: "foco" },
  { code: "ten_pomodoro_hours", title: "Hora do foco", description: "Acumule 10 horas de Pomodoro.", icon: "Timer", target: 600, category: "foco" },
  { code: "subject_mastery", title: "Matéria em dia", description: "Conclua todas as atividades de uma matéria.", icon: "GraduationCap", target: 1, category: "atividades" },
  { code: "five_days_week", title: "Semana produtiva", description: "Estude em 5 dias nesta semana.", icon: "CalendarDays", target: 5, category: "foco" },
] as const;

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function nullableText(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function subjectFrom(id: string, data: DocumentData): Subject {
  return {
    id,
    name: text(data.name, "Matéria"),
    color: text(data.color, "#5B6CFF"),
    teacher: nullableText(data.teacher),
    schedule: nullableText(data.schedule),
    description: nullableText(data.description),
  };
}

function activityFields(data: DocumentData) {
  return {
    subjectId: text(data.subjectId),
    title: text(data.title, "Atividade"),
    description: nullableText(data.description),
    type: (data.type ?? "tarefa") as ActivityType,
    priority: (data.priority ?? "media") as Priority,
    status: (data.status ?? "pendente") as EditorialStatus,
    dueDate: asDate(data.dueDate),
    resourceUrl: nullableText(data.resourceUrl),
    estimatedMinutes: typeof data.estimatedMinutes === "number" ? data.estimatedMinutes : 30,
  };
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function mondayStart(date = new Date()): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

function calculateStreak(sessions: StudySession[]): number {
  const days = new Set(sessions.map(session => dateKey(session.completedAt)));
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!days.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function userCollection(uid: string, name: string) {
  return collection(requireFirestore(), "users", uid, name);
}

export async function listSubjects(): Promise<Subject[]> {
  const snapshot = await getDocs(collection(requireFirestore(), "subjects"));
  return snapshot.docs.map(item => subjectFrom(item.id, item.data())).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function listActivities(uid: string): Promise<Activity[]> {
  const db = requireFirestore();
  const [activitySnapshot, subjectSnapshot, completionSnapshot] = await Promise.all([
    getDocs(collection(db, "activities")),
    getDocs(collection(db, "subjects")),
    getDocs(userCollection(uid, "activityCompletions")),
  ]);
  const subjects = new Map(subjectSnapshot.docs.map(item => [item.id, subjectFrom(item.id, item.data())]));
  const completions = new Map(completionSnapshot.docs.map(item => [item.id, asDate(item.data().completedAt)]));
  return activitySnapshot.docs.map(item => {
    const data = item.data();
    const fields = activityFields(data);
    const subject = subjects.get(fields.subjectId) ?? {
      id: fields.subjectId,
      name: "Matéria removida",
      color: "#94a3b8",
      teacher: null,
      schedule: null,
      description: null,
    };
    const completedAt = completions.get(item.id) ?? null;
    return { id: item.id, ...fields, subject, completed: completions.has(item.id), completedAt };
  }).sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return a.title.localeCompare(b.title, "pt-BR");
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.getTime() - b.dueDate.getTime();
  });
}

export async function createSubject(input: SubjectInput): Promise<string> {
  const now = serverTimestamp();
  const reference = await addDoc(collection(requireFirestore(), "subjects"), {
    ...input,
    teacher: input.teacher || null,
    schedule: input.schedule || null,
    description: input.description || null,
    createdAt: now,
    updatedAt: now,
  });
  return reference.id;
}

export async function updateSubject(id: string, input: SubjectInput): Promise<void> {
  await updateDoc(doc(requireFirestore(), "subjects", id), {
    ...input,
    teacher: input.teacher || null,
    schedule: input.schedule || null,
    description: input.description || null,
    updatedAt: serverTimestamp(),
  });
}

export async function removeSubject(id: string): Promise<void> {
  const db = requireFirestore();
  const related = await getDocs(query(collection(db, "activities"), where("subjectId", "==", id)));
  for (let offset = 0; offset < related.docs.length; offset += 450) {
    const batch = writeBatch(db);
    related.docs.slice(offset, offset + 450).forEach(item => batch.delete(item.ref));
    await batch.commit();
  }
  await deleteDoc(doc(db, "subjects", id));
}

export async function createActivity(input: ActivityInput): Promise<string> {
  const db = requireFirestore();
  const subject = await getDoc(doc(db, "subjects", input.subjectId));
  if (!subject.exists()) throw new Error("Matéria não encontrada.");
  const now = serverTimestamp();
  const reference = await addDoc(collection(db, "activities"), {
    ...input,
    description: input.description || null,
    resourceUrl: input.resourceUrl || null,
    dueDate: input.dueDate ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return reference.id;
}

export async function updateActivity(id: string, input: ActivityInput): Promise<void> {
  const db = requireFirestore();
  const subject = await getDoc(doc(db, "subjects", input.subjectId));
  if (!subject.exists()) throw new Error("Matéria não encontrada.");
  await updateDoc(doc(db, "activities", id), {
    ...input,
    description: input.description || null,
    resourceUrl: input.resourceUrl || null,
    dueDate: input.dueDate ?? null,
    updatedAt: serverTimestamp(),
  });
}

export async function removeActivity(id: string): Promise<void> {
  await deleteDoc(doc(requireFirestore(), "activities", id));
}

async function listStudySessions(uid: string): Promise<StudySession[]> {
  const snapshot = await getDocs(userCollection(uid, "studySessions"));
  return snapshot.docs.map(item => {
    const data = item.data();
    return {
      id: item.id,
      durationMinutes: typeof data.durationMinutes === "number" ? data.durationMinutes : 0,
      subjectId: nullableText(data.subjectId),
      activityId: nullableText(data.activityId),
      kind: (data.kind === "livre" ? "livre" : "pomodoro") as StudySession["kind"],
      startedAt: asDate(data.startedAt) ?? new Date(0),
      completedAt: asDate(data.completedAt) ?? new Date(0),
    };
  }).sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
}

async function listCompletions(uid: string): Promise<Map<string, Date | null>> {
  const snapshot = await getDocs(userCollection(uid, "activityCompletions"));
  return new Map(snapshot.docs.map(item => [item.id, asDate(item.data().completedAt)]));
}

async function newlyUnlocked(uid: string, before: Set<string>): Promise<string[]> {
  const current = await listAchievements(uid);
  return current.filter(item => item.unlocked && !before.has(item.code)).map(item => item.code);
}

export async function toggleCompletion(uid: string, activityId: string): Promise<{ completed: boolean; newlyUnlocked: string[] }> {
  const db = requireFirestore();
  const reference = doc(db, "users", uid, "activityCompletions", activityId);
  const existing = await getDoc(reference);
  const before = new Set((await listAchievements(uid)).filter(item => item.unlocked).map(item => item.code));
  if (existing.exists()) {
    await deleteDoc(reference);
    return { completed: false, newlyUnlocked: [] };
  }
  await setDoc(reference, { activityId, completedAt: serverTimestamp() });
  return { completed: true, newlyUnlocked: await newlyUnlocked(uid, before) };
}

export async function recordStudySession(input: {
  uid: string;
  durationMinutes: number;
  subjectId: string | null;
  activityId: string | null;
  kind?: "pomodoro" | "livre";
}): Promise<{ newlyUnlocked: string[] }> {
  const db = requireFirestore();
  let subjectId = input.subjectId;
  if (input.activityId) {
    const activitySnapshot = await getDoc(doc(db, "activities", input.activityId));
    if (!activitySnapshot.exists()) throw new Error("Atividade não encontrada.");
    const linkedSubject = text(activitySnapshot.data().subjectId);
    if (subjectId && linkedSubject !== subjectId) throw new Error("A atividade não pertence à matéria selecionada.");
    subjectId ??= linkedSubject || null;
  }
  if (subjectId && !(await getDoc(doc(db, "subjects", subjectId))).exists()) throw new Error("Matéria não encontrada.");

  const before = new Set((await listAchievements(input.uid)).filter(item => item.unlocked).map(item => item.code));
  const completedAt = new Date();
  await addDoc(userCollection(input.uid, "studySessions"), {
    durationMinutes: input.durationMinutes,
    subjectId,
    activityId: input.activityId,
    kind: input.kind ?? "pomodoro",
    startedAt: new Date(completedAt.getTime() - input.durationMinutes * 60_000),
    completedAt: serverTimestamp(),
  });
  return { newlyUnlocked: await newlyUnlocked(input.uid, before) };
}

export async function getStudyStats(uid: string) {
  const sessions = await listStudySessions(uid);
  const weekStart = mondayStart();
  const currentWeek = sessions.filter(session => session.completedAt >= weekStart);
  const days = new Map<string, number>();
  sessions.forEach(session => {
    const key = dateKey(session.completedAt);
    days.set(key, (days.get(key) ?? 0) + 1);
  });
  return {
    totalMinutes: sessions.reduce((sum, session) => sum + session.durationMinutes, 0),
    totalSessions: sessions.length,
    weekMinutes: currentWeek.reduce((sum, session) => sum + session.durationMinutes, 0),
    weekSessions: currentWeek.length,
    streak: calculateStreak(sessions),
    sessionsByDay: [...days.entries()].map(([date, value]) => ({ date, value })),
    recent: sessions.slice(0, 5),
  };
}

export async function getDashboardData(uid: string) {
  const [activities, subjects, sessions] = await Promise.all([listActivities(uid), listSubjects(), listStudySessions(uid)]);
  const total = activities.length;
  const completed = activities.filter(item => item.completed).length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = activities.filter(item => !item.completed && item.dueDate && item.dueDate < today).length;
  const subjectById = new Map(subjects.map(item => [item.id, item]));
  const activityDistribution = subjects.map(subject => ({
    name: subject.name,
    color: subject.color,
    value: activities.filter(item => item.subjectId === subject.id).length,
  })).filter(item => item.value > 0);
  const subjectProgress = subjects.map(subject => {
    const rows = activities.filter(item => item.subjectId === subject.id);
    const done = rows.filter(item => item.completed).length;
    return { id: subject.id, name: subject.name, color: subject.color, total: rows.length, completed: done, progress: rows.length ? Math.round(done / rows.length * 100) : 0 };
  }).filter(item => item.total > 0);
  const upcoming = activities.filter(item => !item.completed && item.dueDate).sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime()).slice(0, 5);
  const completionSeries = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (6 - index));
    const label = new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(day).replace(".", "");
    return { label, "concluídas": activities.filter(item => item.completedAt && dateKey(item.completedAt) === dateKey(day)).length };
  });
  const studySeries = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (6 - index));
    const label = new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(day).replace(".", "");
    const minutes = sessions.filter(session => dateKey(session.completedAt) === dateKey(day)).reduce((sum, session) => sum + session.durationMinutes, 0);
    return { label, horas: Math.round(minutes / 60 * 10) / 10 };
  });
  return {
    summary: { total, completed, pending: total - completed, overdue, progress: total ? Math.round(completed / total * 100) : 0 },
    upcoming: upcoming.map(item => ({ ...item, subject: subjectById.get(item.subjectId) ?? item.subject })),
    activityDistribution,
    completionSeries,
    studySeries,
    subjectProgress,
  };
}

export async function listAchievements(uid: string) {
  const [activities, completions, sessions] = await Promise.all([listActivities(uid), listCompletions(uid), listStudySessions(uid)]);
  const completedCount = activities.filter(activity => activity.completed).length;
  const completedIds = new Set(completions.keys());
  const activitiesBySubject = new Map<string, Activity[]>();
  activities.forEach(activity => {
    const current = activitiesBySubject.get(activity.subjectId) ?? [];
    current.push(activity);
    activitiesBySubject.set(activity.subjectId, current);
  });
  const hasFinishedSubject = [...activitiesBySubject.values()].some(rows => rows.length > 0 && rows.every(item => completedIds.has(item.id)));
  const pomodoroMinutes = sessions.filter(session => session.kind === "pomodoro").reduce((sum, session) => sum + session.durationMinutes, 0);
  const weekStart = mondayStart();
  const daysThisWeek = new Set(sessions.filter(item => item.completedAt >= weekStart).map(item => dateKey(item.completedAt))).size;
  const progress: Record<string, number> = {
    first_completion: completedCount,
    ten_completions: completedCount,
    hundred_completions: completedCount,
    seven_day_streak: calculateStreak(sessions),
    ten_pomodoro_hours: pomodoroMinutes,
    subject_mastery: hasFinishedSubject ? 1 : 0,
    five_days_week: daysThisWeek,
  };
  return achievementCatalog.map(definition => {
    const rawProgress = progress[definition.code] ?? 0;
    return {
      ...definition,
      progress: Math.min(rawProgress, definition.target),
      rawProgress,
      unlocked: rawProgress >= definition.target,
      unlockedAt: null as Date | null,
    };
  });
}

export async function getPlannerNote(uid: string): Promise<{ content: string }> {
  const snapshot = await getDoc(doc(requireFirestore(), "users", uid, "planner", "quickNote"));
  return { content: snapshot.exists() ? text(snapshot.data().content) : "" };
}

export async function savePlannerNote(uid: string, content: string): Promise<void> {
  await setDoc(doc(requireFirestore(), "users", uid, "planner", "quickNote"), { content, updatedAt: serverTimestamp() }, { merge: true });
}

export function currentWeekKey(): string {
  return dateKey(mondayStart());
}

export async function getWeeklyGoal(uid: string): Promise<{ weekStart: string; targetMinutes: number; targetSessions: number }> {
  const weekStart = currentWeekKey();
  const snapshot = await getDoc(doc(requireFirestore(), "users", uid, "weeklyGoals", weekStart));
  if (!snapshot.exists()) return { weekStart, targetMinutes: 120, targetSessions: 4 };
  const data = snapshot.data();
  return {
    weekStart,
    targetMinutes: typeof data.targetMinutes === "number" ? data.targetMinutes : 120,
    targetSessions: typeof data.targetSessions === "number" ? data.targetSessions : 4,
  };
}

export async function saveWeeklyGoal(uid: string, targetMinutes: number, targetSessions: number): Promise<void> {
  const weekStart = currentWeekKey();
  await setDoc(doc(requireFirestore(), "users", uid, "weeklyGoals", weekStart), {
    weekStart,
    targetMinutes,
    targetSessions,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function exportUserData(uid: string): Promise<{ json: string; csv: string; fileName: string }> {
  const [activities, sessions, achievements] = await Promise.all([listActivities(uid), listStudySessions(uid), listAchievements(uid)]);
  const payload = { exportedAt: new Date().toISOString(), activities, studySessions: sessions, achievements };
  const csvRows = activities.map(item => [item.title, item.subject.name, item.dueDate ? dateKey(item.dueDate) : "", item.completed ? "sim" : "não", item.estimatedMinutes]
    .map(value => `"${String(value).replaceAll('"', '""')}"`).join(","));
  return {
    json: JSON.stringify(payload, null, 2),
    csv: ["atividade,matéria,prazo,concluída,estimativa_minutos", ...csvRows].join("\n"),
    fileName: `dashboard-2b-${dateKey(new Date())}`,
  };
}
