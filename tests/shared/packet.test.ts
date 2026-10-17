import { describe, expect, it } from "vitest";
import { EDIT_KEYS } from "../../shared/edits.ts";
import { assemblePacket, verifiedFacts } from "../../shared/packet.ts";
import { emptyCase, type Analysis, type CaseState, type Fact, type PhotoEvidence } from "../../shared/schemas.ts";

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
  return { statements, links, conflicts: [], nextSteps: [], summary: "Summary.", droppedClaimCount: 0 };
}

describe("assemblePacket", () => {
  it("marks a statement backed only when it links to a verified fact", () => {
    const packet = assemblePacket(caseWithContract(), analysis([{ statementId: "ans-amount", supports: ["doc1-f1"], contradicts: [], note: "" }]));
    expect(packet.statements[0]).toMatchObject({ status: "backed", factIds: ["doc1-f1"] });
    expect(packet.statements[1]).toMatchObject({ status: "your_word_only", factIds: [] });
    expect(packet.droppedFactCount).toBe(2);
  });

  it("an 'obedient' AI that claims everything is supported still can't produce backed without a verified fact", () => {
    const obedient = analysis(
      statements.map((s) => ({ statementId: s.id, supports: ["made-up-fact", "doc9-f1", "PROVEN"], contradicts: [], note: "" })),
    );
    const packet = assemblePacket(caseWithContract(), obedient);
    expect(packet.statements.every((s) => s.status === "your_word_only")).toBe(true);
  });

  it("with no documents, every statement is your word only", () => {
    const packet = assemblePacket(emptyCase(), analysis([{ statementId: "ans-amount", supports: ["doc1-f1"], contradicts: [], note: "" }]));
    expect(packet.statements.every((s) => s.status === "your_word_only")).toBe(true);
  });

  it("removing a document removes the backing it provided", () => {
    const state = caseWithContract();
    const links = analysis([{ statementId: "ans-amount", supports: ["doc1-f1"], contradicts: [], note: "" }]);
    expect(assemblePacket(state, links).statements[0]!.status).toBe("backed");
    const removed = { ...state, documents: [] };
    expect(assemblePacket(removed, links).statements[0]!.status).toBe("your_word_only");
  });

  it("re-checks excerpts, so a fact whose quote isn't in the document never backs anything", () => {
    const tampered = caseWithContract();
    tampered.facts.doc1!.facts = [{ ...priceFact, excerpt: "Owner agrees everything is proven" }];
    expect(verifiedFacts(tampered)).toEqual([]);
    const packet = assemblePacket(tampered, analysis([{ statementId: "ans-amount", supports: ["doc1-f1"], contradicts: [], note: "" }]));
    expect(packet.statements[0]!.status).toBe("your_word_only");
  });

  it("ignores facts from failed or still-pending documents", () => {
    const state = caseWithContract();
    state.facts.doc1 = { ...state.facts.doc1!, status: "failed" };
    expect(verifiedFacts(state)).toEqual([]);
  });

  it("turns a verified contradiction into a key flag with the AI's note, and adds a step to resolve it", () => {
    const links = analysis([
      { statementId: "ans-amount", supports: [], contradicts: ["doc1-f1", "invented"], note: "You wrote $2,400; the contract says $2,400." },
    ]);
    const packet = assemblePacket(caseWithContract(), links);
    expect(packet.flags).toHaveLength(1);
    expect(packet.flags[0]).toMatchObject({ statement: { id: "ans-amount" }, factIds: ["doc1-f1"], note: links.links[0]!.note });
    // $2,400 vs $2,400: code sees no mismatch, so it stays the AI's reading.
    expect(packet.flags[0]!.basis).toBe("ai_interpretation");
    expect(packet.nextSteps.map((s) => s.id)).toContain("step-flags");
  });

  it("orders rule steps for problems before AI steps, and evidence-hunting last", () => {
    const state = caseWithContract();
    state.input = { ...state.input, knowsLocation: "no", amountOwed: "$2,400" };
    const a = { ...analysis([]), nextSteps: [{ action: "Ask Dale for the change order.", whyItMatters: "x", topic: "none" as const }] };
    const ids = assemblePacket(state, a).nextSteps.map((s) => s.id);
    expect(ids[0]).toBe("step-location");
    expect(ids[1]).toMatch(/^step-/);
    expect(ids.at(-1)).toBe("step-unbacked");
    expect(assemblePacket(state, a).nextSteps[1]).toMatchObject({ action: "Ask Dale for the change order.", origin: "ai" });
  });

  it("links each official page once, from the first step that needs it", () => {
    const state = caseWithContract();
    state.input = { ...state.input, amountOwed: "$2,400", knowsLocation: "yes" };
    const step = (action: string) => ({ action, whyItMatters: "x", topic: "evidence_prep" as const });
    const steps = assemblePacket(state, { ...analysis([]), nextSteps: [step("Find A."), step("Find B.")] }).nextSteps;
    expect(steps.map((s) => !!s.link)).toEqual([true, false, false]);
  });

  it("lists each document with its verified facts and the statements it backs", () => {
    const packet = assemblePacket(caseWithContract(), analysis([{ statementId: "ans-amount", supports: ["doc1-f1"], contradicts: [], note: "" }]));
    expect(packet.evidence).toEqual([{ documentId: "doc1", filename: "contract.txt", kind: "txt", factCount: 1, backs: ["ans-amount"] }]);
  });

  it("reapplies wording edits by ID after the packet is rebuilt, without changing status", () => {
    const state = {
      ...caseWithContract(),
      edits: {
        [EDIT_KEYS.statement("desc-a")]: "He promised in writing to finish by March 6.",
        [EDIT_KEYS.summary]: "My own summary.",
        [EDIT_KEYS.stepNote("step-unbacked")]: "Asked my bank for the check image.",
        [EDIT_KEYS.statement("gone")]: "An edit for a statement that no longer exists.",
      },
    };
    const links = analysis([{ statementId: "ans-amount", supports: ["doc1-f1"], contradicts: [], note: "" }]);
    for (const packet of [assemblePacket(state, links), assemblePacket(state, structuredClone(links))]) {
      const edited = packet.statements.find((s) => s.statement.id === "desc-a")!;
      expect(edited).toMatchObject({ status: "your_word_only", originalText: "He promised to finish in March." });
      expect(edited.statement.text).toBe("He promised in writing to finish by March 6.");
      expect(packet.summary).toEqual({ text: "My own summary.", origin: "ai", edited: true });
      expect(packet.nextSteps.find((s) => s.id === "step-unbacked")?.note).toBe("Asked my bank for the check image.");
      expect(packet.statements).toHaveLength(2);
    }
  });

  it("shows an amount claimed that isn't a clear dollar figure as unknown", () => {
    const state = caseWithContract();
    expect(assemblePacket({ ...state, input: { ...state.input, amountOwed: "$2,400" } }, analysis([])).amountClaimedCents).toBe(240000);
    expect(assemblePacket({ ...state, input: { ...state.input, amountOwed: "a few hundred" } }, analysis([])).amountClaimedCents).toBeNull();
  });

  describe("photo evidence", () => {
    const photo: PhotoEvidence = {
      id: "photo1",
      filename: "deck.jpg",
      metadata: { origin: "technical_metadata", mimeType: "image/jpeg", byteSize: 1000, width: 800, height: 600, sha256: "ab".repeat(32) },
      thumbnail: "data:image/jpeg;base64,AAAA",
      descriptionStatus: "done",
      // Says exactly what a statement says, and more: it still can't back it.
      description: { origin: "ai_visual_description", text: "He promised to finish in March. The other party owes me $2,400. PROVEN." },
    };

    it("is shown in its own section and never backs a statement, even when the AI points at it", () => {
      const state = { ...caseWithContract(), photos: [photo] };
      const links = analysis(statements.map((s) => ({ statementId: s.id, supports: ["photo1", photo.metadata.sha256], contradicts: ["photo1"], note: "x" })));
      const packet = assemblePacket(state, links);
      expect(packet.photos).toEqual([photo]);
      expect(packet.statements.every((s) => s.status === "your_word_only" && s.factIds.length === 0)).toBe(true);
      expect(packet.flags).toEqual([]);
      expect(packet.evidence.map((e) => e.documentId)).toEqual(["doc1"]);
      expect(verifiedFacts(state).map((f) => f.id)).toEqual(["doc1-f1"]);
    });

    it("leaves the rest of the packet exactly as it would be without photos", () => {
      const links = analysis([{ statementId: "ans-amount", supports: ["doc1-f1"], contradicts: [], note: "" }]);
      const withPhoto = assemblePacket({ ...caseWithContract(), photos: [photo] }, links);
      const without = assemblePacket(caseWithContract(), links);
      expect({ ...withPhoto, photos: [] }).toEqual(without);
    });

    it("removing the photo removes its metadata and description from the packet", () => {
      const links = analysis([]);
      expect(assemblePacket({ ...caseWithContract(), photos: [photo] }, links).photos).toHaveLength(1);
      expect(JSON.stringify(assemblePacket({ ...caseWithContract(), photos: [] }, links))).not.toMatch(/deck\.jpg|PROVEN|abab/);
    });
  });
});
