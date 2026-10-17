// Describes demo-files/deck-photo.jpg once with the real API, against the saved demo
// run's next steps, and saves the result to src/demo/demoPhoto.json, so adding that
// photo to the Demo case costs nothing. Re-run (≈ $0.02) after changing the photo, the
// description prompt, or the demo recording.
import { readFileSync, writeFileSync } from "node:fs";
import { createAnthropicClient } from "../server/ai/client.ts";
import { describePhoto } from "../server/ai/describePhoto.ts";
import { aiStepRefs } from "../shared/packet.ts";
import { DemoRecording } from "../src/demo/demoReplay.ts";
import saved from "../src/demo/demoResults.json";

const filename = "deck-photo.jpg";
const steps = aiStepRefs(DemoRecording.parse(saved).analysis);
const file = readFileSync(new URL(`../demo-files/${filename}`, import.meta.url));
const result = await describePhoto(createAnthropicClient(), filename, file, steps);
if (!result.ok) throw new Error(result.error);
const { sha256, description, answersStepIds } = result;
const recording = { filename, sha256, description, answersStepIds, recordedAt: new Date().toISOString() };
writeFileSync(new URL("../src/demo/demoPhoto.json", import.meta.url), JSON.stringify(recording, null, 1) + "\n");
console.log(description);
console.log("answers:", steps.filter((s) => answersStepIds.includes(s.id)).map((s) => s.action));
