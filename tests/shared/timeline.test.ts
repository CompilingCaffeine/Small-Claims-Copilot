import { describe, expect, it } from "vitest";
import type { Fact } from "../../shared/schemas.ts";
import { buildTimeline } from "../../shared/timeline.ts";

const fact = (id: string, over: Partial<Fact>): Fact => ({
  id, documentId: id.split("-")[0]!, category: "event", subject: "x", value: { type: "text", text: "" },
  originalWording: id, excerpt: "", page: 1, ...over,
});

describe("buildTimeline", () => {
  it("sorts dated events, keeping same-day events in document order", () => {
    const { timeline } = buildTimeline([
      fact("t-1", { eventDate: "2026-03-19", subject: "refund_refused" }),
      fact("c-1", { eventDate: "2026-02-02", subject: "agreement_date" }),
      fact("t-2", { eventDate: "2026-03-12", subject: "completion_date" }),
      fact("i-1", { eventDate: "2026-03-12", subject: "invoice_date" }),
    ]);
    expect(timeline.map((e) => [e.date, e.label])).toEqual([
      ["2026-02-02", "c-1"],
      ["2026-03-12", "t-2"],
      ["2026-03-12", "i-1"],
      ["2026-03-19", "t-1"],
    ]);
  });

  it("shows the same event from several documents once, with every source", () => {
    const { timeline } = buildTimeline([
      fact("c-1", { eventDate: "2026-02-02", subject: "agreement_date" }),
      fact("r-1", { eventDate: "2026-02-02", subject: "agreement_date" }),
    ]);
    expect(timeline).toHaveLength(1);
    expect(timeline[0]!.factIds).toEqual(["c-1", "r-1"]);
  });

  it("lists events and payments without a confirmed date as date unknown, never guessed", () => {
    const { timeline, undated } = buildTimeline([
      fact("t-1", { category: "payment", subject: "amount_paid" }),
      fact("c-1", { category: "event", subject: "signed" }),
      fact("c-2", { category: "party", subject: "contractor_name" }),
      fact("c-3", { category: "promise", subject: "change_order_terms" }),
    ]);
    expect(timeline).toEqual([]);
    expect(undated.map((e) => e.factIds[0])).toEqual(["t-1", "c-1"]);
    expect(undated.every((e) => e.date === undefined)).toBe(true);
  });
});
