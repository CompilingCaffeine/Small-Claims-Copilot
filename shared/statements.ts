// Turns the Describe answers into the user's own statements (fixed IDs) and into
// prompts asking for documents that would back them. Templates, not AI.
import type { CaseInput, UserStatement } from "./schemas.ts";

export const ANSWER_IDS = {
  amount: "ans-amount",
  overdue: "ans-overdue",
  saidWontPay: "ans-said-wont-pay",
  knowsLocation: "ans-knows-location",
} as const;

export function answerStatements(input: CaseInput): UserStatement[] {
  const out: UserStatement[] = [];
  const amount = input.amountOwed.trim();
  const overdue = input.overdue.trim();
  if (amount) out.push({ id: ANSWER_IDS.amount, origin: "answer", text: `The other party owes me ${amount}.` });
  if (overdue) out.push({ id: ANSWER_IDS.overdue, origin: "answer", text: `The payment has been overdue for ${overdue}.` });
  if (input.saidWontPay === "yes")
    out.push({ id: ANSWER_IDS.saidWontPay, origin: "answer", text: "The other party has said they won't pay." });
  if (input.saidWontPay === "no")
    out.push({ id: ANSWER_IDS.saidWontPay, origin: "answer", text: "The other party hasn't said they won't pay." });
  if (input.knowsLocation === "yes")
    out.push({ id: ANSWER_IDS.knowsLocation, origin: "answer", text: "I know where the other party lives or does business." });
  return out;
}

export function backingPrompts(input: CaseInput): string[] {
  const prompts: string[] = [];
  const amount = input.amountOwed.trim();
  const overdue = input.overdue.trim();
  if (amount)
    prompts.push(`You said they owe ${amount}. Do you have an invoice, contract, or receipt that shows that amount?`);
  else prompts.push("You haven't said how much you're owed yet. An invoice or contract can show the amount.");
  if (overdue)
    prompts.push(
      `You said it's been overdue for ${overdue}. Do you have something showing when payment was due, like an invoice due date or a message asking for payment?`,
    );
  if (input.saidWontPay === "yes")
    prompts.push("You said they've refused to pay. Do you have a text, email, or letter where they say so?");
  if (input.description.trim())
    prompts.push("Do you have documents for the main events in your description: the agreement, the work, and any payments?");
  return prompts;
}
