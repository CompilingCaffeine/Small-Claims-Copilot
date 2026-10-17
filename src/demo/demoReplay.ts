// Replays the saved demo run while the demo is unedited. The replay only skips the
// API calls: the packet is still assembled, and every excerpt re-checked, by code.
import { z } from "zod";
import { Analysis, DocumentFacts, type CaseState } from "../../shared/schemas.ts";
import { demoFingerprint } from "./demoCase.ts";
import saved from "./demoResults.json";

export const DemoRecording = z.object({
  fingerprint: z.string(),
  recordedAt: z.string(),
  facts: z.record(z.string(), DocumentFacts),
  analysis: Analysis,
});
export type DemoRecording = z.infer<typeof DemoRecording>;

/** The saved results for this exact demo content, or null if it was edited (generate live). */
export function demoReplay(
  state: Pick<CaseState, "input" | "documents">,
  recording: unknown = saved,
): Pick<DemoRecording, "facts" | "analysis"> | null {
  const parsed = DemoRecording.safeParse(recording);
  if (!parsed.success || parsed.data.fingerprint !== demoFingerprint(state)) return null;
  return { facts: structuredClone(parsed.data.facts), analysis: structuredClone(parsed.data.analysis) };
}
