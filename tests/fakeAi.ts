import type { AiClient } from "../server/ai/client.ts";

/** A stand-in for Claude: returns canned output (or a failure) for every request, and records prompts. */
type Call = { system: string; user: string; image?: { mediaType: string; base64: string } };

export function fakeAi(output: unknown | ((user: string) => unknown)): AiClient & { calls: Call[] } {
  const calls: Call[] = [];
  return {
    calls,
    async parse({ system, user, schema, image }) {
      calls.push({ system, user, ...(image ? { image } : {}) });
      const raw = typeof output === "function" ? (output as (u: string) => unknown)(user) : output;
      if (raw instanceof Error) return { ok: false, error: raw.message };
      // Mirror the real client: output that doesn't match the schema is a failed step.
      const parsed = schema.safeParse(raw);
      if (!parsed.success) return { ok: false, error: "The AI's answer wasn't in the expected format." };
      return { ok: true, data: parsed.data };
    },
  };
}
