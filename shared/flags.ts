// Key flags: places where a verified document excerpt disagrees with something the
// user said. The AI proposes the pairing; code confirms the mismatch where it can.
import { looksLikeAddress } from "./address.ts";
import { contentId } from "./ids.ts";
import { findAmounts, findDates } from "./normalize.ts";
import type { Fact, Flag, StatementResult, UserStatement } from "./schemas.ts";
import { ANSWER_IDS } from "./statements.ts";

export function detectFlags(statements: StatementResult[], factsById: Map<string, Fact>, notes: Map<string, string>): Flag[] {
  const flags: Flag[] = [];
  for (const s of statements) {
    const facts = s.contradictingFactIds.map((id) => factsById.get(id)).filter((f): f is Fact => !!f);
    if (facts.length === 0) continue;
    const note = notes.get(s.statement.id);
    flags.push({
      id: contentId("flag", [s.statement.id, ...facts.map((f) => f.id).sort()].join("|")),
      basis: confirmedByCode(s.statement, facts) ? "checked" : "ai_interpretation",
      statement: s.statement,
      factIds: facts.map((f) => f.id),
      ...(note ? { note } : {}),
    });
  }
  // Code-confirmed flags first; order is otherwise stable.
  return flags.sort((a, b) => rank(a) - rank(b));
}

/**
 * True when code can see the mismatch itself: an address in a document versus "I don't
 * know where they are," or an amount or date in a document that isn't the one the user
 * wrote. Anything else stays an AI interpretation.
 */
export function confirmedByCode(statement: UserStatement, facts: Fact[]): boolean {
  if (statement.id === ANSWER_IDS.knowsLocation) return facts.some((f) => looksLikeAddress(f.excerpt));
  const words = statement.quote ?? statement.text;
  const amounts = findAmounts(words);
  const dates = findDates(words);
  return facts.some(
    (f) =>
      (f.value.type === "amount" && amounts.length > 0 && !amounts.includes(f.value.cents)) ||
      (f.value.type === "date" && dates.length > 0 && !dates.includes(f.value.iso)),
  );
}

function rank(flag: Flag): number {
  return flag.basis === "checked" ? 0 : 1;
}
