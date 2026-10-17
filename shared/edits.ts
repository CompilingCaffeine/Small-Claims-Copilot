// The user's wording edits, stored by stable ID in CaseState.edits so they're
// reapplied every time the packet is rebuilt or regenerated. Editing changes
// words only: there is no edit that can make a statement ✓ backed.
import type { CaseState, Packet } from "./schemas.ts";

export const EDIT_KEYS = {
  summary: "summary",
  statement: (id: string) => `statement:${id}`,
  stepNote: (id: string) => `step-note:${id}`,
};

export function applyEdits(packet: Packet, edits: CaseState["edits"]): Packet {
  const summaryEdit = edits[EDIT_KEYS.summary];
  return {
    ...packet,
    statements: packet.statements.map((s) => {
      const text = edits[EDIT_KEYS.statement(s.statement.id)];
      return text === undefined ? s : { ...s, statement: { ...s.statement, text }, originalText: s.statement.text };
    }),
    nextSteps: packet.nextSteps.map((step) => {
      const note = edits[EDIT_KEYS.stepNote(step.id)];
      return note ? { ...step, note } : step;
    }),
    summary: summaryEdit === undefined ? packet.summary : { ...packet.summary, text: summaryEdit, edited: true },
  };
}
