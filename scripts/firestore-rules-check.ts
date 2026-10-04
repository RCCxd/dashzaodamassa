import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, serverTimestamp, setDoc, Timestamp, updateDoc } from "firebase/firestore";

const projectId = "demo-dashboard2b";
const adminUid = "rules-test-admin";
const studentUid = "rules-test-student";
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
    await assertFails(setDoc(doc(studentDb, "subjects", "forbidden"), {
      name: "Invasão",
      color: "#5B6CFF",
      teacher: null,
      schedule: null,
      description: null,
    }));
    await assertFails(getDoc(doc(studentDb, "users", adminUid, "planner", "quickNote")));
    await assertFails(getDoc(doc(guestDb, "subjects", "math")));

    await assertSucceeds(setDoc(doc(studentDb, "users", studentUid, "activityCompletions", "activity-1"), {
      activityId: "activity-1",
      completedAt: serverTimestamp(),
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

    console.log("Firestore Rules: 11 verificações positivas/negativas passaram.");
  } finally {
    await environment.cleanup();
  }
}

await run();
