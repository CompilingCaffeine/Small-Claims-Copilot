// The data model, defined once. TypeScript types are inferred from these schemas.
import { z } from "zod";

export const TriState = z.enum(["yes", "no", "not_sure", ""]);

export const CaseInput = z.object({
  description: z.string(),
  amountOwed: z.string(),
  overdue: z.string(),
  saidWontPay: TriState,
  knowsLocation: TriState,
});
export type CaseInput = z.infer<typeof CaseInput>;

export const SourceDocument = z.object({
  id: z.string(),
  filename: z.string(),
  kind: z.enum(["txt", "pdf", "pasted"]),
  pages: z.array(z.string()),
  status: z.enum(["ready", "failed"]),
  error: z.string().optional(),
});
export type SourceDocument = z.infer<typeof SourceDocument>;

export const FactCategory = z.enum(["party", "date", "amount", "promise", "payment", "event", "other"]);
export type FactCategory = z.infer<typeof FactCategory>;

export const FactValue = z.discriminatedUnion("type", [
  z.object({ type: z.literal("date"), iso: z.string() }),
  z.object({ type: z.literal("amount"), cents: z.number().int() }),
  z.object({ type: z.literal("text"), text: z.string() }),
]);
export type FactValue = z.infer<typeof FactValue>;

// A fact always carries an excerpt that code has confirmed appears in the document,
// and a page number computed by code (never taken from the AI).
export const Fact = z.object({
  id: z.string(),
  documentId: z.string(),
  category: FactCategory,
  subject: z.string(),
  value: FactValue,
  eventDate: z.string().optional(),
  originalWording: z.string(),
  excerpt: z.string(),
  page: z.number().int().min(1),
});
export type Fact = z.infer<typeof Fact>;

export const DocumentFacts = z.object({
  status: z.enum(["pending", "done", "failed"]),
  facts: z.array(Fact),
  droppedCount: z.number().int(),
  error: z.string().optional(),
});
export type DocumentFacts = z.infer<typeof DocumentFacts>;

// A photo is evidence of a different kind than a document: it has no quotable text,
// so it never becomes a Fact and can never make a statement ✓ backed. What the app
// knows about it comes from two clearly separated places.
export const PhotoEvidence = z.object({
  id: z.string(),
  filename: z.string(),
  // Read from the file by code. Identifies the file; it doesn't prove when or where
  // anything happened (EXIF can be missing or edited). GPS is never read.
  metadata: z.object({
    origin: z.literal("technical_metadata"),
    mimeType: z.enum(["image/jpeg", "image/png"]),
    byteSize: z.number().int(),
    width: z.number().int(),
    height: z.number().int(),
    sha256: z.string(),
    capturedAt: z.string().optional(), // camera clock, time zone unknown
  }),
  // A small re-encoded preview (data: URL, no embedded metadata). The original file is
  // kept only in memory for the current page session.
  thumbnail: z.string(),
  descriptionStatus: z.enum(["pending", "done", "failed"]),
  description: z.object({ origin: z.literal("ai_visual_description"), text: z.string() }).optional(),
  descriptionError: z.string().optional(),
  // AI next steps (by ID) asking for a photo of what this photo shows. They're hidden
  // while this photo is in the case.
  answersStepIds: z.array(z.string()).default([]),
});
export type PhotoEvidence = z.infer<typeof PhotoEvidence>;

export const UserStatement = z.object({
  id: z.string(),
  origin: z.enum(["answer", "description"]),
  text: z.string(),
  quote: z.string().optional(),
});
export type UserStatement = z.infer<typeof UserStatement>;

export const Conflict = z.object({
  id: z.string(),
  basis: z.enum(["checked", "ai_interpretation"]),
  subject: z.string(),
  note: z.string().optional(),
  sides: z.array(
    z.object({ label: z.string(), value: z.string(), factId: z.string().optional(), statementId: z.string().optional() }),
  ),
});
export type Conflict = z.infer<typeof Conflict>;

export const FollowUpTopic = z.enum(["where_to_file", "serving", "amount_limits", "evidence_prep", "none"]);
export type FollowUpTopic = z.infer<typeof FollowUpTopic>;

