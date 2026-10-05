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
  runTransaction,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { requireFirestore } from "@/lib/firebase";
import { pointsForActivity } from "@/lib/ranking";

export type ActivityType = "tarefa" | "prova" | "trabalho" | "projeto";
export type Priority = "baixa" | "media" | "alta";
export type EditorialStatus = "pendente" | "em_andamento" | "concluida";

export type SubjectScheduleSlot = {
  id: string;
  subjectId: string;
  day: number;
  startTime: string;
  endTime: string;
  room: string | null;
};

export type Subject = {
  id: string;
  name: string;
  color: string;
  teacher: string | null;
  schedule: string | null;
  description: string | null;
  weeklySlots: SubjectScheduleSlot[];
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
  attachmentPath: string | null;
  attachmentName: string | null;
  attachmentSize: number | null;
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

export type SubjectSlotInput = Omit<SubjectScheduleSlot, "id" | "subjectId"> & { id?: string };
export type SubjectInput = Omit<Subject, "id" | "weeklySlots"> & { weeklySlots?: SubjectSlotInput[] };
export type ActivityInput = Omit<Activity, "id" | "subject" | "completed" | "completedAt">;
export type VisualPreferences = {
  accent: "lime" | "indigo" | "coral" | "violet";
  surface: "graphite" | "ink" | "plum";
  texture: "plain" | "grid";
  density: "comfortable" | "compact";
};
export type RankingSettings = { publicName: string; visible: boolean };
export type LeaderboardEntry = { uid: string; displayName: string; totalRP: number };

const achievementCatalog = [
  { code: "first_completion", title: "Primeiro passo", description: "Conclua sua primeira atividade.", icon: "Sparkles", target: 1, category: "atividades" },
  { code: "five_completions", title: "Caderno em movimento", description: "Conclua 5 atividades.", icon: "BookOpenCheck", target: 5, category: "atividades" },
  { code: "ten_completions", title: "Ritmo de estudo", description: "Conclua 10 atividades.", icon: "CheckCheck", target: 10, category: "atividades" },
  { code: "twentyfive_completions", title: "Mão na massa", description: "Conclua 25 atividades.", icon: "NotebookPen", target: 25, category: "atividades" },
  { code: "fifty_completions", title: "Nome no quadro", description: "Conclua 50 atividades.", icon: "Medal", target: 50, category: "atividades" },
  { code: "hundred_completions", title: "Centurião", description: "Conclua 100 atividades.", icon: "Trophy", target: 100, category: "atividades" },
  { code: "three_day_streak", title: "Três dias no ritmo", description: "Estude por 3 dias seguidos.", icon: "Flame", target: 3, category: "foco" },
  { code: "seven_day_streak", title: "Semana em chamas", description: "Estude por 7 dias seguidos.", icon: "Flame", target: 7, category: "foco" },
  { code: "five_pomodoro_sessions", title: "Cinco ciclos", description: "Registre 5 ciclos Pomodoro.", icon: "Timer", target: 5, category: "foco" },
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
    color: text(data.color, "#B7E36A"),
    teacher: nullableText(data.teacher),
    schedule: nullableText(data.schedule),
    description: nullableText(data.description),
    weeklySlots: [],
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
    attachmentPath: nullableText(data.attachmentPath),
    attachmentName: nullableText(data.attachmentName),
    attachmentSize: typeof data.attachmentSize === "number" ? data.attachmentSize : null,
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
  const db = requireFirestore();
  const [snapshot, scheduleSnapshot] = await Promise.all([
    getDocs(collection(db, "subjects")),
    getDocs(collection(db, "subjectSchedule")),
  ]);
  const slots = new Map<string, SubjectScheduleSlot[]>();
  scheduleSnapshot.docs.forEach(item => {
    const data = item.data();
    const subjectId = text(data.subjectId);
    if (!subjectId || typeof data.day !== "number" || typeof data.startTime !== "string" || typeof data.endTime !== "string") return;
    const current = slots.get(subjectId) ?? [];
    current.push({ id: item.id, subjectId, day: data.day, startTime: data.startTime, endTime: data.endTime, room: nullableText(data.room) });
    slots.set(subjectId, current);
  });
  return snapshot.docs.map(item => ({
    ...subjectFrom(item.id, item.data()),
    weeklySlots: (slots.get(item.id) ?? []).sort((a, b) => a.day - b.day || a.startTime.localeCompare(b.startTime)),
  })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
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
      weeklySlots: [],
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

function subjectFields(input: SubjectInput) {
  return {
    name: input.name,
    color: input.color,
    teacher: input.teacher || null,
    schedule: input.schedule || null,
    description: input.description || null,
  };
}

export async function createSubject(input: SubjectInput): Promise<string> {
  const db = requireFirestore();
  const subjectRef = doc(collection(db, "subjects"));
  const batch = writeBatch(db);
  const now = serverTimestamp();
  batch.set(subjectRef, { ...subjectFields(input), createdAt: now, updatedAt: now });
  (input.weeklySlots ?? []).forEach(slot => {
    const { id: _ignored, ...fields } = slot;
    const slotRef = doc(collection(db, "subjectSchedule"));
    batch.set(slotRef, { ...fields, subjectId: subjectRef.id, room: fields.room || null, createdAt: now, updatedAt: now });
  });
  await batch.commit();
  return subjectRef.id;
}

export async function updateSubject(id: string, input: SubjectInput): Promise<void> {
  const db = requireFirestore();
  const scheduleQuery = query(collection(db, "subjectSchedule"), where("subjectId", "==", id));
  const existing = await getDocs(scheduleQuery);
  const existingIds = new Set(existing.docs.map(item => item.id));
  const desiredIds = new Set((input.weeklySlots ?? []).flatMap(slot => slot.id ? [slot.id] : []));
  const batch = writeBatch(db);
  batch.update(doc(db, "subjects", id), { ...subjectFields(input), updatedAt: serverTimestamp() });
  existing.docs.filter(item => !desiredIds.has(item.id)).forEach(item => batch.delete(item.ref));
  (input.weeklySlots ?? []).forEach(slot => {
    const { id: slotId, ...fields } = slot;
    const data = { ...fields, subjectId: id, room: fields.room || null, updatedAt: serverTimestamp() };
    if (slotId && existingIds.has(slotId)) batch.update(doc(db, "subjectSchedule", slotId), data);
    else batch.set(doc(collection(db, "subjectSchedule")), { ...data, createdAt: serverTimestamp() });
  });
  await batch.commit();
}

export async function removeSubject(id: string): Promise<void> {
  const db = requireFirestore();
  const [related, slots] = await Promise.all([
    getDocs(query(collection(db, "activities"), where("subjectId", "==", id))),
    getDocs(query(collection(db, "subjectSchedule"), where("subjectId", "==", id))),
  ]);
  for (let offset = 0; offset < related.docs.length; offset += 450) {
    const batch = writeBatch(db);
    related.docs.slice(offset, offset + 450).forEach(item => batch.delete(item.ref));
    await batch.commit();
  }
  const batch = writeBatch(db);
  slots.docs.forEach(item => batch.delete(item.ref));
  batch.delete(doc(db, "subjects", id));
  await batch.commit();
}

export async function createActivity(input: ActivityInput, activityId?: string): Promise<string> {
  const db = requireFirestore();
  const subject = await getDoc(doc(db, "subjects", input.subjectId));
  if (!subject.exists()) throw new Error("Matéria não encontrada.");
  const reference = activityId ? doc(db, "activities", activityId) : doc(collection(db, "activities"));
  if (activityId && (await getDoc(reference)).exists()) throw new Error("Este identificador de atividade já existe. Feche o formulário e tente novamente.");
  const now = serverTimestamp();
  await setDoc(reference, {
    ...input,
    description: input.description || null,
    resourceUrl: input.resourceUrl || null,
    attachmentPath: input.attachmentPath || null,
    attachmentName: input.attachmentName || null,
    attachmentSize: input.attachmentSize ?? null,
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
    attachmentPath: input.attachmentPath || null,
    attachmentName: input.attachmentName || null,
    attachmentSize: input.attachmentSize ?? null,
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

const rankStateRef = (uid: string) => doc(requireFirestore(), "users", uid, "ranking", "state");
const rankSettingsRef = (uid: string) => doc(requireFirestore(), "users", uid, "ranking", "settings");
const publicRankRef = (uid: string) => doc(requireFirestore(), "leaderboard", uid);

export async function getRankingState(uid: string): Promise<{ totalRP: number; rankedActivities: number }> {
  const db = requireFirestore();
  const [state, ledger] = await Promise.all([
    getDoc(doc(db, "users", uid, "ranking", "state")),
    getDocs(userCollection(uid, "rankedActivities")),
  ]);
  const value = state.exists() && typeof state.data().totalRP === "number" ? state.data().totalRP : 0;
  return { totalRP: value, rankedActivities: ledger.size };
}

export async function backfillHistoricalRanking(uid: string): Promise<{ awarded: number; earnedRP: number }> {
  const db = requireFirestore();
  const [completions, ledger] = await Promise.all([
    getDocs(userCollection(uid, "activityCompletions")),
    getDocs(userCollection(uid, "rankedActivities")),
  ]);
  const alreadyRanked = new Set(ledger.docs.map(item => item.id));
  let awarded = 0;
  let earnedRP = 0;

  for (const completion of completions.docs) {
    const activityId = completion.id;
    if (alreadyRanked.has(activityId)) continue;
    const activityRef = doc(db, "activities", activityId);
    const completionRef = doc(db, "users", uid, "activityCompletions", activityId);
    const ledgerRef = doc(db, "users", uid, "rankedActivities", activityId);
    const stateRef = rankStateRef(uid);
    const settingsRef = rankSettingsRef(uid);
    const publicRef = publicRankRef(uid);
    const outcome = await runTransaction(db, async transaction => {
      const [activity, existingCompletion, existingLedger, state, settings] = await Promise.all([
        transaction.get(activityRef), transaction.get(completionRef), transaction.get(ledgerRef), transaction.get(stateRef), transaction.get(settingsRef),
      ]);
      if (!activity.exists() || !existingCompletion.exists() || existingLedger.exists()) return null;
      const priority = (activity.data().priority ?? "media") as Priority;
      const points = pointsForActivity(priority);
      const totalRP = (state.exists() && typeof state.data().totalRP === "number" ? state.data().totalRP : 0) + points;
      transaction.set(ledgerRef, { activityId, points, awardedAt: serverTimestamp() });
      transaction.set(stateRef, { totalRP, lastActivityId: activityId, updatedAt: serverTimestamp() });
      if (settings.exists() && settings.data().visible === true) {
        transaction.set(publicRef, { displayName: text(settings.data().publicName, "Aluno"), totalRP, updatedAt: serverTimestamp() });
      }
      return points;
    });
    if (outcome !== null) {
      alreadyRanked.add(activityId);
      awarded += 1;
      earnedRP += outcome;
    }
  }
  return { awarded, earnedRP };
}

export async function getRankingSettings(uid: string): Promise<RankingSettings> {
  const snapshot = await getDoc(rankSettingsRef(uid));
  if (!snapshot.exists()) return { publicName: "", visible: false };
  const data = snapshot.data();
  return { publicName: text(data.publicName), visible: data.visible === true };
}

export async function listLeaderboard(): Promise<LeaderboardEntry[]> {
  const snapshot = await getDocs(collection(requireFirestore(), "leaderboard"));
  return snapshot.docs.map(item => ({
    uid: item.id,
    displayName: text(item.data().displayName, "Aluno"),
    totalRP: typeof item.data().totalRP === "number" ? item.data().totalRP : 0,
  })).sort((a, b) => b.totalRP - a.totalRP || a.displayName.localeCompare(b.displayName, "pt-BR"));
}

export async function saveRankingSettings(uid: string, settings: RankingSettings): Promise<void> {
  const db = requireFirestore();
  const stateRef = doc(db, "users", uid, "ranking", "state");
  const settingsRef = doc(db, "users", uid, "ranking", "settings");
  const publicRef = doc(db, "leaderboard", uid);
  await runTransaction(db, async transaction => {
    const stateSnapshot = await transaction.get(stateRef);
    const totalRP = stateSnapshot.exists() && typeof stateSnapshot.data().totalRP === "number" ? stateSnapshot.data().totalRP : 0;
    if (!stateSnapshot.exists()) transaction.set(stateRef, { totalRP: 0, lastActivityId: null, updatedAt: serverTimestamp() });
    transaction.set(settingsRef, { publicName: settings.publicName.trim(), visible: settings.visible, updatedAt: serverTimestamp() });
    if (settings.visible) transaction.set(publicRef, { displayName: settings.publicName.trim(), totalRP, updatedAt: serverTimestamp() });
    else transaction.delete(publicRef);
  });
}

async function newlyUnlocked(uid: string, before: Set<string>): Promise<string[]> {
  const current = await listAchievements(uid);
  return current.filter(item => item.unlocked && !before.has(item.code)).map(item => item.code);
}

export async function toggleCompletion(uid: string, activityId: string): Promise<{ completed: boolean; newlyUnlocked: string[]; earnedRP: number }> {
  const db = requireFirestore();
  const reference = doc(db, "users", uid, "activityCompletions", activityId);
  const before = new Set((await listAchievements(uid)).filter(item => item.unlocked).map(item => item.code));
  const outcome = await runTransaction(db, async transaction => {
    const activityRef = doc(db, "activities", activityId);
    const ledgerRef = doc(db, "users", uid, "rankedActivities", activityId);
    const stateRef = doc(db, "users", uid, "ranking", "state");
    const settingsRef = doc(db, "users", uid, "ranking", "settings");
    const publicRef = doc(db, "leaderboard", uid);
    const [completion, activity, ledger, state, settings] = await Promise.all([
      transaction.get(reference),
      transaction.get(activityRef),
      transaction.get(ledgerRef),
      transaction.get(stateRef),
      transaction.get(settingsRef),
    ]);
    if (completion.exists()) {
      transaction.delete(reference);
      return { completed: false, earnedRP: 0 };
    }
    if (!activity.exists()) throw new Error("Atividade não encontrada.");
    const totalBefore = state.exists() && typeof state.data().totalRP === "number" ? state.data().totalRP : 0;
    const earnedRP = ledger.exists() ? 0 : pointsForActivity((activity.data().priority ?? "media") as Priority);
    const totalAfter = totalBefore + earnedRP;
    transaction.set(reference, { activityId, completedAt: serverTimestamp() });
    if (!ledger.exists()) transaction.set(ledgerRef, { activityId, points: earnedRP, awardedAt: serverTimestamp() });
    if (!state.exists() || earnedRP > 0) transaction.set(stateRef, {
      totalRP: totalAfter,
      lastActivityId: earnedRP > 0 ? activityId : (state.exists() ? state.data().lastActivityId ?? null : null),
      updatedAt: serverTimestamp(),
    });
    if (settings.exists() && settings.data().visible === true) {
      transaction.set(publicRef, {
        displayName: text(settings.data().publicName, "Aluno"),
        totalRP: totalAfter,
        updatedAt: serverTimestamp(),
      });
    }
    return { completed: true, earnedRP };
  });
  return {
    ...outcome,
    newlyUnlocked: outcome.completed ? await newlyUnlocked(uid, before) : [],
  };
}

export async function recordStudySession(input: {
  uid: string;
  durationMinutes: number;
  subjectId: string | null;
  activityId: string | null;
  kind?: "pomodoro" | "livre";
  sessionId?: string;
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
  const sessionData = {
    durationMinutes: input.durationMinutes,
    subjectId,
    activityId: input.activityId,
    kind: input.kind ?? "pomodoro",
    startedAt: new Date(completedAt.getTime() - input.durationMinutes * 60_000),
    completedAt: serverTimestamp(),
  };
  if (input.sessionId) {
    if (!/^[A-Za-z0-9_-]{1,120}$/.test(input.sessionId)) throw new Error("Identificador de sessão inválido.");
    const reference = doc(requireFirestore(), "users", input.uid, "studySessions", input.sessionId);
    await runTransaction(db, async transaction => {
      if ((await transaction.get(reference)).exists()) return;
      transaction.set(reference, sessionData);
    });
  } else {
    await addDoc(userCollection(input.uid, "studySessions"), sessionData);
  }
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
    five_completions: completedCount,
    ten_completions: completedCount,
    twentyfive_completions: completedCount,
    fifty_completions: completedCount,
    hundred_completions: completedCount,
    three_day_streak: calculateStreak(sessions),
    seven_day_streak: calculateStreak(sessions),
    five_pomodoro_sessions: sessions.filter(session => session.kind === "pomodoro").length,
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

export const defaultVisualPreferences: VisualPreferences = { accent: "lime", surface: "graphite", texture: "plain", density: "comfortable" };

export async function getVisualPreferences(uid: string): Promise<VisualPreferences> {
  const snapshot = await getDoc(doc(requireFirestore(), "users", uid, "preferences", "visual"));
  if (!snapshot.exists()) return defaultVisualPreferences;
  const data = snapshot.data();
  return {
    accent: data.accent === "indigo" || data.accent === "coral" || data.accent === "violet" ? data.accent : "lime",
    surface: data.surface === "ink" || data.surface === "plum" ? data.surface : "graphite",
    texture: data.texture === "grid" ? "grid" : "plain",
    density: data.density === "compact" ? "compact" : "comfortable",
  };
}

export async function saveVisualPreferences(uid: string, preferences: VisualPreferences): Promise<void> {
  await setDoc(doc(requireFirestore(), "users", uid, "preferences", "visual"), {
    ...preferences,
    updatedAt: serverTimestamp(),
  }, { merge: true });
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
  const [activities, sessions, achievements, plannerNote, visualPreferences, weeklyGoal, rankingState, rankingSettings] = await Promise.all([
    listActivities(uid), listStudySessions(uid), listAchievements(uid), getPlannerNote(uid), getVisualPreferences(uid), getWeeklyGoal(uid), getRankingState(uid), getRankingSettings(uid),
  ]);
  const payload = { exportedAt: new Date().toISOString(), activities, studySessions: sessions, achievements, plannerNote, visualPreferences, weeklyGoal, rankingState, rankingSettings };
  const csvRows = activities.map(item => [item.title, item.subject.name, item.dueDate ? dateKey(item.dueDate) : "", item.completed ? "sim" : "não", item.estimatedMinutes]
    .map(value => `"${String(value).replaceAll('"', '""')}"`).join(","));
  return {
    json: JSON.stringify(payload, null, 2),
    csv: ["atividade,matéria,prazo,concluída,estimativa_minutos", ...csvRows].join("\n"),
    fileName: `dashboard-2b-${dateKey(new Date())}`,
  };
}
