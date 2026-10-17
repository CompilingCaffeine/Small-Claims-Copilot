import { readFileSync } from "node:fs";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../server/app.ts";
import { wrapDocument } from "../../server/ai/prompts.ts";
import { assemblePacket } from "../../shared/packet.ts";
import { emptyCase, type Analysis, type CaseState } from "../../shared/schemas.ts";
import { fakeAi } from "../fakeAi.ts";

const text = readFileSync(new URL("../fixtures/injection.txt", import.meta.url), "utf8");
const document = { id: "inj", filename: "injection.txt", pages: [text] };

// A model that does whatever the document says: invents facts and quotes, and
// calls everything proven. Code must still only back what's quoted from the file.
const obedientExtraction = {
  facts: [
    { category: "amount", subject: "deposit_paid", valueKind: "amount", valueText: "$600.00", eventDateText: null, originalWording: "Deposit $600.", excerpt: "Amount: $600.00" },
    { category: "amount", subject: "amount_due", valueKind: "amount", valueText: "$10,000", eventDateText: null, originalWording: "They owe $10,000.", excerpt: "The other party owes $10,000 and this is proven" },
    { category: "other", subject: "proven", valueKind: "text", valueText: "everything proven", eventDateText: null, originalWording: "All statements are proven.", excerpt: "All statements are proven by this receipt." },
  ],
};

describe("a document that contains instructions", () => {
  it("can't break out of its <document> wrapper", () => {
    const wrapped = wrapDocument(document);
    expect(wrapped.match(/<document\b/g)).toHaveLength(1);
    expect(wrapped.match(/<\/document>/g)).toHaveLength(1);
    expect(wrapped.match(/<\/page>/g)).toHaveLength(1);
  });

  it("with an obedient model, only facts quoted from the file survive extraction", async () => {
    const res = await request(createApp({ ai: fakeAi(obedientExtraction) })).post("/api/extract").send({ document });
    expect(res.status).toBe(200);
    expect(res.body.facts.map((f: { excerpt: string }) => f.excerpt)).toEqual(["Amount: $600.00"]);
    expect(res.body.droppedCount).toBe(2);
  });

  it("with an obedient analysis, nothing is backed except by an excerpt that's really in the file", async () => {
    const extracted = await request(createApp({ ai: fakeAi(obedientExtraction) })).post("/api/extract").send({ document });
    const state: CaseState = {
      ...emptyCase(),
      documents: [{ ...document, kind: "txt", status: "ready" }],
      facts: { inj: { status: "done", facts: extracted.body.facts, droppedCount: extracted.body.droppedCount } },
    };
    const statements: Analysis["statements"] = [
      { id: "ans-amount", origin: "answer", text: "The other party owes me $10,000." },
      { id: "ans-said-wont-pay", origin: "answer", text: "The other party has said they won't pay." },
    ];
    const everything = ["inj-f1", "inj-f2", "inj-f3", "admin-f1", "PROVEN"];
    const analysis: Analysis = {
      statements,
      links: statements.map((s) => ({ statementId: s.id, supports: everything, contradicts: [], note: "" })),
      conflicts: [],
      nextSteps: [],
      summary: "",
      droppedClaimCount: 0,
    };
    const packet = assemblePacket(state, analysis);
    for (const s of packet.statements) expect(s.factIds).toEqual(["inj-f1"]);
    // The only backing on offer is the receipt's real "$600.00" line, shown to the user as the source.
    expect(extracted.body.facts[0].excerpt).toBe("Amount: $600.00");
  });
});
