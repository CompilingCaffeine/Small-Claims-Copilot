// Runs the real extraction and analysis once on the demo case and saves the results
// to src/demo/demoResults.json, so trying the demo costs nothing. Re-run it (≈ $0.60)
// after changing the demo's text or the prompts; `npm test` fails until you do.
import { writeFileSync } from "node:fs";
import { analyzeCase } from "../server/ai/analyze.ts";
import { createAnthropicClient } from "../server/ai/client.ts";
import { extractFacts } from "../server/ai/extractFacts.ts";
import { verifiedFacts } from "../shared/packet.ts";
import type { DocumentFacts } from "../shared/schemas.ts";
import { demoCase, demoFingerprint } from "../src/demo/demoCase.ts";

const ai = createAnthropicClient();
const demo = demoCase();

const facts: Record<string, DocumentFacts> = {};
await Promise.all(
  demo.documents.map(async (doc) => {
    const result = await extractFacts(ai, doc);
    if (!result.ok) throw new Error(`${doc.filename}: ${result.error}`);
    facts[doc.id] = { status: "done", facts: result.facts, droppedCount: result.droppedCount };
    console.log(`${doc.filename}: ${result.facts.length} facts, ${result.droppedCount} dropped`);
  }),
);

const result = await analyzeCase(ai, { input: demo.input, facts: verifiedFacts({ documents: demo.documents, facts }) });
if (!result.ok) throw new Error(`analysis: ${result.error}`);

const recording = { fingerprint: demoFingerprint(demo), recordedAt: new Date().toISOString(), facts, analysis: result.analysis };
writeFileSync(new URL("../src/demo/demoResults.json", import.meta.url), JSON.stringify(recording, null, 1) + "\n");
console.log(`Saved src/demo/demoResults.json (${result.analysis.statements.length} statements, ${result.analysis.nextSteps.length} AI steps).`);
