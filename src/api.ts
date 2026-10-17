import type { Analysis, CaseInput, Fact, SourceDocument } from "../shared/schemas.ts";

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
