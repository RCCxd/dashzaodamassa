import { del, get, issueSignedToken, presignUrl } from "@vercel/blob";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { createRemoteJWKSet, jwtVerify } from "jose";

type ApiRequest = IncomingMessage & {
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
};
type ApiResponse = ServerResponse & {
  status(code: number): ApiResponse;
  json(body: unknown): void;
  send(body: string | Buffer): void;
};
type FirebaseClaims = { uid: string; token: string };
type FirestoreDocument = { fields?: Record<string, { stringValue?: string }> };

const MAX_PDF_BYTES = 10 * 1024 * 1024;
const firebaseKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));

function json(response: ApiResponse, status: number, body: unknown) {
  response.setHeader("Cache-Control", "private, no-store, max-age=0");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.status(status).json(body);
}

function scalar(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function safeId(value: string): boolean {
  return /^[A-Za-z0-9_-]{1,128}$/.test(value);
}

function validateTaskPath(pathname: string, uid: string, activityId: string): boolean {
  const prefix = `2b-private/${uid}/${activityId}/`;
  const filename = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : "";
  return filename.length >= 8 && filename.length <= 190 && /^[A-Za-z0-9_.-]+\.pdf$/i.test(filename);
}

function projectId(): string {
  const value = process.env.VITE_FIREBASE_PROJECT_ID?.trim();
  if (!value) throw new Error("O projeto Firebase não está configurado na Function.");
  return value;
}

function adminUid(): string {
  const value = process.env.VITE_FIREBASE_ADMIN_UID?.trim();
  if (!value) throw new Error("O UID administrador não está configurado na Function.");
  return value;
}

async function authenticate(request: ApiRequest): Promise<FirebaseClaims> {
  const authorization = request.headers.authorization;
  const token = typeof authorization === "string" && authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
  if (!token) throw new Error("Entre na conta para continuar.");
  const id = projectId();
  let payload;
  try {
    ({ payload } = await jwtVerify(token, firebaseKeys, {
      issuer: `https://securetoken.google.com/${id}`,
      audience: id,
      algorithms: ["RS256"],
    }));
  } catch {
    throw new Error("Sessão Firebase inválida.");
  }
  if (typeof payload.sub !== "string" || payload.sub.length < 1 || payload.sub.length > 128) {
    throw new Error("Sessão Firebase inválida.");
  }
  return { uid: payload.sub, token };
}

async function readActivity(activityId: string, token: string) {
  const id = projectId();
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(id)}/databases/(default)/documents/activities/${encodeURIComponent(activityId)}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Não foi possível validar a atividade no Firestore.");
  return await response.json() as FirestoreDocument;
}

function stringField(document: FirestoreDocument | null, field: string): string {
  return document?.fields?.[field]?.stringValue ?? "";
}

function filenameFor(document: FirestoreDocument | null): string {
  const raw = stringField(document, "attachmentName");
  const normalized = raw.replace(/[\\/\r\n\u0000-\u001f\u007f]/g, "_").trim().slice(0, 150);
  return normalized.toLowerCase().endsWith(".pdf") ? normalized : "atividade.pdf";
}

function statusFor(error: unknown): number {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("Entre na conta") || message.includes("Sessão Firebase")) return 401;
  if (message.includes("administrador") || message.includes("Não autorizado")) return 403;
  if (message.includes("Caminho de arquivo inválido") || message.includes("O arquivo precisa ser PDF")) return 400;
  return 500;
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const method = request.method ?? "GET";
  try {
    const auth = await authenticate(request);
    const mode = scalar(request.query?.mode);

    if (method === "POST" && mode === "upload") {
      if (auth.uid !== adminUid()) throw new Error("Apenas o administrador pode anexar PDFs.");
      const body = request.body as { pathname?: unknown; activityId?: unknown; size?: unknown; contentType?: unknown } | undefined;
      const pathname = typeof body?.pathname === "string" ? body.pathname : "";
      const activityId = typeof body?.activityId === "string" ? body.activityId : "";
      const size = typeof body?.size === "number" ? body.size : 0;
      if (!safeId(activityId) || !validateTaskPath(pathname, auth.uid, activityId)) throw new Error("Caminho de arquivo inválido.");
      if (!Number.isInteger(size) || size < 1 || size > MAX_PDF_BYTES || body?.contentType !== "application/pdf") {
        throw new Error("O arquivo precisa ser PDF e ter até 10 MB.");
      }
      const validUntil = Date.now() + 3 * 60_000;
      const constraints = { allowedContentTypes: ["application/pdf"], maximumSizeInBytes: MAX_PDF_BYTES, validUntil };
      const signedToken = await issueSignedToken({ pathname, operations: ["put"], ...constraints });
      const signedUrl = await presignUrl(signedToken, {
        operation: "put",
        pathname,
        access: "private",
        ...constraints,
        addRandomSuffix: false,
        allowOverwrite: false,
      });
      json(response, 200, { url: signedUrl.presignedUrl });
      return;
    }

    if (method === "GET" && mode === "download") {
      const pathname = scalar(request.query?.path);
      const activityId = scalar(request.query?.activityId);
      if (!safeId(activityId) || !validateTaskPath(pathname, adminUid(), activityId)) {
        json(response, 404, { error: "Arquivo não encontrado." });
        return;
      }
      const activity = await readActivity(activityId, auth.token);
      if (!activity || stringField(activity, "attachmentPath") !== pathname) {
        json(response, 404, { error: "Arquivo não encontrado." });
        return;
      }
      const blob = await get(pathname, { access: "private" });
      if (!blob || blob.statusCode !== 200) {
        json(response, 404, { error: "Arquivo não encontrado." });
        return;
      }
      response.statusCode = 200;
      response.setHeader("Content-Type", "application/pdf");
      response.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filenameFor(activity))}`);
      response.setHeader("X-Content-Type-Options", "nosniff");
      response.setHeader("Cache-Control", "private, no-store, max-age=0");
      Readable.fromWeb(blob.stream as import("node:stream/web").ReadableStream<Uint8Array>).pipe(response);
      return;
    }

    if (method === "DELETE" && mode === "delete") {
      if (auth.uid !== adminUid()) throw new Error("Apenas o administrador pode remover PDFs.");
      const pathname = scalar(request.query?.path);
      const activityId = scalar(request.query?.activityId);
      if (!safeId(activityId) || !validateTaskPath(pathname, auth.uid, activityId)) {
        json(response, 404, { error: "Arquivo não encontrado." });
        return;
      }
      const activity = await readActivity(activityId, auth.token);
      if (activity && stringField(activity, "attachmentPath") === pathname) {
        json(response, 409, { error: "Remova primeiro o anexo da atividade." });
        return;
      }
      await del(pathname);
      json(response, 200, { success: true });
      return;
    }

    json(response, 405, { error: "Método não permitido." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    if (statusFor(error) >= 500) console.error("Falha na API privada de anexos:", error);
    json(response, statusFor(error), { error: message });
  }
}
