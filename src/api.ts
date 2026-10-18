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

export function analyzeCase(input: CaseInput, facts: Fact[], photos: { filename: string; description: string }[] = []) {
  return post<Analysis>("/api/analyze", { input, facts, ...(photos.length ? { photos } : {}) });
}

export type Uploaded =
  | { kind: "txt" | "pdf"; filename: string; pages: string[] }
  | { kind: "image"; filename: string; image: Omit<PhotoEvidence["metadata"], "origin"> };

export function uploadDocument(file: File) {
  return postFile<Uploaded>("/api/documents", file);
}

/** steps: the AI's current next steps, so the reply can say which photo requests this photo answers. */
export function describePhoto(file: File, steps: { id: string; action: string }[]) {
  return postFile<{ description: string; sha256: string; answersStepIds: string[] }>("/api/photos/describe", file, {
    steps: JSON.stringify(steps),
  });
}

async function postFile<T>(url: string, file: File, fields: Record<string, string> = {}): Promise<T> {
  const body = new FormData();
  for (const [name, value] of Object.entries(fields)) body.append(name, value);
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
