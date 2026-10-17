import type { Analysis, CaseInput, Fact, PhotoEvidence, SourceDocument } from "../shared/schemas.ts";

async function post<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new Error("Couldn't reach the server. Is `npm run dev` running?");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status}).`);
  return data as T;
}

export function extractFacts(document: Pick<SourceDocument, "id" | "filename" | "pages">) {
  return post<{ facts: Fact[]; droppedCount: number }>("/api/extract", { document });
}

export function analyzeCase(input: CaseInput, facts: Fact[]) {
  return post<Analysis>("/api/analyze", { input, facts });
}

export type Uploaded =
  | { kind: "txt" | "pdf"; filename: string; pages: string[] }
  | { kind: "image"; filename: string; image: Omit<PhotoEvidence["metadata"], "origin"> };

export function uploadDocument(file: File) {
  return postFile<Uploaded>("/api/documents", file);
}

export function describePhoto(file: File) {
  return postFile<{ description: string; sha256: string }>("/api/photos/describe", file);
}

async function postFile<T>(url: string, file: File): Promise<T> {
  const body = new FormData();
  body.append("file", file, file.name);
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", body });
  } catch {
    throw new Error("Couldn't reach the server. Is `npm run dev` running?");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status}).`);
  return data as T;
}
