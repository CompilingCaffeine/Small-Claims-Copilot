import { describe, expect, it } from "vitest";
import { detectGaps } from "../../shared/gaps.ts";
import { emptyCase } from "../../shared/schemas.ts";

const input = { ...emptyCase().input, amountOwed: "$400", knowsLocation: "yes" as const };
const doc = { id: "d", filename: "contract.txt", kind: "txt" as const, pages: ["x"], status: "ready" as const };

describe("detectGaps", () => {
  it.each(["no", "not_sure", ""] as const)("location answer %j produces a gap and a linked official follow-up", (answer) => {
    const { gaps, followUps } = detectGaps({ ...input, knowsLocation: answer }, [doc], {}, []);
    expect(gaps.map((g) => g.id)).toContain("gap-location");
    const fu = followUps.find((f) => f.id === "fu-location")!;
    expect(fu.whyItMatters).toBeTruthy();
    expect(fu.link?.url).toMatch(/^https:\/\/selfhelp\.courts\.ca\.gov\//);
    expect(fu.link?.lastChecked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("knowing the location produces no location gap", () => {
    expect(detectGaps(input, [doc], {}, []).gaps).toEqual([]);
  });

  it("an unknown amount is a gap, never a guess", () => {
    const { gaps } = detectGaps({ ...input, amountOwed: "a few hundred" }, [doc], {}, []);
    expect(gaps.find((g) => g.id === "gap-amount")?.detail).toContain("isn't a clear dollar amount");
  });

  it("flags no documents and failed documents", () => {
    expect(detectGaps(input, [], {}, []).gaps.map((g) => g.id)).toEqual(["gap-no-documents"]);
    const failed = detectGaps(input, [doc], { d: { status: "failed", facts: [], droppedCount: 0 } }, []);
    expect(failed.gaps.map((g) => g.id)).toEqual(["gap-failed-documents"]);
  });

  it("asks for evidence when statements rest on the user's word", () => {
    const statements = [
      { statement: { id: "s", origin: "answer" as const, text: "x" }, status: "your_word_only" as const, factIds: [], contradictingFactIds: [] },
    ];
    expect(detectGaps(input, [doc], {}, statements).followUps.map((f) => f.id)).toEqual(["fu-unbacked"]);
  });
});
