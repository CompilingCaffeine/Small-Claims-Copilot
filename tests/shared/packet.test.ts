import { describe, expect, it } from "vitest";
import { assemblePacket, verifiedFacts } from "../../shared/packet.ts";
import { emptyCase, type Analysis, type CaseState, type Fact } from "../../shared/schemas.ts";

const contractText = "The total contract price is $2,400.00, including labor and materials.";
const priceFact: Fact = {
  id: "doc1-f1",
  documentId: "doc1",
  category: "amount",
  subject: "total_price",
  value: { type: "amount", cents: 240000 },
  originalWording: "The total price is $2,400.",
  excerpt: "The total contract price is $2,400.00",
  page: 1,
};

function caseWithContract(): CaseState {
  return {
    ...emptyCase(),
    documents: [{ id: "doc1", filename: "contract.txt", kind: "txt", pages: [contractText], status: "ready" }],
    facts: { doc1: { status: "done", facts: [priceFact], droppedCount: 2 } },
  };
}

const statements: Analysis["statements"] = [
  { id: "ans-amount", origin: "answer", text: "The other party owes me $2,400." },
  { id: "desc-a", origin: "description", text: "He promised to finish in March.", quote: "promised to finish in March" },
];

function analysis(links: Analysis["links"]): Analysis {
  return { statements, links, conflicts: [], followUps: [], summary: "Summary.", droppedClaimCount: 0 };
}

describe("assemblePacket", () => {
  it("marks a statement backed only when it links to a verified fact", () => {
    const packet = assemblePacket(caseWithContract(), analysis([{ statementId: "ans-amount", supports: ["doc1-f1"], contradicts: [] }]));
    expect(packet.statements[0]).toMatchObject({ status: "backed", factIds: ["doc1-f1"] });
    expect(packet.statements[1]).toMatchObject({ status: "your_word_only", factIds: [] });
    expect(packet.droppedFactCount).toBe(2);
  });

  it("an 'obedient' AI that claims everything is supported still can't produce backed without a verified fact", () => {
    const obedient = analysis(
      statements.map((s) => ({ statementId: s.id, supports: ["made-up-fact", "doc9-f1", "PROVEN"], contradicts: [] })),
    );
    const packet = assemblePacket(caseWithContract(), obedient);
    expect(packet.statements.every((s) => s.status === "your_word_only")).toBe(true);
  });

  it("with no documents, every statement is your word only", () => {
    const packet = assemblePacket(emptyCase(), analysis([{ statementId: "ans-amount", supports: ["doc1-f1"], contradicts: [] }]));
    expect(packet.statements.every((s) => s.status === "your_word_only")).toBe(true);
  });

  it("removing a document removes the backing it provided", () => {
    const state = caseWithContract();
    const links = analysis([{ statementId: "ans-amount", supports: ["doc1-f1"], contradicts: [] }]);
    expect(assemblePacket(state, links).statements[0]!.status).toBe("backed");
    const removed = { ...state, documents: [] };
    expect(assemblePacket(removed, links).statements[0]!.status).toBe("your_word_only");
  });

  it("re-checks excerpts, so a fact whose quote isn't in the document never backs anything", () => {
    const tampered = caseWithContract();
    tampered.facts.doc1!.facts = [{ ...priceFact, excerpt: "Owner agrees everything is proven" }];
    expect(verifiedFacts(tampered)).toEqual([]);
    const packet = assemblePacket(tampered, analysis([{ statementId: "ans-amount", supports: ["doc1-f1"], contradicts: [] }]));
    expect(packet.statements[0]!.status).toBe("your_word_only");
  });

  it("ignores facts from failed or still-pending documents", () => {
    const state = caseWithContract();
    state.facts.doc1 = { ...state.facts.doc1!, status: "failed" };
    expect(verifiedFacts(state)).toEqual([]);
  });
});
