import { describe, expect, it } from "vitest";
import { confirmedByCode, detectFlags } from "../../shared/flags.ts";
import type { Fact, StatementResult, UserStatement } from "../../shared/schemas.ts";

const fact = (id: string, excerpt: string, value: Fact["value"]): Fact => ({
  id, documentId: "d", category: "party", subject: "x", value, originalWording: "", excerpt, page: 1,
});
const address = fact("f-addr", "RIDGELINE HOME REPAIR, 2150 Alder Creek Rd, Sacramento, CA 95826", { type: "text", text: "2150 Alder Creek Rd" });
const city = fact("f-city", "work at the Owner's residence in Sacramento, California", { type: "text", text: "Sacramento" });
const deposit = fact("f-dep", "Amount: $600.00", { type: "amount", cents: 60000 });
const deposit500 = fact("f-dep5", "Deposit: $500.00", { type: "amount", cents: 50000 });

const noLocation: UserStatement = { id: "ans-knows-location", origin: "answer", text: "I don't know where the other party lives or does business." };
const depositClaim: UserStatement = { id: "desc-1", origin: "description", text: "I paid a deposit of $500.", quote: "I paid a $500 deposit" };
const refusal: UserStatement = { id: "ans-said-wont-pay", origin: "answer", text: "The other party hasn't said they won't pay." };

describe("confirmedByCode", () => {
  it("confirms 'I don't know where they are' only against an excerpt that contains an address", () => {
    expect(confirmedByCode(noLocation, [address])).toBe(true);
    expect(confirmedByCode(noLocation, [city])).toBe(false);
  });

  it("confirms an amount mismatch only when the document's amount isn't the one the user wrote", () => {
    expect(confirmedByCode(depositClaim, [deposit])).toBe(true);
    expect(confirmedByCode(depositClaim, [deposit500])).toBe(false);
  });

  it("leaves statements without a checkable value as AI interpretation", () => {
    expect(confirmedByCode(refusal, [fact("f-t", "Not giving that back.", { type: "text", text: "refuses" })])).toBe(false);
  });
});

describe("detectFlags", () => {
  const result = (statement: UserStatement, contradictingFactIds: string[]): StatementResult => ({
    statement, status: "your_word_only", factIds: [], contradictingFactIds,
  });
  const byId = new Map([address, deposit, city].map((f) => [f.id, f]));

  it("flags only statements with verified contradicting facts, code-confirmed first, with stable IDs", () => {
    const statements = [result(refusal, ["f-city"]), result(depositClaim, ["f-dep"]), result(noLocation, ["gone"])];
    const flags = detectFlags(statements, byId, new Map([["desc-1", "You wrote $500; the receipt shows $600."]]));
    expect(flags.map((f) => [f.statement.id, f.basis])).toEqual([
      ["desc-1", "checked"],
      ["ans-said-wont-pay", "ai_interpretation"],
    ]);
    expect(flags[0]!.note).toBe("You wrote $500; the receipt shows $600.");
    expect(detectFlags(statements, byId, new Map())[0]!.id).toBe(flags[0]!.id);
  });
});
