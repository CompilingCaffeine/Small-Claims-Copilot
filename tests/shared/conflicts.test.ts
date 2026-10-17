import { describe, expect, it } from "vitest";
import { detectConflicts } from "../../shared/conflicts.ts";
import type { Fact, SourceDocument } from "../../shared/schemas.ts";

const documents: SourceDocument[] = [
  { id: "c", filename: "contract.txt", kind: "txt", pages: [""], status: "ready" },
  { id: "i", filename: "invoice.pdf", kind: "pdf", pages: [""], status: "ready" },
];
const fact = (id: string, documentId: string, subject: string, value: Fact["value"]): Fact => ({
  id, documentId, category: value.type === "date" ? "date" : "amount", subject, value,
  originalWording: "", excerpt: "x", page: 1,
});

const contractTotal = fact("c-f1", "c", "total_price", { type: "amount", cents: 240000 });
const invoiceTotal = fact("i-f1", "i", "total_price", { type: "amount", cents: 280000 });

describe("detectConflicts", () => {
  it("flags the same single-valued amount with different values across documents, showing both sides", () => {
    const [c, ...rest] = detectConflicts({ facts: [contractTotal, invoiceTotal], documents }, []);
    expect(rest).toHaveLength(0);
    expect(c).toMatchObject({ basis: "checked", subject: "total price" });
    expect(c!.sides).toEqual([
      { label: "contract.txt", value: "$2,400.00", factId: "c-f1" },
      { label: "invoice.pdf", value: "$2,800.00", factId: "i-f1" },
    ]);
  });

  it("flags conflicting dates", () => {
    const a = fact("c-f2", "c", "agreement_date", { type: "date", iso: "2026-02-02" });
    const b = fact("i-f2", "i", "agreement_date", { type: "date", iso: "2026-02-09" });
    expect(detectConflicts({ facts: [a, b], documents }, [])).toHaveLength(1);
  });

  it("doesn't flag matching values, or subjects that legitimately repeat", () => {
    const same = { ...invoiceTotal, value: { type: "amount" as const, cents: 240000 } };
    expect(detectConflicts({ facts: [contractTotal, same], documents }, [])).toEqual([]);
    const pay1 = fact("p1", "i", "amount_paid", { type: "amount", cents: 60000 });
    const pay2 = fact("p2", "i", "amount_paid", { type: "amount", cents: 220000 });
    expect(detectConflicts({ facts: [pay1, pay2], documents }, [])).toEqual([]);
  });

  it("confirms an AI-proposed conflict as checked when code sees the values differ, without duplicating it", () => {
    const ai = [{ factIds: ["c-f1", "i-f1"], subject: "Price", note: "Two prices." }];
    const out = detectConflicts({ facts: [contractTotal, invoiceTotal], documents }, ai);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ basis: "checked", subject: "Price", note: "Two prices." });
  });

  it("labels an AI difference that code can't confirm as an AI interpretation", () => {
    const scope = fact("c-f3", "c", "scope_of_work", { type: "text", text: "two coats" });
    const extra = fact("i-f3", "i", "line_item", { type: "text", text: "third coat" });
    const ai = [{ factIds: ["c-f3", "i-f3"], subject: "Coats of stain", note: "Differs." }];
    const [c] = detectConflicts({ facts: [scope, extra], documents }, ai);
    expect(c!.basis).toBe("ai_interpretation");
  });

  it("drops an AI difference that no longer has two facts", () => {
    const ai = [{ factIds: ["gone", "c-f1"], subject: "x", note: "" }];
    expect(detectConflicts({ facts: [contractTotal], documents }, ai)).toEqual([]);
  });
});
