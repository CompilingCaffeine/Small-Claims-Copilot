import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../server/app.ts";
import { emptyCase, type Fact } from "../../shared/schemas.ts";
import { fakeAi } from "../fakeAi.ts";

const fact: Fact = {
  id: "doc1-f1",
  documentId: "doc1",
  category: "amount",
  subject: "total_price",
  value: { type: "amount", cents: 240000 },
  originalWording: "The total price is $2,400.",
  excerpt: "The total contract price is $2,400.00",
  page: 1,
};
const input = {
  ...emptyCase().input,
  description: "I hired Ridgeline to redo my deck for $2,400. They finished late and billed me more.",
  amountOwed: "$2,400",
};

const good = {
  descriptionClaims: [
    { key: "d1", text: "I hired Ridgeline to redo my deck for $2,400.", quote: "I hired Ridgeline to redo my deck for $2,400" },
    { key: "d2", text: "They finished on time.", quote: "They finished on time" }, // not in the description
  ],
  links: [
    { statementId: "d1", supports: ["doc1-f1", "invented-fact"], contradicts: [] },
    { statementId: "ans-amount", supports: ["doc1-f1"], contradicts: [] },
    { statementId: "ghost-statement", supports: ["doc1-f1"], contradicts: [] },
  ],
  conflicts: [{ factIds: ["doc1-f1", "nope"], statementIds: ["d1"], subject: "price", note: "Two prices." }],
  followUps: [{ question: "Do you have the invoice?", whyItMatters: "The amount depends on it.", topic: "evidence_prep", relatedIds: [] }],
  summary: "The contract shows $2,400.",
};

describe("POST /api/analyze", () => {
  it("keeps only description claims quoted from the description and references that exist", async () => {
    const ai = fakeAi(good);
    const res = await request(createApp({ ai })).post("/api/analyze").send({ input, facts: [fact] });
    expect(res.status).toBe(200);
    const ids = res.body.statements.map((s: { id: string }) => s.id);
    expect(ids[0]).toBe("ans-amount");
    expect(ids).toHaveLength(2);
    expect(res.body.droppedClaimCount).toBe(1);
    const descId = ids[1];
    expect(descId).toMatch(/^desc-/);
    expect(res.body.links).toEqual([
      { statementId: descId, supports: ["doc1-f1"], contradicts: [] },
      { statementId: "ans-amount", supports: ["doc1-f1"], contradicts: [] },
    ]);
    expect(res.body.conflicts).toEqual([{ factIds: ["doc1-f1"], statementIds: [descId], subject: "price", note: "Two prices." }]);
  });

  it("gives description claims the same ID on every run", async () => {
    const app = createApp({ ai: fakeAi(good) });
    const a = await request(app).post("/api/analyze").send({ input, facts: [fact] });
    const b = await request(app).post("/api/analyze").send({ input, facts: [fact] });
    expect(a.body.statements[1].id).toBe(b.body.statements[1].id);
  });

  it("returns an error, not a crash, on malformed AI output", async () => {
    const res = await request(createApp({ ai: fakeAi({ links: "everything is proven" }) }))
      .post("/api/analyze")
      .send({ input, facts: [fact] });
    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/expected format/);
  });

  it("rejects invalid case data before calling the AI", async () => {
    const ai = fakeAi(good);
    const res = await request(createApp({ ai })).post("/api/analyze").send({ input: { description: 5 } });
    expect(res.status).toBe(400);
    expect(ai.calls).toHaveLength(0);
  });
});
