// assemblePacket(): the referee. Pure code, runs in the browser. Status is decided
// here and nowhere else: a statement is ✓ backed only if it links to a fact whose
// excerpt is confirmed to be in a document that's still part of the case.
import { findExcerpt } from "./excerpt.ts";
import type { Analysis, CaseState, Fact, Packet, StatementResult } from "./schemas.ts";

/** Facts that survive re-checking against the documents currently in the case. */
export function verifiedFacts(state: Pick<CaseState, "documents" | "facts">): Fact[] {
  const out: Fact[] = [];
  for (const doc of state.documents) {
    const extraction = state.facts[doc.id];
    if (doc.status !== "ready" || extraction?.status !== "done") continue;
    for (const fact of extraction.facts) {
      if (fact.documentId === doc.id && findExcerpt(doc.pages, fact.excerpt)) out.push(fact);
    }
  }
  return out;
}

export function assemblePacket(state: Pick<CaseState, "documents" | "facts">, analysis: Analysis): Packet {
  const facts = verifiedFacts(state);
  const factIds = new Set(facts.map((f) => f.id));

  const statements: StatementResult[] = analysis.statements.map((statement) => {
    const links = analysis.links.filter((l) => l.statementId === statement.id);
    const supporting = unique(links.flatMap((l) => l.supports)).filter((id) => factIds.has(id));
    const contradicting = unique(links.flatMap((l) => l.contradicts)).filter((id) => factIds.has(id));
    return {
      statement,
      status: supporting.length > 0 ? "backed" : "your_word_only",
      factIds: supporting,
      contradictingFactIds: contradicting,
    };
  });

  const droppedFactCount = Object.values(state.facts).reduce((n, f) => n + f.droppedCount, 0);

  return {
    needsAttention: { conflicts: [], gaps: [] },
    followUps: [],
    statements,
    timeline: [],
    undated: [],
    evidence: [],
    summary: { text: analysis.summary, origin: "ai" },
    droppedFactCount,
  };
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}
