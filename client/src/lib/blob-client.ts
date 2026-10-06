import { nanoid } from "nanoid";
import { adminUid, requireAuth } from "@/lib/firebase";

export const MAX_TASK_PDF_BYTES = 10 * 1024 * 1024;

export type TaskAttachment = {
  attachmentPath: string;
  attachmentName: string;
  attachmentSize: number;
};

function safeFilename(name: string): string {
  const base = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9_.-]/g, "_").slice(-120);
  return base.toLowerCase().endsWith(".pdf") ? base : `${base || "atividade"}.pdf`;
}

async function idToken(): Promise<string> {
  const user = requireAuth().currentUser;
  if (!user) throw new Error("Entre na sua conta novamente.");
  return user.getIdToken();
}

function responseError(payload: unknown, fallback: string, status?: number): string {
  if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") return payload.error;
  return status ? `${fallback} (HTTP ${status}).` : fallback;
}

export async function uploadTaskPdf(file: File, activityId: string): Promise<TaskAttachment> {
  if (!adminUid) throw new Error("Defina VITE_FIREBASE_ADMIN_UID no deploy antes de anexar PDFs.");
  if (file.size < 1 || file.size > MAX_TASK_PDF_BYTES) throw new Error("O PDF precisa ter no máximo 10 MB.");
  if ((file.type && file.type !== "application/pdf") || !file.name.toLowerCase().endsWith(".pdf")) throw new Error("Escolha um arquivo PDF válido.");
  const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (new TextDecoder().decode(signature) !== "%PDF-") throw new Error("O conteúdo do arquivo não corresponde a um PDF válido.");
  const pathname = `2b-private/${adminUid}/${activityId}/${nanoid(12)}-${safeFilename(file.name)}`;
  const token = await idToken();
  const authorization = { Authorization: `Bearer ${token}` };
  const signResponse = await fetch("/api/blob?mode=upload", {
    method: "POST",
    headers: { ...authorization, "Content-Type": "application/json" },
    body: JSON.stringify({ pathname, activityId, size: file.size, contentType: "application/pdf" }),
  });
  const signPayload: unknown = await signResponse.json().catch(() => null);
  if (!signResponse.ok || !signPayload || typeof signPayload !== "object" || !("url" in signPayload) || typeof signPayload.url !== "string") {
    throw new Error(responseError(signPayload, "Não foi possível iniciar o upload. Confirme se api/blob.ts foi publicada e se a Blob privada está conectada ao projeto e ambiente Vercel", signResponse.status));
  }
  const uploadResponse = await fetch(signPayload.url, {
    method: "PUT",
    headers: { "Content-Type": "application/pdf" },
    body: file,
  });
  if (!uploadResponse.ok) throw new Error(`O Vercel Blob rejeitou o PDF (${uploadResponse.status}). Confira os limites gratuitos e a store privada.`);
  return { attachmentPath: pathname, attachmentName: file.name.slice(0, 180), attachmentSize: file.size };
}

export async function downloadTaskPdf(pathname: string, activityId: string, filename: string): Promise<void> {
  const response = await fetch(`/api/blob?mode=download&activityId=${encodeURIComponent(activityId)}&path=${encodeURIComponent(pathname)}`, {
    headers: { Authorization: `Bearer ${await idToken()}` },
  });
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    throw new Error(responseError(payload, "Não foi possível abrir o PDF. Confirme seu login, o anexo da atividade e a Blob privada", response.status));
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "atividade.pdf";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function deleteTaskPdf(pathname: string, activityId: string): Promise<void> {
  const response = await fetch(`/api/blob?mode=delete&activityId=${encodeURIComponent(activityId)}&path=${encodeURIComponent(pathname)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${await idToken()}` },
  });
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    throw new Error(responseError(payload, "O anexo antigo continua no Blob; o registro da atividade foi salvo", response.status));
  }
}
