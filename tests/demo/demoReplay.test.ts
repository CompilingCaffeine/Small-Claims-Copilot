import { describe, expect, it } from "vitest";
import { assemblePacket, verifiedFacts } from "../../shared/packet.ts";
import { demoCase, demoFingerprint } from "../../src/demo/demoCase.ts";
import { DemoRecording, demoReplay } from "../../src/demo/demoReplay.ts";
import saved from "../../src/demo/demoResults.json";

// If these fail after changing the demo text or the prompts, run `npm run record-demo`.
describe("saved demo run", () => {
  const recording = DemoRecording.parse(saved);
  const demo = demoCase();

  it("was recorded from the current demo content", () => {
    expect(recording.fingerprint).toBe(demoFingerprint(demo));
    expect(demoReplay(demo)).not.toBeNull();
  });

  it("isn't replayed once the demo is edited", () => {
    const edited = { ...demo, input: { ...demo.input, amountOwed: "$450" } };
    expect(demoReplay(edited)).toBeNull();
  });

  it("every recorded fact still verifies against the demo documents", () => {
    const recorded = Object.values(recording.facts).flatMap((f) => f.facts);
    expect(recorded.length).toBeGreaterThan(10);
    expect(verifiedFacts({ documents: demo.documents, facts: recording.facts })).toHaveLength(recorded.length);
  });

  it("produces the code-checked location and deposit flags", () => {
    const packet = assemblePacket({ ...demo, facts: recording.facts }, recording.analysis);
    const checked = packet.flags.filter((f) => f.basis === "checked").map((f) => f.statement.quote ?? f.statement.text);
    expect(checked).toContain("I don't know where the other party lives or does business.");
    expect(checked.some((t) => t.includes("$500"))).toBe(true);
    expect(packet.nextSteps[0]?.id).toBe("step-flags");
    expect(packet.nextSteps.find((s) => s.id === "step-location")?.action).toContain("invoice-1047.pdf");
  });
});
