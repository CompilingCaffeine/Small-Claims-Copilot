// Rule-based next steps: the must-resolve problems every case gets checked for.
// Rules, not AI, so they're predictable and testable. AI-suggested steps are added
// after these in assemblePacket().
import { parseAmountToCents } from "./normalize.ts";
import { linkFor } from "./officialLinks.ts";
import type { CaseInput, CaseState, Fact, Flag, NextStep, StatementResult } from "./schemas.ts";
import { ANSWER_IDS } from "./statements.ts";

type Context = {
  input: CaseInput;
  documents: CaseState["documents"];
  facts: CaseState["facts"];
  statements: StatementResult[];
  flags: Flag[];
  factsById: Map<string, Fact>;
};

/** Steps that come before the AI's suggestions (problems to fix first). */
export function leadingSteps({ input, documents, facts, flags, factsById }: Context): NextStep[] {
  const steps: NextStep[] = [];
  const filename = (id: string) => documents.find((d) => d.id === id)?.filename ?? "a document";

  const failed = documents.filter((d) => d.status === "failed" || facts[d.id]?.status === "failed");
  if (failed.length > 0) {
    steps.push({
      id: "step-failed-documents",
      action: `Retry or remove ${failed.map((d) => d.filename).join(", ")} in Add evidence.`,
      whyItMatters: `${failed.length === 1 ? "It couldn't" : "They couldn't"} be read, so nothing from ${failed.length === 1 ? "it" : "them"} is in your packet yet.`,
      origin: "rule",
    });
  }

  if (documents.length === 0) {
    steps.push({
      id: "step-no-documents",
      action: "Add the documents behind your case: a contract, invoice, receipts, or messages.",
      whyItMatters: "Right now everything in your packet rests on your word.",
      origin: "rule",
    });
  }

  const otherFlags = flags.filter((f) => f.statement.id !== ANSWER_IDS.knowsLocation);
  if (otherFlags.length > 0) {
    steps.push({
      id: "step-flags",
      action: `Resolve the ${otherFlags.length === 1 ? "key flag" : `${otherFlags.length} key flags`} above: correct what you said, or note why the document is wrong.`,
      whyItMatters: "Your account and your own documents disagree there; correcting or explaining it keeps your packet consistent.",
      origin: "rule",
    });
  }

  if (input.knowsLocation !== "yes") {
    const addressFlag = flags.find((f) => f.statement.id === ANSWER_IDS.knowsLocation && f.basis === "checked");
    const source = addressFlag?.factIds.map((id) => factsById.get(id)).find((f) => f);
    steps.push({
      id: "step-location",
      action: source
        ? `Check whether the address in ${filename(source.documentId)} is still where the other party lives or does business.`
        : "Find a current address where the other party lives or does business.",
      whyItMatters:
        "The court forms need their address, and it's also where they would be given the forms if you decide to file.",
      origin: "rule",
      link: linkFor("where_to_file"),
    });
  }

  if (parseAmountToCents(input.amountOwed) === null) {
    steps.push({
      id: "step-amount",
      action: input.amountOwed.trim()
        ? `Turn “${input.amountOwed.trim()}” into an exact dollar amount, and find the document that shows it.`
        : "Decide how much you're asking for, and find the document that shows it.",
      whyItMatters: "Every other figure in your packet is compared against the amount you claim.",
      origin: "rule",
      link: linkFor("amount_limits"),
    });
  }

  return steps;
}

/** Steps that come after the AI's suggestions (general strengthening). */
export function trailingSteps({ input, statements }: Context): NextStep[] {
  // "I don't know where they are" isn't something a document could back.
  const unbacked = statements.filter(
    (s) => s.status === "your_word_only" && !(s.statement.id === ANSWER_IDS.knowsLocation && input.knowsLocation !== "yes"),
  ).length;
  if (unbacked === 0) return [];
  return [
    {
      id: "step-unbacked",
      action: `Look for documents behind the ${unbacked === 1 ? "statement" : `${unbacked} statements`} that rest on your word only (see Packet details).`,
      whyItMatters: "Each document you add can turn a ⚠ your word only item into ✓ backed, with the exact words one click away.",
      origin: "rule",
      link: linkFor("evidence_prep"),
    },
  ];
}
