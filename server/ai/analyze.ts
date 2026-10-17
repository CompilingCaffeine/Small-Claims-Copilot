import { z } from "zod";
import { findExcerpt } from "../../shared/excerpt.ts";
import { contentId } from "../../shared/ids.ts";
import { formatFactValue } from "../../shared/normalize.ts";
import { answerStatements } from "../../shared/statements.ts";
import { CaseInput, Fact, FollowUpTopic, type Analysis, type UserStatement } from "../../shared/schemas.ts";
import type { AiClient } from "./client.ts";
import { ANALYZE_SYSTEM, analyzeUserMessage } from "./prompts.ts";

/** What Claude is asked to return for the whole case. */
export const AnalyzeOutput = z.object({
  descriptionClaims: z.array(z.object({ key: z.string(), text: z.string(), quote: z.string() })),
  links: z.array(
    z.object({ statementId: z.string(), supports: z.array(z.string()), contradicts: z.array(z.string()), note: z.string() }),
  ),
  conflicts: z.array(z.object({ factIds: z.array(z.string()), subject: z.string(), note: z.string() })),
  nextSteps: z.array(z.object({ action: z.string(), whyItMatters: z.string(), topic: FollowUpTopic })),
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
        value: formatFactValue(f.value),
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

  const links = out.links
    .map((l) => {
      const contradicts = knownFacts(l.contradicts);
      // A note only means something next to the contradiction it explains.
      return { statementId: resolve(l.statementId), supports: knownFacts(l.supports), contradicts, note: contradicts.length ? l.note.trim() : "" };
    })
    .filter((l) => statementIds.has(l.statementId));

  const conflicts = out.conflicts
    .map((c) => ({ factIds: knownFacts(c.factIds), subject: c.subject.trim(), note: c.note.trim() }))
    .filter((c) => c.factIds.length >= 2);

  return {
    statements,
    links,
    conflicts,
    nextSteps: out.nextSteps
      .slice(0, 5)
      .map(({ action, whyItMatters, topic }) => ({ action: action.trim(), whyItMatters: whyItMatters.trim(), topic })),
    summary: out.summary.trim(),
    droppedClaimCount,
  };
}
