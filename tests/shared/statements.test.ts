import { describe, expect, it } from "vitest";
import { answerStatements, backingPrompts } from "../../shared/statements.ts";
import { emptyCase } from "../../shared/schemas.ts";

const base = emptyCase().input;

describe("answerStatements", () => {
  it("turns answers into the user's statements with fixed IDs", () => {
    const s = answerStatements({ ...base, amountOwed: "$2,800", overdue: "6 weeks", saidWontPay: "yes", knowsLocation: "no" });
    expect(s.map((x) => x.id)).toEqual(["ans-amount", "ans-overdue", "ans-said-wont-pay", "ans-knows-location"]);
    expect(s[0]!.text).toBe("The other party owes me $2,800.");
    expect(s.every((x) => x.origin === "answer")).toBe(true);
  });

  it("records not knowing where the other party is, so a document with their address can be flagged", () => {
    const [no] = answerStatements({ ...base, knowsLocation: "no" });
    expect(no).toMatchObject({ id: "ans-knows-location", text: "I don't know where the other party lives or does business." });
    expect(answerStatements({ ...base, knowsLocation: "not_sure" })[0]!.text).toMatch(/^I'm not sure where/);
  });

  it("lets every field be blank or not sure", () => {
    expect(answerStatements({ ...base, saidWontPay: "not_sure" })).toEqual([]);
  });
});

describe("backingPrompts", () => {
  it("reflects what the user said", () => {
    const prompts = backingPrompts({ ...base, amountOwed: "$2,800", saidWontPay: "yes" });
    expect(prompts[0]).toContain("You said they owe $2,800");
    expect(prompts.some((p) => p.includes("refused to pay"))).toBe(true);
  });

  it("asks for the amount when none was given", () => {
    expect(backingPrompts(base)[0]).toMatch(/haven't said how much/);
  });
});
