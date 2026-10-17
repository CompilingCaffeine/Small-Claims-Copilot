// assemblePacket(): the referee. Pure code, runs in the browser. Status is decided
// here and nowhere else: a statement is ✓ backed only if it links to a fact whose
// excerpt is confirmed to be in a document that's still part of the case.
import { detectConflicts } from "./conflicts.ts";
import { findExcerpt } from "./excerpt.ts";
import { detectFlags } from "./flags.ts";
import { contentId } from "./ids.ts";
import { leadingSteps, trailingSteps } from "./nextSteps.ts";
import { linkFor } from "./officialLinks.ts";
import type { Analysis, CaseState, Fact, NextStep, Packet, StatementResult } from "./schemas.ts";

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

export function assemblePacket(state: Pick<CaseState, "input" | "documents" | "facts">, analysis: Analysis): Packet {
  const facts = verifiedFacts(state);
  const factsById = new Map(facts.map((f) => [f.id, f]));

  const statements: StatementResult[] = analysis.statements.map((statement) => {
    const links = analysis.links.filter((l) => l.statementId === statement.id);
    const supporting = unique(links.flatMap((l) => l.supports)).filter((id) => factsById.has(id));
    const contradicting = unique(links.flatMap((l) => l.contradicts)).filter((id) => factsById.has(id));
    return {
      statement,
      status: supporting.length > 0 ? "backed" : "your_word_only",
      factIds: supporting,
      contradictingFactIds: contradicting,
    };
  });

  const notes = new Map(analysis.links.filter((l) => l.note.trim()).map((l) => [l.statementId, l.note.trim()]));
  const flags = detectFlags(statements, factsById, notes);
  const context = { input: state.input, documents: state.documents, facts: state.facts, statements, flags, factsById };
  const aiSteps: NextStep[] = analysis.nextSteps.map((s) => ({
    id: contentId("step", s.action),
    action: s.action,
    whyItMatters: s.whyItMatters,
    origin: "ai",
    ...(linkFor(s.topic) ? { link: linkFor(s.topic) } : {}),
  }));

  return {
    flags,
    nextSteps: linkOnce([...leadingSteps(context), ...aiSteps, ...trailingSteps(context)]),
    documentDifferences: detectConflicts({ facts, documents: state.documents }, analysis.conflicts),
    statements,
    timeline: [],
    undated: [],
    evidence: [],
    summary: { text: analysis.summary, origin: "ai" },
    droppedFactCount: Object.values(state.facts).reduce((n, f) => n + f.droppedCount, 0),
  };
}

/** Each official page is linked from the first step that needs it, not repeated on every step. */
function linkOnce(steps: NextStep[]): NextStep[] {
  const seen = new Set<string>();
  return steps.map(({ link, ...step }) => {
    if (!link || seen.has(link.url)) return step;
    seen.add(link.url);
    return { ...step, link };
  });
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}
