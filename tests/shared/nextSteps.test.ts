import { describe, expect, it } from "vitest";
import { leadingSteps, trailingSteps } from "../../shared/nextSteps.ts";
import { emptyCase, type Fact, type Flag } from "../../shared/schemas.ts";

const input = { ...emptyCase().input, amountOwed: "$400", knowsLocation: "yes" as const };
const doc = { id: "d", filename: "invoice.pdf", kind: "pdf" as const, pages: ["x"], status: "ready" as const };
const ctx = (over: Partial<Parameters<typeof leadingSteps>[0]> = {}) => ({
  input, documents: [doc], facts: {}, statements: [], flags: [], factsById: new Map<string, Fact>(), ...over,
});

const addressFact: Fact = {
  id: "d-f1", documentId: "d", category: "party", subject: "business_address", value: { type: "text", text: "x" },
  originalWording: "", excerpt: "2150 Alder Creek Rd", page: 1,
};
const locationFlag: Flag = {
  id: "flag-1", basis: "checked", factIds: ["d-f1"],
  statement: { id: "ans-knows-location", origin: "answer", text: "I don't know where the other party lives or does business." },
};

describe("leadingSteps", () => {
  it.each(["no", "not_sure", ""] as const)("location answer %j produces a step with an official link", (answer) => {
    const step = leadingSteps(ctx({ input: { ...input, knowsLocation: answer } })).find((s) => s.id === "step-location")!;
    expect(step.action).toMatch(/^Find a current address/);
    expect(step.link?.url).toMatch(/^https:\/\/selfhelp\.courts\.ca\.gov\//);
    expect(step.link?.lastChecked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("points at the document that has an address when one was found", () => {
    const steps = leadingSteps(
      ctx({ input: { ...input, knowsLocation: "no" }, flags: [locationFlag], factsById: new Map([["d-f1", addressFact]]) }),
    );
    expect(steps.find((s) => s.id === "step-location")!.action).toContain("the address in invoice.pdf");
    // The location flag has its own step, so it isn't counted again as a flag to resolve.
    expect(steps.map((s) => s.id)).not.toContain("step-flags");
  });

  it("knowing the location and the amount produces no steps", () => {
    expect(leadingSteps(ctx())).toEqual([]);
  });

  it("an unclear amount is a step, never a guess", () => {
    const steps = leadingSteps(ctx({ input: { ...input, amountOwed: "a few hundred" } }));
    expect(steps.find((s) => s.id === "step-amount")?.action).toContain("“a few hundred”");
  });

  it("asks for documents when there are none, and to retry failed ones", () => {
    expect(leadingSteps(ctx({ documents: [] })).map((s) => s.id)).toEqual(["step-no-documents"]);
    const failed = leadingSteps(ctx({ facts: { d: { status: "failed", facts: [], droppedCount: 0 } } }));
    expect(failed.map((s) => s.id)).toEqual(["step-failed-documents"]);
  });
});

describe("trailingSteps", () => {
  it("asks for evidence for unbacked statements, but not for 'I don't know where they are'", () => {
    const unbacked = (id: string) => ({
      statement: { id, origin: "answer" as const, text: "x" }, status: "your_word_only" as const, factIds: [], contradictingFactIds: [],
    });
    expect(trailingSteps(ctx({ statements: [unbacked("ans-amount")] })).map((s) => s.id)).toEqual(["step-unbacked"]);
    const noLocation = ctx({ input: { ...input, knowsLocation: "no" }, statements: [unbacked("ans-knows-location")] });
    expect(trailingSteps(noLocation)).toEqual([]);
  });
});
