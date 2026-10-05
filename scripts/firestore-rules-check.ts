import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, runTransaction, serverTimestamp, setDoc, Timestamp, updateDoc } from "firebase/firestore";

const projectId = "demo-dashboard2b";
const adminUid = "rules-test-admin";
const studentUid = "rules-test-student";
const otherStudentUid = "rules-test-student-two";
const rules = readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8")
  .replaceAll("REPLACE_WITH_ADMIN_UID", adminUid);

const environment = await initializeTestEnvironment({
  projectId,
  firestore: { host: "127.0.0.1", port: 8080, rules },
});

async function run() {
  try {
    const adminDb = environment.authenticatedContext(adminUid, { email: "admin@example.test" }).firestore();
    const studentDb = environment.authenticatedContext(studentUid, { email: "student@example.test" }).firestore();
    const otherStudentDb = environment.authenticatedContext(otherStudentUid, { email: "other@example.test" }).firestore();
    const guestDb = environment.unauthenticatedContext().firestore();

    await assertSucceeds(setDoc(doc(adminDb, "users", adminUid), {
      uid: adminUid,
      name: "Admin de teste",
      email: "admin@example.test",
      role: "admin",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));
    await assertSucceeds(setDoc(doc(studentDb, "users", studentUid), {
      uid: studentUid,
      name: "Aluno de teste",
      email: "student@example.test",
      role: "student",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));
    await assertSucceeds(setDoc(doc(otherStudentDb, "users", otherStudentUid), {
      uid: otherStudentUid,
      name: "Outra aluna",
      email: "other@example.test",
      role: "student",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));

    await assertFails(updateDoc(doc(studentDb, "users", studentUid), { role: "admin" }));
    await assertSucceeds(setDoc(doc(adminDb, "subjects", "math"), {
      name: "Matemática",
      color: "#5B6CFF",
      teacher: null,
      schedule: null,
      description: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));
    await assertSucceeds(getDoc(doc(studentDb, "subjects", "math")));
    await assertSucceeds(setDoc(doc(adminDb, "subjectSchedule", "math-mon"), {
      subjectId: "math", day: 1, startTime: "08:00", endTime: "08:50", room: "Sala 2",
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }));
    await assertFails(setDoc(doc(studentDb, "subjectSchedule", "forbidden-slot"), {
      subjectId: "math", day: 1, startTime: "08:00", endTime: "08:50", room: null,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }));
    const activityData = (title: string, priority: "baixa" | "media" | "alta") => ({
      subjectId: "math", title, description: null, type: "tarefa", priority, status: "pendente",
      dueDate: null, resourceUrl: null, attachmentPath: null, attachmentName: null, attachmentSize: null,
      estimatedMinutes: 30, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    await assertSucceeds(setDoc(doc(adminDb, "activities", "legacy-activity"), activityData("Atividade anterior", "media")));
    await assertSucceeds(setDoc(doc(adminDb, "activities", "new-activity"), activityData("Atividade nova", "alta")));
    await assertSucceeds(getDoc(doc(studentDb, "activities", "legacy-activity")));
    await assertFails(setDoc(doc(studentDb, "subjects", "forbidden"), {
      name: "Invasão",
      color: "#5B6CFF",
      teacher: null,
      schedule: null,
      description: null,
    }));
    await assertFails(getDoc(doc(studentDb, "users", adminUid, "planner", "quickNote")));
    await assertFails(getDoc(doc(guestDb, "subjects", "math")));

    const legacyCompletion = doc(studentDb, "users", studentUid, "activityCompletions", "legacy-activity");
    await environment.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), "users", studentUid, "activityCompletions", "legacy-activity"), {
        activityId: "legacy-activity", completedAt: Timestamp.fromDate(new Date(Date.now() - 86_400_000)),
      });
    });
    await assertSucceeds(getDoc(legacyCompletion));
    await assertFails(setDoc(doc(studentDb, "users", studentUid, "activityCompletions", "new-activity"), {
      activityId: "new-activity", completedAt: serverTimestamp(),
    }));

    const stateRef = doc(studentDb, "users", studentUid, "ranking", "state");
    const legacyLedger = doc(studentDb, "users", studentUid, "rankedActivities", "legacy-activity");
    await assertSucceeds(runTransaction(studentDb, async transaction => {
      const [activity, completion, ledger, state] = await Promise.all([
        transaction.get(doc(studentDb, "activities", "legacy-activity")), transaction.get(legacyCompletion),
        transaction.get(legacyLedger), transaction.get(stateRef),
      ]);
      if (!activity.exists() || !completion.exists() || ledger.exists()) throw new Error("Registro legado inesperado.");
      transaction.set(legacyLedger, { activityId: "legacy-activity", points: 12, awardedAt: serverTimestamp() });
      transaction.set(stateRef, { totalRP: (state.exists() ? state.data().totalRP : 0) + 12, lastActivityId: "legacy-activity", updatedAt: serverTimestamp() });
    }));
    await assertSucceeds(setDoc(doc(studentDb, "users", studentUid, "preferences", "visual"), {
      accent: "lime", surface: "graphite", texture: "grid", density: "compact", updatedAt: serverTimestamp(),
    }));
    await assertFails(getDoc(doc(otherStudentDb, "users", studentUid, "preferences", "visual")));
    await assertFails(getDoc(doc(otherStudentDb, "users", studentUid, "ranking", "state")));

    const settingsRef = doc(studentDb, "users", studentUid, "ranking", "settings");
    const publicRef = doc(studentDb, "leaderboard", studentUid);
    await assertSucceeds(runTransaction(studentDb, async transaction => {
      const state = await transaction.get(stateRef);
      transaction.set(settingsRef, { publicName: "Caderno 2B", visible: true, updatedAt: serverTimestamp() });
      transaction.set(publicRef, { displayName: "Caderno 2B", totalRP: state.data()!.totalRP, updatedAt: serverTimestamp() });
    }));
    await assertSucceeds(getDoc(publicRef));
    await assertSucceeds(getDocs(collection(otherStudentDb, "leaderboard")));
    await assertFails(getDoc(doc(otherStudentDb, "users", studentUid, "ranking", "settings")));
    await assertFails(updateDoc(publicRef, { totalRP: 999 }));
    await assertFails(setDoc(legacyLedger, { activityId: "legacy-activity", points: 12, awardedAt: serverTimestamp() }));

    const newCompletion = doc(studentDb, "users", studentUid, "activityCompletions", "new-activity");
    const newLedger = doc(studentDb, "users", studentUid, "rankedActivities", "new-activity");
    await assertSucceeds(runTransaction(studentDb, async transaction => {
      const [activity, completion, ledger, state, settings] = await Promise.all([
        transaction.get(doc(studentDb, "activities", "new-activity")), transaction.get(newCompletion),
        transaction.get(newLedger), transaction.get(stateRef), transaction.get(settingsRef),
      ]);
      if (!activity.exists() || completion.exists() || ledger.exists() || !state.exists()) throw new Error("Atividade nova inesperada.");
      const totalRP = state.data().totalRP + 15;
      transaction.set(newCompletion, { activityId: "new-activity", completedAt: serverTimestamp() });
      transaction.set(newLedger, { activityId: "new-activity", points: 15, awardedAt: serverTimestamp() });
      transaction.set(stateRef, { totalRP, lastActivityId: "new-activity", updatedAt: serverTimestamp() });
      if (settings.exists() && settings.data().visible) transaction.set(publicRef, { displayName: "Caderno 2B", totalRP, updatedAt: serverTimestamp() });
    }));
    await assertSucceeds(setDoc(doc(studentDb, "users", studentUid, "studySessions", "session-1"), {
      durationMinutes: 25,
      subjectId: "math",
      activityId: null,
      kind: "pomodoro",
      startedAt: Timestamp.fromDate(new Date(Date.now() - 25 * 60_000)),
      completedAt: serverTimestamp(),
    }));
    await assertFails(updateDoc(doc(studentDb, "users", studentUid, "studySessions", "session-1"), { durationMinutes: 30 }));
    const stateAfterFocus = await getDoc(stateRef);
    if (stateAfterFocus.data()?.totalRP !== 27) throw new Error("Sessão de foco alterou os RP.");

    await assertSucceeds(runTransaction(studentDb, async transaction => {
      transaction.set(settingsRef, { publicName: "Caderno 2B", visible: false, updatedAt: serverTimestamp() });
      transaction.delete(publicRef);
    }));
    const hiddenPublicRank = await assertSucceeds(getDoc(publicRef));
    if (hiddenPublicRank.exists()) throw new Error("O opt-out deixou o apelido visível no placar.");
    await assertFails(getDoc(doc(guestDb, "leaderboard", studentUid)));

    console.log("Firestore Rules: isolamento, agenda, ranking, opt-in, histórico, preferências e foco passaram.");
  } finally {
    await environment.cleanup();
  }
}

await run();
