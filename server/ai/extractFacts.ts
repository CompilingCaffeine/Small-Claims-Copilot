import { z } from "zod";
import { findExcerpt } from "../../shared/excerpt.ts";
import { findAmounts, findDates, parseAmountToCents, parseDate } from "../../shared/normalize.ts";
import { FactCategory, type Fact, type FactValue } from "../../shared/schemas.ts";
import type { AiClient } from "./client.ts";
import { EXTRACT_SYSTEM, wrapDocument } from "./prompts.ts";

/** What Claude is asked to return for one document. Page numbers are deliberately absent. */
export const ExtractOutput = z.object({
  facts: z.array(
    z.object({
      category: FactCategory,
      subject: z.string(),
      valueKind: z.enum(["date", "amount", "text"]),
      valueText: z.string(),
      eventDateText: z.string().nullable(),
      originalWording: z.string(),
      excerpt: z.string(),
    }),
  ),
});
export type RawFact = z.infer<typeof ExtractOutput>["facts"][number];

export const ExtractRequest = z.object({
  document: z.object({
    id: z.string().min(1).max(100),
    filename: z.string().min(1).max(300),
    pages: z.array(z.string()).min(1).max(500),
  }),
});
export type ExtractRequest = z.infer<typeof ExtractRequest>;

export type ExtractResult = { ok: true; facts: Fact[]; droppedCount: number } | { ok: false; error: string };

export async function extractFacts(ai: AiClient, document: ExtractRequest["document"]): Promise<ExtractResult> {
  const result = await ai.parse({
    system: EXTRACT_SYSTEM,
    user: `List the facts in this document.\n\n${wrapDocument(document)}`,
    schema: ExtractOutput,
  });
  if (!result.ok) return result;
  return { ok: true, ...verifyFacts(document, result.data.facts) };
}

/**
 * The referee for extraction. A fact survives only if its excerpt really appears in
 * the document, and a normalized date or amount survives only if that value is written
 * in the excerpt. Everything else is dropped and counted, never shown.
 */
export function verifyFacts(
  document: { id: string; pages: string[] },
  raw: RawFact[],
): { facts: Fact[]; droppedCount: number } {
  const facts: Fact[] = [];
  let droppedCount = 0;

  for (const r of raw) {
    const location = findExcerpt(document.pages, r.excerpt);
    const value = location ? normalizeValue(r) : null;
    if (!location || !value) {
      droppedCount++;
      continue;
    }
    const eventIso = r.eventDateText ? parseDate(r.eventDateText) : null;
    facts.push({
      id: `${document.id}-f${facts.length + 1}`,
      documentId: document.id,
      category: r.category,
      subject: toSnakeCase(r.subject),
      value,
      ...(eventIso && findDates(r.excerpt).includes(eventIso) ? { eventDate: eventIso } : {}),
      originalWording: r.originalWording.trim(),
      excerpt: r.excerpt.trim(),
      page: location.page,
    });
  }
  return { facts, droppedCount };
}

/** Null means the claimed value contradicts its own excerpt, so the fact is dropped. */
function normalizeValue(r: RawFact): FactValue | null {
  if (r.valueKind === "amount") {
    const cents = parseAmountToCents(r.valueText);
    if (cents === null) return { type: "text", text: r.valueText.trim() };
    return findAmounts(r.excerpt).includes(cents) ? { type: "amount", cents } : null;
  }
  if (r.valueKind === "date") {
    const iso = parseDate(r.valueText);
    if (iso === null) return { type: "text", text: r.valueText.trim() };
    return findDates(r.excerpt).includes(iso) ? { type: "date", iso } : null;
  }
  return { type: "text", text: r.valueText.trim() };
}

function toSnakeCase(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "other";
}
