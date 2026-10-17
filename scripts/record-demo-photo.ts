// Describes demo-files/deck-photo.jpg once with the real API and saves the result to
// src/demo/demoPhoto.json, so adding that photo to the Demo case costs nothing.
// Re-run (≈ $0.02) after changing the photo or the description prompt.
import { readFileSync, writeFileSync } from "node:fs";
import { createAnthropicClient } from "../server/ai/client.ts";
import { describePhoto } from "../server/ai/describePhoto.ts";

const filename = "deck-photo.jpg";
const result = await describePhoto(createAnthropicClient(), filename, readFileSync(new URL(`../demo-files/${filename}`, import.meta.url)));
if (!result.ok) throw new Error(result.error);
const recording = { filename, sha256: result.sha256, description: result.description, recordedAt: new Date().toISOString() };
writeFileSync(new URL("../src/demo/demoPhoto.json", import.meta.url), JSON.stringify(recording, null, 1) + "\n");
console.log(recording.description);
