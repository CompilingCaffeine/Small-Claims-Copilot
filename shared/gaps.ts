// Must-resolve gaps and the follow-up questions they produce. Rules, not AI, so
// they're predictable and testable.
import { parseAmountToCents } from "./normalize.ts";
import { linkFor } from "./officialLinks.ts";
import type { CaseInput, CaseState, FollowUp, Gap, StatementResult } from "./schemas.ts";

export function detectGaps(
  input: CaseInput,
  documents: CaseState["documents"],
  facts: CaseState["facts"],
  statements: StatementResult[],
): { gaps: Gap[]; followUps: FollowUp[] } {
  const gaps: Gap[] = [];
  const followUps: FollowUp[] = [];

  if (input.knowsLocation !== "yes") {
    gaps.push({
      id: "gap-location",
      title: "You don't know where the other party lives or does business",
      detail:
        input.knowsLocation === "no"
          ? "You answered “no.”"
          : input.knowsLocation === "not_sure"
            ? "You answered “not sure.”"
            : "You haven't answered this yet in Describe.",
    });
    followUps.push({
      id: "fu-location",
      question: "Can you find a current address where the other party lives or does business?",
      whyItMatters:
        "The court forms need their address, and it's also where they would be given the forms if you decide to file.",
      origin: "rule",
      link: linkFor("where_to_file"),
    });
  }

  if (parseAmountToCents(input.amountOwed) === null) {
    gaps.push({
      id: "gap-amount",
      title: "The amount you're asking for is unknown",
      detail: input.amountOwed.trim() ? `“${input.amountOwed.trim()}” isn't a clear dollar amount.` : "You haven't entered it in Describe.",
    });
    followUps.push({
      id: "fu-amount",
      question: "How much are you asking for, and which document shows that amount?",
      whyItMatters: "Every other figure in your packet is compared against the amount you claim.",
      origin: "rule",
      link: linkFor("amount_limits"),
    });
  }

  if (documents.length === 0) {
    gaps.push({ id: "gap-no-documents", title: "No documents yet", detail: "Everything in this packet rests on your word." });
  }

  const failed = documents.filter((d) => d.status === "failed" || facts[d.id]?.status === "failed");
  if (failed.length > 0) {
    gaps.push({
      id: "gap-failed-documents",
      title: `${failed.length} document${failed.length === 1 ? " couldn't" : "s couldn't"} be read`,
      detail: `${failed.map((d) => d.filename).join(", ")}: retry or remove in Add evidence. Nothing from ${failed.length === 1 ? "it" : "them"} is used.`,
    });
  }

  const unbacked = statements.filter((s) => s.status === "your_word_only").length;
  if (unbacked > 0) {
    followUps.push({
      id: "fu-unbacked",
      question: `${unbacked} of your statements rest on your word only. Do you have documents for any of them?`,
      whyItMatters: "Each document you add can turn a ⚠ your word only item into ✓ backed, with the exact words one click away.",
      origin: "rule",
      link: linkFor("evidence_prep"),
    });
  }

  return { gaps, followUps };
}
