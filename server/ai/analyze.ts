import { z } from "zod";
import { findExcerpt } from "../../shared/excerpt.ts";
import { contentId } from "../../shared/ids.ts";
import { formatCents, formatIsoDate } from "../../shared/normalize.ts";
import { answerStatements } from "../../shared/statements.ts";
import { CaseInput, Fact, FollowUpTopic, type Analysis, type UserStatement } from "../../shared/schemas.ts";
import type { AiClient } from "./client.ts";
import { ANALYZE_SYSTEM, analyzeUserMessage } from "./prompts.ts";

/** What Claude is asked to return for the whole case. */
export const AnalyzeOutput = z.object({
  descriptionClaims: z.array(z.object({ key: z.string(), text: z.string(), quote: z.string() })),
  links: z.array(z.object({ statementId: z.string(), supports: z.array(z.string()), contradicts: z.array(z.string()) })),
  conflicts: z.array(
    z.object({ factIds: z.array(z.string()), statementIds: z.array(z.string()), subject: z.string(), note: z.string() }),
  ),
  followUps: z.array(
    z.object({ question: z.string(), whyItMatters: z.string(), topic: FollowUpTopic, relatedIds: z.array(z.string()) }),
  ),
  summary: z.string(),
});
export type AnalyzeOutput = z.infer<typeof AnalyzeOutput>;

export const AnalyzeRequest = z.object({
  input: CaseInput,
  facts: z.array(Fact).max(1000),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequest>;

export type AnalyzeResult = { ok: true; analysis: Analysis } | { ok: false; error: string };

export async function analyzeCase(ai: AiClient, { input, facts }: AnalyzeRequest): Promise<AnalyzeResult> {
  const answers = answerStatements(input);
  const result = await ai.parse({
    system: ANALYZE_SYSTEM,
    user: analyzeUserMessage({
      description: input.description,
      statements: answers.map(({ id, text }) => ({ id, text })),
      facts: facts.map((f) => ({
        id: f.id,
        document: f.documentId,
        subject: f.subject,
        value: f.value.type === "amount" ? formatCents(f.value.cents) : f.value.type === "date" ? formatIsoDate(f.value.iso) : f.value.text,
        excerpt: f.excerpt,
      })),
    }),
    schema: AnalyzeOutput,
  });
  if (!result.ok) return result;
  return { ok: true, analysis: validateAnalysis(input, answers, facts, result.data) };
}

/**
 * Keeps only what can be checked: description claims whose quote really is in the
 * description, and references to statement and fact IDs that actually exist.
 */
export function validateAnalysis(
  input: CaseInput,
  answers: UserStatement[],
  facts: Fact[],
  out: AnalyzeOutput,
): Analysis {
  const keyToId = new Map<string, string>();
  const statements: UserStatement[] = [...answers];
  let droppedClaimCount = 0;

  for (const claim of out.descriptionClaims) {
    if (!findExcerpt([input.description], claim.quote)) {
      droppedClaimCount++;
      continue;
    }
    const id = contentId("desc", claim.quote);
    if (keyToId.has(claim.key) || statements.some((s) => s.id === id)) continue;
    keyToId.set(claim.key, id);
    statements.push({ id, origin: "description", text: claim.text.trim(), quote: claim.quote.trim() });
  }

  const statementIds = new Set(statements.map((s) => s.id));
  const resolve = (id: string) => keyToId.get(id) ?? id;
  const factIds = new Set(facts.map((f) => f.id));
  const knownFacts = (ids: string[]) => [...new Set(ids.filter((id) => factIds.has(id)))];
  const knownStatements = (ids: string[]) => [...new Set(ids.map(resolve).filter((id) => statementIds.has(id)))];

  const links = out.links
    .map((l) => ({ statementId: resolve(l.statementId), supports: knownFacts(l.supports), contradicts: knownFacts(l.contradicts) }))
    .filter((l) => statementIds.has(l.statementId));

  const conflicts = out.conflicts
    .map((c) => ({ factIds: knownFacts(c.factIds), statementIds: knownStatements(c.statementIds), subject: c.subject.trim(), note: c.note.trim() }))
    .filter((c) => c.factIds.length + c.statementIds.length >= 2 && c.factIds.length >= 1);

  return {
    statements,
    links,
    conflicts,
    followUps: out.followUps.slice(0, 5).map(({ question, whyItMatters, topic }) => ({ question, whyItMatters, topic })),
    summary: out.summary.trim(),
    droppedClaimCount,
  };
}
