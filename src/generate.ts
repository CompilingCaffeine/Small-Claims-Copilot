import { verifiedFacts } from "../shared/packet.ts";
import type { CaseState, DocumentFacts, SourceDocument } from "../shared/schemas.ts";
import { analyzeCase, extractFacts } from "./api.ts";

export type Update = (fn: (s: CaseState) => CaseState) => void;

/** Why Generate is disabled, or null when it can run. */
export function cannotGenerateReason(state: CaseState): string | null {
  if (!state.input.description.trim() && state.documents.length === 0)
    return "Add a description in Describe or at least one document first.";
  return null;
}

export async function extractDocument(doc: SourceDocument, update: Update): Promise<DocumentFacts> {
  update((s) => ({ ...s, facts: { ...s.facts, [doc.id]: { status: "pending", facts: [], droppedCount: 0 } } }));
  let result: DocumentFacts;
  try {
    result = { status: "done", ...(await extractFacts(doc)) };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Extraction failed.";
    result = { status: "failed", facts: [], droppedCount: 0, error };
  }
  // Skip the write if the document was removed while it was being read.
  update((s) => (s.documents.some((d) => d.id === doc.id) ? { ...s, facts: { ...s.facts, [doc.id]: result } } : s));
  return result;
}

/**
 * Extracts any documents not yet read (cached facts are reused), then asks for the
 * analysis. Returns an error message, or null on success. On failure the previous
 * analysis and all inputs are kept.
 */
export async function generatePacket(state: CaseState, update: Update): Promise<string | null> {
  const toExtract = state.documents.filter((d) => d.status === "ready" && state.facts[d.id]?.status !== "done");
  const results = await Promise.all(toExtract.map((doc) => extractDocument(doc, update)));
  // Combine results directly: React may not have applied the state updates yet.
  const facts = { ...state.facts, ...Object.fromEntries(toExtract.map((d, i) => [d.id, results[i]!])) };

  try {
    const analysis = await analyzeCase(state.input, verifiedFacts({ documents: state.documents, facts }));
    update((s) => ({ ...s, analysis, generatedAt: new Date().toISOString() }));
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Couldn't generate the packet.";
  }
}
