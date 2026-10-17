// Conflicts are shown side by side and never resolved. Code decides whether a
// conflict is "checked" (the normalized values really differ) or only an
// "AI interpretation".
import { contentId } from "./ids.ts";
import { formatFactValue } from "./normalize.ts";
import type { Analysis, Conflict, Fact, SourceDocument, UserStatement } from "./schemas.ts";

// Subjects that should have exactly one value per case. Others (payments, line
// items) legitimately repeat with different values, so code doesn't compare them.
const SINGLE_VALUED = new Set(["total_price", "agreement_date", "deposit_paid"]);

type Context = { facts: Fact[]; documents: SourceDocument[]; statements: UserStatement[] };

export function detectConflicts(ctx: Context, aiConflicts: Analysis["conflicts"]): Conflict[] {
  const byId = new Map(ctx.facts.map((f) => [f.id, f]));
  const out: Conflict[] = [];

  // AI-proposed conflicts, kept with whatever references survived validation.
  for (const c of aiConflicts) {
    const facts = c.factIds.map((id) => byId.get(id)).filter((f): f is Fact => !!f);
    const statements = c.statementIds
      .map((id) => ctx.statements.find((s) => s.id === id))
      .filter((s): s is UserStatement => !!s);
    if (facts.length === 0 || facts.length + statements.length < 2) continue;
    out.push(
      build(ctx, {
        basis: valuesDiffer(facts) ? "checked" : "ai_interpretation",
        subject: c.subject,
        note: c.note,
        facts,
        statements,
      }),
    );
  }

  // Code-detected conflicts: the same single-valued subject with different values.
  const groups = new Map<string, Fact[]>();
  for (const f of ctx.facts) {
    if (!SINGLE_VALUED.has(f.subject) || f.value.type === "text") continue;
    groups.set(f.subject, [...(groups.get(f.subject) ?? []), f]);
  }
  for (const [subject, facts] of groups) {
    if (!valuesDiffer(facts)) continue;
    const ids = new Set(facts.map((f) => f.id));
    // Skip when an AI conflict already shows these same facts; mark it checked instead.
    const covering = out.find((c) => [...ids].every((id) => c.sides.some((s) => s.factId === id)));
    if (covering) {
      covering.basis = "checked";
      continue;
    }
    out.push(build(ctx, { basis: "checked", subject: subject.replace(/_/g, " "), facts, statements: [] }));
  }
  return out;
}

/** True when at least two facts of the same kind (amount or date) have different values. */
export function valuesDiffer(facts: Fact[]): boolean {
  for (const type of ["amount", "date"] as const) {
    const values = new Set(facts.filter((f) => f.value.type === type).map((f) => JSON.stringify(f.value)));
    if (values.size >= 2) return true;
  }
  return false;
}

function build(
  ctx: Context,
  c: { basis: Conflict["basis"]; subject: string; note?: string; facts: Fact[]; statements: UserStatement[] },
): Conflict {
  const filename = (f: Fact) => ctx.documents.find((d) => d.id === f.documentId)?.filename ?? "document";
  const refs = [...c.facts.map((f) => f.id), ...c.statements.map((s) => s.id)].sort();
  return {
    id: contentId("conflict", refs.join("|")),
    basis: c.basis,
    subject: c.subject,
    ...(c.note ? { note: c.note } : {}),
    sides: [
      ...c.facts.map((f) => ({ label: filename(f), value: formatFactValue(f.value), factId: f.id })),
      ...c.statements.map((s) => ({ label: "You said", value: s.text, statementId: s.id })),
    ],
  };
}
