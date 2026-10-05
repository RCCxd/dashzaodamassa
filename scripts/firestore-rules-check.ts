import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, runTransaction, serverTimestamp, setDoc, Timestamp, updateDoc } from "firebase/firestore";

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
    const activityData = (title: string, priority: "baixa" | "media" | "alta", type: "tarefa" | "prova" = "tarefa") => ({
      subjectId: "math", title, description: null, type, priority, status: "pendente",
      dueDate: null, resourceUrl: null, attachmentPath: null, attachmentName: null, attachmentSize: null,
      estimatedMinutes: 30, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    await assertSucceeds(setDoc(doc(adminDb, "activities", "legacy-activity"), activityData("Atividade anterior", "media")));
    await assertSucceeds(setDoc(doc(adminDb, "activities", "new-activity"), activityData("Atividade nova", "alta", "prova")));
    await assertSucceeds(setDoc(doc(adminDb, "activities", "stray-activity"), activityData("Atividade na matéria que será arquivada", "alta")));
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
      transaction.set(legacyLedger, { activityId: "legacy-activity", points: 12, awardedAt: serverTimestamp(), active: true, reversedAt: null });
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

    await assertSucceeds(setDoc(doc(adminDb, "activities", "repair-activity"), activityData("Reparo de ledger existente", "media")));
    const repairCompletion = doc(otherStudentDb, "users", otherStudentUid, "activityCompletions", "repair-activity");
    const repairLedger = doc(otherStudentDb, "users", otherStudentUid, "rankedActivities", "repair-activity");
    const repairState = doc(otherStudentDb, "users", otherStudentUid, "ranking", "state");
    await environment.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), "users", otherStudentUid, "activityCompletions", "repair-activity"), {
        activityId: "repair-activity", completedAt: Timestamp.fromDate(new Date(Date.now() - 86_400_000)),
      });
      await setDoc(doc(context.firestore(), "users", otherStudentUid, "rankedActivities", "repair-activity"), {
        activityId: "repair-activity", points: 12, awardedAt: Timestamp.fromDate(new Date(Date.now() - 86_400_000)),
        active: false, reversedAt: Timestamp.fromDate(new Date(Date.now() - 60_000)),
      });
      await setDoc(doc(context.firestore(), "users", otherStudentUid, "ranking", "state"), {
        totalRP: 0, lastActivityId: null, updatedAt: Timestamp.fromDate(new Date(Date.now() - 60_000)),
      });
    });
    await assertSucceeds(runTransaction(otherStudentDb, async transaction => {
      const [activity, completion, ledger, state] = await Promise.all([
        transaction.get(doc(otherStudentDb, "activities", "repair-activity")), transaction.get(repairCompletion),
        transaction.get(repairLedger), transaction.get(repairState),
      ]);
      if (!activity.exists() || !completion.exists() || !ledger.exists() || ledger.data().active !== false || !state.exists()) throw new Error("Reparo com conclusão existente não está preparado.");
      transaction.update(repairLedger, { points: 12, awardedAt: serverTimestamp(), active: true, reversedAt: null });
      transaction.set(repairState, { totalRP: state.data().totalRP + 12, lastActivityId: "repair-activity", updatedAt: serverTimestamp() });
    }));
    if ((await getDoc(repairState)).data()?.totalRP !== 12 || (await getDoc(repairLedger)).data()?.active !== true) throw new Error("O backfill não reativou um ledger de conclusão existente.");

    const newCompletion = doc(studentDb, "users", studentUid, "activityCompletions", "new-activity");
    const newLedger = doc(studentDb, "users", studentUid, "rankedActivities", "new-activity");
    await assertSucceeds(runTransaction(studentDb, async transaction => {
      const [activity, completion, ledger, state, settings] = await Promise.all([
        transaction.get(doc(studentDb, "activities", "new-activity")), transaction.get(newCompletion),
        transaction.get(newLedger), transaction.get(stateRef), transaction.get(settingsRef),
      ]);
      if (!activity.exists() || completion.exists() || ledger.exists() || !state.exists()) throw new Error("Atividade nova inesperada.");
      const totalRP = state.data().totalRP + 20;
      transaction.set(newCompletion, { activityId: "new-activity", completedAt: serverTimestamp() });
      transaction.set(newLedger, { activityId: "new-activity", points: 20, awardedAt: serverTimestamp(), active: true, reversedAt: null });
      transaction.set(stateRef, { totalRP, lastActivityId: "new-activity", updatedAt: serverTimestamp() });
      if (settings.exists() && settings.data().visible) transaction.set(publicRef, { displayName: "Caderno 2B", totalRP, updatedAt: serverTimestamp() });
    }));

    await assertFails(deleteDoc(newCompletion));
    await assertSucceeds(runTransaction(studentDb, async transaction => {
      const [completion, ledger, state, settings] = await Promise.all([
        transaction.get(newCompletion), transaction.get(newLedger), transaction.get(stateRef), transaction.get(settingsRef),
      ]);
      if (!completion.exists() || !ledger.exists() || !ledger.data().active || !state.exists()) throw new Error("Conclusão ativa esperada para reabrir.");
      const points = ledger.data().points as number;
      const totalRP = Math.max(0, state.data().totalRP - points);
      transaction.delete(newCompletion);
      transaction.update(newLedger, { active: false, reversedAt: serverTimestamp() });
      transaction.set(stateRef, { totalRP, lastActivityId: "new-activity", updatedAt: serverTimestamp() });
      if (settings.exists() && settings.data().visible) transaction.set(publicRef, { displayName: "Caderno 2B", totalRP, updatedAt: serverTimestamp() });
    }));
    const afterReopen = await getDoc(stateRef);
    if (afterReopen.data()?.totalRP !== 12 || (await getDoc(newLedger)).data()?.active !== false) throw new Error("Reabrir a atividade não reverteu os RP registrados.");
    if ((await getDoc(publicRef)).data()?.totalRP !== 12) throw new Error("O placar público não refletiu a perda de RP.");

    await assertSucceeds(runTransaction(studentDb, async transaction => {
      const [activity, completion, ledger, state, settings] = await Promise.all([
        transaction.get(doc(studentDb, "activities", "new-activity")), transaction.get(newCompletion),
        transaction.get(newLedger), transaction.get(stateRef), transaction.get(settingsRef),
      ]);
      if (!activity.exists() || completion.exists() || !ledger.exists() || ledger.data().active !== false || !state.exists()) throw new Error("Ledger revertido esperado para reconcluir.");
      const points = 20;
      const totalRP = state.data().totalRP + points;
      transaction.set(newCompletion, { activityId: "new-activity", completedAt: serverTimestamp() });
      transaction.update(newLedger, { points, awardedAt: serverTimestamp(), active: true, reversedAt: null });
      transaction.set(stateRef, { totalRP, lastActivityId: "new-activity", updatedAt: serverTimestamp() });
      if (settings.exists() && settings.data().visible) transaction.set(publicRef, { displayName: "Caderno 2B", totalRP, updatedAt: serverTimestamp() });
    }));

    await assertSucceeds(updateDoc(doc(adminDb, "activities", "new-activity"), {
      archived: true, archivedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }));
    await assertSucceeds(updateDoc(doc(adminDb, "subjects", "math"), {
      archived: true, archivedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }));
    const archivedCompletion = await getDoc(newCompletion);
    const archivedLedger = await getDoc(newLedger);
    if (!archivedCompletion.exists() || archivedLedger.data()?.active !== true) throw new Error("Arquivar matéria/atividade apagou o histórico do aluno.");
    await assertFails(deleteDoc(doc(adminDb, "activities", "new-activity")));
    await assertFails(deleteDoc(doc(adminDb, "subjects", "math")));
    await assertFails(updateDoc(doc(studentDb, "activities", "new-activity"), {
      archived: true, archivedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }));
    await assertFails(setDoc(doc(adminDb, "activities", "activity-in-archived-subject"), activityData("Tarefa em matéria arquivada", "alta")));
    const strayCompletion = doc(studentDb, "users", studentUid, "activityCompletions", "stray-activity");
    const strayLedger = doc(studentDb, "users", studentUid, "rankedActivities", "stray-activity");
    await assertFails(runTransaction(studentDb, async transaction => {
      const [activity, completion, ledger, state, settings] = await Promise.all([
        transaction.get(doc(studentDb, "activities", "stray-activity")), transaction.get(strayCompletion),
        transaction.get(strayLedger), transaction.get(stateRef), transaction.get(settingsRef),
      ]);
      if (!activity.exists() || completion.exists() || ledger.exists() || !state.exists()) throw new Error("A tarefa ativa de matéria arquivada não está preparada.");
      transaction.set(strayCompletion, { activityId: "stray-activity", completedAt: serverTimestamp() });
      transaction.set(strayLedger, { activityId: "stray-activity", points: 15, awardedAt: serverTimestamp(), active: true, reversedAt: null });
      transaction.set(stateRef, { totalRP: state.data().totalRP + 15, lastActivityId: "stray-activity", updatedAt: serverTimestamp() });
      if (settings.exists() && settings.data().visible) transaction.set(publicRef, { displayName: "Caderno 2B", totalRP: state.data().totalRP + 15, updatedAt: serverTimestamp() });
    }));
    if ((await getDoc(strayCompletion)).exists() || (await getDoc(strayLedger)).exists()) throw new Error("Uma atividade sob matéria arquivada gerou conclusão ou RP.");
    await assertFails(setDoc(doc(adminDb, "subjectSchedule", "archived-subject-slot"), {
      subjectId: "math", day: 2, startTime: "09:00", endTime: "09:50", room: null,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }));

    await assertSucceeds(runTransaction(studentDb, async transaction => {
      const [completion, ledger, state, settings] = await Promise.all([
        transaction.get(newCompletion), transaction.get(newLedger), transaction.get(stateRef), transaction.get(settingsRef),
      ]);
      if (!completion.exists() || !ledger.exists() || !ledger.data().active || !state.exists()) throw new Error("Conclusão arquivada esperada para reabrir.");
      const totalRP = Math.max(0, state.data().totalRP - (ledger.data().points as number));
      transaction.delete(newCompletion);
      transaction.update(newLedger, { active: false, reversedAt: serverTimestamp() });
      transaction.set(stateRef, { totalRP, lastActivityId: "new-activity", updatedAt: serverTimestamp() });
      if (settings.exists() && settings.data().visible) transaction.set(publicRef, { displayName: "Caderno 2B", totalRP, updatedAt: serverTimestamp() });
    }));
    await assertFails(runTransaction(studentDb, async transaction => {
      const [activity, completion, ledger, state, settings] = await Promise.all([
        transaction.get(doc(studentDb, "activities", "new-activity")), transaction.get(newCompletion),
        transaction.get(newLedger), transaction.get(stateRef), transaction.get(settingsRef),
      ]);
      if (!activity.exists() || completion.exists() || !ledger.exists() || ledger.data().active !== false || !state.exists()) throw new Error("Ledger arquivado inesperado.");
      const totalRP = state.data().totalRP + 20;
      transaction.set(newCompletion, { activityId: "new-activity", completedAt: serverTimestamp() });
      transaction.update(newLedger, { points: 20, awardedAt: serverTimestamp(), active: true, reversedAt: null });
      transaction.set(stateRef, { totalRP, lastActivityId: "new-activity", updatedAt: serverTimestamp() });
      if (settings.exists() && settings.data().visible) transaction.set(publicRef, { displayName: "Caderno 2B", totalRP, updatedAt: serverTimestamp() });
    }));

    await environment.withSecurityRulesDisabled(async context => {
      await deleteDoc(doc(context.firestore(), "users", studentUid, "activityCompletions", "legacy-activity"));
      await setDoc(doc(context.firestore(), "users", studentUid, "rankedActivities", "legacy-activity"), {
        activityId: "legacy-activity", points: 12, awardedAt: Timestamp.fromDate(new Date(Date.now() - 60_000)),
      });
    });
    await assertSucceeds(runTransaction(studentDb, async transaction => {
      const [legacy, completion, state, settings] = await Promise.all([
        transaction.get(legacyLedger), transaction.get(legacyCompletion), transaction.get(stateRef), transaction.get(settingsRef),
      ]);
      if (!legacy.exists() || legacy.data().active !== undefined || completion.exists() || !state.exists()) throw new Error("Ledger legado sem status ativo esperado.");
      const totalRP = Math.max(0, state.data().totalRP - legacy.data().points);
      transaction.update(legacyLedger, { active: false, reversedAt: serverTimestamp() });
      transaction.set(stateRef, { totalRP, lastActivityId: "legacy-activity", updatedAt: serverTimestamp() });
      if (settings.exists() && settings.data().visible) transaction.set(publicRef, { displayName: "Caderno 2B", totalRP, updatedAt: serverTimestamp() });
    }));
    const afterLegacyRepair = await getDoc(stateRef);
    if (afterLegacyRepair.data()?.totalRP !== 0 || (await getDoc(publicRef)).data()?.totalRP !== 0) throw new Error("A reconciliação de RP legado falhou.");

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
    if (stateAfterFocus.data()?.totalRP !== 0) throw new Error("Sessão de foco alterou os RP.");

    await assertSucceeds(runTransaction(studentDb, async transaction => {
      transaction.set(settingsRef, { publicName: "Caderno 2B", visible: false, updatedAt: serverTimestamp() });
      transaction.delete(publicRef);
    }));
    const hiddenPublicRank = await assertSucceeds(getDoc(publicRef));
    if (hiddenPublicRank.exists()) throw new Error("O opt-out deixou o apelido visível no placar.");
    await assertFails(getDoc(doc(guestDb, "leaderboard", studentUid)));

    console.log("Firestore Rules: isolamento, agenda, ranking, opt-in, arquivo lógico, histórico, preferências e foco passaram.");
  } finally {
    await environment.cleanup();
  }
}

await run();
