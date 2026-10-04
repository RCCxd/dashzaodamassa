import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import mysql, { type ConnectionOptions, type RowDataPacket } from "mysql2/promise";
import { cert, deleteApp, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type DocumentData } from "firebase-admin/firestore";

type Row = RowDataPacket & Record<string, unknown>;
type PendingWrite = { path: string; data: DocumentData };

function fail(message: string): never {
  console.error(`Migração cancelada: ${message}`);
  process.exitCode = 1;
  throw new Error(message);
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) fail(`defina ${name} apenas no ambiente local de migração.`);
  return value;
}

function safeDate(value: unknown, nullable = true): Date | null {
  if (value === null || value === undefined || value === "") {
    if (nullable) return null;
    throw new Error("registro contém uma data obrigatória ausente.");
  }
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new Error("registro contém uma data inválida.");
  return date;
}

function safeNumber(value: unknown, fallback = 0): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function optionalText(value: unknown): string | null {
  return value === null || value === undefined || value === "" ? null : String(value);
}

async function main() {
  const sourceUrl = requiredEnv("LEGACY_DATABASE_URL");
  const serviceAccountInput = requiredEnv("FIREBASE_SERVICE_ACCOUNT_PATH");
  if (!path.isAbsolute(serviceAccountInput)) fail("FIREBASE_SERVICE_ACCOUNT_PATH precisa ser um caminho absoluto para um arquivo local.");
  const serviceAccountPath = path.resolve(serviceAccountInput);
  const adminUid = requiredEnv("FIREBASE_ADMIN_UID");
  const apply = process.argv.includes("--apply");
  const overwrite = process.argv.includes("--overwrite");

  let credentials: ServiceAccount;
  try {
    credentials = JSON.parse(readFileSync(serviceAccountPath, "utf8")) as ServiceAccount;
  } catch {
    fail("não foi possível ler o JSON da service account; mantenha-o fora do repositório.");
  }
  if (!credentials.projectId && !(credentials as ServiceAccount & { project_id?: string }).project_id) {
    fail("o JSON da service account não informa o projeto Firebase.");
  }

  const source = new URL(sourceUrl);
  const sourceTls = process.env.LEGACY_DATABASE_TLS?.trim().toLowerCase() === "true";
  const connectionConfig: ConnectionOptions = {
    host: source.hostname,
    port: source.port ? Number(source.port) : 3306,
    user: decodeURIComponent(source.username),
    password: decodeURIComponent(source.password),
    database: decodeURIComponent(source.pathname.replace(/^\//, "")),
    connectTimeout: 15_000,
    ssl: sourceTls ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined,
  };

  const app = getApps()[0] ?? initializeApp({ credential: cert(credentials) });
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const connection = await mysql.createConnection(connectionConfig);
  const writes: PendingWrite[] = [];
  let openTransaction = false;

  try {
    await connection.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    await connection.query("START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY");
    openTransaction = true;

    const select = async (sql: string) => {
      const [rows] = await connection.query<Row[]>(sql);
      return rows;
    };

    const [users, subjects, activities, completions, sessions, notes, goals] = await Promise.all([
      select("SELECT id, name, email, role, createdAt FROM users"),
      select("SELECT id, name, color, teacher, schedule, description, createdAt, updatedAt FROM subjects"),
      select("SELECT id, subjectId, title, description, type, priority, status, dueDate, resourceUrl, estimatedMinutes, createdAt, updatedAt FROM activities"),
      select("SELECT id, userId, activityId, completedAt FROM activity_completions"),
      select("SELECT id, userId, subjectId, activityId, durationMinutes, kind, startedAt, completedAt FROM study_sessions"),
      select("SELECT id, userId, content, updatedAt FROM quick_notes"),
      select("SELECT id, userId, weekStart, targetMinutes, targetSessions FROM weekly_goals"),
    ]);

    const firebaseUsers = new Map<string, { uid: string; email: string }>();
    let pageToken: string | undefined;
    do {
      const page = await auth.listUsers(1000, pageToken);
      for (const user of page.users) if (user.email) firebaseUsers.set(user.email.trim().toLowerCase(), { uid: user.uid, email: user.email });
      pageToken = page.pageToken;
    } while (pageToken);

    const uidByLegacyId = new Map<number, string>();
    let unmappedUsers = 0;
    let unmappedAdmins = 0;
    for (const user of users) {
      const email = optionalText(user.email)?.trim().toLowerCase();
      const firebaseUser = email ? firebaseUsers.get(email) : undefined;
      if (!firebaseUser) {
        unmappedUsers += 1;
        if (String(user.role) === "admin") unmappedAdmins += 1;
        continue;
      }
      uidByLegacyId.set(safeNumber(user.id), firebaseUser.uid);
      const isSourceAdmin = String(user.role) === "admin";
      if (isSourceAdmin && firebaseUser.uid !== adminUid) {
        fail("a conta Firebase que corresponde ao administrador do banco antigo não coincide com FIREBASE_ADMIN_UID.");
      }
      writes.push({
        path: `users/${firebaseUser.uid}`,
        data: {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: optionalText(user.name) ?? firebaseUser.email.split("@")[0],
          role: isSourceAdmin ? "admin" : "student",
          createdAt: safeDate(user.createdAt) ?? new Date(),
          updatedAt: new Date(),
        },
      });
    }

    if (unmappedAdmins > 0) fail("a conta admin legada precisa existir primeiro no Firebase Auth com o mesmo e-mail.");

    const privateRowsByUser = new Map<number, number>();
    for (const row of [...completions, ...sessions, ...notes, ...goals]) {
      const userId = safeNumber(row.userId, -1);
      privateRowsByUser.set(userId, (privateRowsByUser.get(userId) ?? 0) + 1);
    }
    const unmappedPrivateUsers = [...privateRowsByUser.keys()].filter(id => !uidByLegacyId.has(id)).length;
    if (unmappedPrivateUsers > 0) {
      fail(`${unmappedPrivateUsers} usuário(s) com dados pessoais ainda não têm conta Firebase com o mesmo e-mail; crie as contas, sem enviar senhas ao script, e rode novamente.`);
    }

    for (const subject of subjects) {
      const id = String(subject.id);
      writes.push({
        path: `subjects/${id}`,
        data: {
          name: String(subject.name),
          color: String(subject.color ?? "#5B6CFF"),
          teacher: optionalText(subject.teacher),
          schedule: optionalText(subject.schedule),
          description: optionalText(subject.description),
          createdAt: safeDate(subject.createdAt) ?? new Date(),
          updatedAt: safeDate(subject.updatedAt) ?? new Date(),
        },
      });
    }
    for (const activity of activities) {
      const id = String(activity.id);
      writes.push({
        path: `activities/${id}`,
        data: {
          subjectId: String(activity.subjectId),
          title: String(activity.title),
          description: optionalText(activity.description),
          type: String(activity.type ?? "tarefa"),
          priority: String(activity.priority ?? "media"),
          status: String(activity.status ?? "pendente"),
          dueDate: safeDate(activity.dueDate),
          resourceUrl: optionalText(activity.resourceUrl),
          estimatedMinutes: safeNumber(activity.estimatedMinutes, 30),
          createdAt: safeDate(activity.createdAt) ?? new Date(),
          updatedAt: safeDate(activity.updatedAt) ?? new Date(),
        },
      });
    }
    for (const completion of completions) {
      const uid = uidByLegacyId.get(safeNumber(completion.userId));
      if (!uid) continue;
      const activityId = String(completion.activityId);
      writes.push({
        path: `users/${uid}/activityCompletions/${activityId}`,
        data: { activityId, completedAt: safeDate(completion.completedAt) ?? new Date() },
      });
    }
    for (const session of sessions) {
      const uid = uidByLegacyId.get(safeNumber(session.userId));
      if (!uid) continue;
      writes.push({
        path: `users/${uid}/studySessions/${String(session.id)}`,
        data: {
          durationMinutes: safeNumber(session.durationMinutes),
          subjectId: session.subjectId === null ? null : String(session.subjectId),
          activityId: session.activityId === null ? null : String(session.activityId),
          kind: session.kind === "livre" ? "livre" : "pomodoro",
          startedAt: safeDate(session.startedAt, false),
          completedAt: safeDate(session.completedAt, false),
        },
      });
    }
    for (const note of notes) {
      const uid = uidByLegacyId.get(safeNumber(note.userId));
      if (!uid) continue;
      writes.push({ path: `users/${uid}/planner/quickNote`, data: { content: String(note.content ?? ""), updatedAt: safeDate(note.updatedAt) ?? new Date() } });
    }
    for (const goal of goals) {
      const uid = uidByLegacyId.get(safeNumber(goal.userId));
      if (!uid) continue;
      const weekStart = String(goal.weekStart);
      writes.push({
        path: `users/${uid}/weeklyGoals/${weekStart}`,
        data: {
          weekStart,
          targetMinutes: safeNumber(goal.targetMinutes, 120),
          targetSessions: safeNumber(goal.targetSessions, 4),
          updatedAt: new Date(),
        },
      });
    }

    const [existingSubjects, existingActivities] = await Promise.all([
      firestore.collection("subjects").limit(1).get(),
      firestore.collection("activities").limit(1).get(),
    ]);
    if (!overwrite && ((subjects.length > 0 && !existingSubjects.empty) || (activities.length > 0 && !existingActivities.empty))) {
      fail("já há matérias/atividades no Firestore; use um projeto de destino vazio ou revise manualmente antes de passar --overwrite.");
    }

    console.log("Snapshot MySQL lido em transação consistente:");
    console.log(JSON.stringify({ users: users.length, unmappedUsers, subjects: subjects.length, activities: activities.length, completions: completions.length, studySessions: sessions.length, notes: notes.length, goals: goals.length, plannedFirestoreWrites: writes.length, firebaseProject: credentials.projectId ?? (credentials as ServiceAccount & { project_id?: string }).project_id }, null, 2));

    if (!apply) {
      console.log("Modo dry-run: nada foi gravado. Revise o mapeamento e rode novamente com --apply para importar.");
      return;
    }

    const privatePaths = writes.map(write => write.path).filter(path => path.startsWith("users/") && !/^users\/[^/]+$/.test(path));
    if (!overwrite) {
      for (const user of new Set(privatePaths.map(path => path.split("/")[1]))) {
        const nested = ["activityCompletions", "studySessions", "planner", "weeklyGoals"];
        const snapshots = await Promise.all(nested.map(name => firestore.collection("users").doc(user).collection(name).limit(1).get()));
        if (snapshots.some(snapshot => !snapshot.empty)) fail("já existem dados pessoais no Firestore; revise o destino ou rode com --overwrite após conferir o backup.");
      }
    }

    for (let offset = 0; offset < writes.length; offset += 450) {
      const batch = firestore.batch();
      for (const item of writes.slice(offset, offset + 450)) batch.set(firestore.doc(item.path), item.data, { merge: true });
      await batch.commit();
    }
    await firestore.doc("migrationMeta/mysql-import").set({
      completedAt: new Date(),
      sourceSnapshotCounts: { users: users.length, subjects: subjects.length, activities: activities.length, completions: completions.length, studySessions: sessions.length, notes: notes.length, goals: goals.length },
      writes: writes.length,
    }, { merge: true });
    console.log("Importação concluída. A origem MySQL permaneceu somente leitura; nenhuma conta/senha foi apagada.");
  } finally {
    if (openTransaction) await connection.rollback().catch(() => undefined);
    await connection.end().catch(() => undefined);
    await deleteApp(app).catch(() => undefined);
  }
}

main().catch(error => {
  const message = error instanceof Error ? error.message : "erro inesperado";
  console.error(`Falha na migração: ${message}`);
  process.exitCode = 1;
});