/** The analysis after the server has validated every reference in Claude's answer. */
export const Analysis = z.object({
  statements: z.array(UserStatement),
  links: z.array(
    z.object({ statementId: z.string(), supports: z.array(z.string()), contradicts: z.array(z.string()), note: z.string() }),
  ),
  // Differences between documents only; disagreements with the user become key flags via links.
  conflicts: z.array(z.object({ factIds: z.array(z.string()), subject: z.string(), note: z.string() })),
  nextSteps: z.array(z.object({ action: z.string(), whyItMatters: z.string(), topic: FollowUpTopic })),
  summary: z.string(),
  droppedClaimCount: z.number().int(),
});
export type Analysis = z.infer<typeof Analysis>;

export const OfficialLink = z.object({ title: z.string(), url: z.string(), lastChecked: z.string() });
export type OfficialLink = z.infer<typeof OfficialLink>;

export const NextStep = z.object({
  id: z.string(),
  action: z.string(),
  whyItMatters: z.string(),
  origin: z.enum(["rule", "ai"]),
  link: OfficialLink.optional(),
  note: z.string().optional(), // the user's own note, from edits
});
export type NextStep = z.infer<typeof NextStep>;

// One event, possibly stated by several documents (same date and subject).
export const TimelineEvent = z.object({
  id: z.string(),
  date: z.string().optional(),
  label: z.string(),
  factIds: z.array(z.string()),
});
export type TimelineEvent = z.infer<typeof TimelineEvent>;

export const EvidenceRow = z.object({
  documentId: z.string(),
  filename: z.string(),
  kind: z.enum(["txt", "pdf", "pasted"]),
  factCount: z.number().int(),
  backs: z.array(z.string()), // statement IDs this document backs
});
export type EvidenceRow = z.infer<typeof EvidenceRow>;

export const StatementResult = z.object({
  statement: UserStatement,
  status: z.enum(["backed", "your_word_only"]),
  factIds: z.array(z.string()),
  contradictingFactIds: z.array(z.string()),
  originalText: z.string().optional(), // set when the user edited the wording
});
export type StatementResult = z.infer<typeof StatementResult>;

// A place where a document disagrees with something the user said. "checked" means
// code confirmed the mismatch; otherwise it's the AI's reading, with a verified quote.
export const Flag = z.object({
  id: z.string(),
  basis: z.enum(["checked", "ai_interpretation"]),
  statement: UserStatement,
  factIds: z.array(z.string()),
  note: z.string().optional(),
});
export type Flag = z.infer<typeof Flag>;

export const Packet = z.object({
  flags: z.array(Flag),
  nextSteps: z.array(NextStep),
  documentDifferences: z.array(Conflict),
  statements: z.array(StatementResult),
  timeline: z.array(TimelineEvent),
  undated: z.array(TimelineEvent),
  evidence: z.array(EvidenceRow),
  photos: z.array(PhotoEvidence), // separate from text evidence; never referenced by statements
  summary: z.object({ text: z.string(), origin: z.literal("ai"), edited: z.boolean() }),
  amountClaimedCents: z.number().int().nullable(), // null = unknown, never guessed
  droppedFactCount: z.number().int(),
});
export type Packet = z.infer<typeof Packet>;

export const CaseState = z.object({
  schemaVersion: z.literal(1),
  input: CaseInput,
  documents: z.array(SourceDocument),
  photos: z.array(PhotoEvidence).default([]), // cases saved before photos existed load with none
  facts: z.record(z.string(), DocumentFacts),
  // Claude's validated answer. The packet itself is rebuilt from this plus the current
  // documents on every render, so removing a document immediately removes its backing.
  // An analysis saved by an older version that no longer fits is dropped (regenerate),
  // rather than discarding the whole case.
  analysis: Analysis.nullable().catch(null),
  edits: z.record(z.string(), z.string()),
  generatedAt: z.string().nullable(),
});
export type CaseState = z.infer<typeof CaseState>;

export function emptyCase(): CaseState {
  return {
    schemaVersion: 1,
    input: { description: "", amountOwed: "", overdue: "", saidWontPay: "", knowsLocation: "" },
    documents: [],
    photos: [],
    facts: {},
    analysis: null,
    edits: {},
    generatedAt: null,
  };
}
