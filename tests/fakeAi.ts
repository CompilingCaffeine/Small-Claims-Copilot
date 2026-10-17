import type { AiClient } from "../server/ai/client.ts";

/** A stand-in for Claude: returns canned output (or a failure) for every request, and records prompts. */
export function fakeAi(output: unknown | ((user: string) => unknown)): AiClient & { calls: { system: string; user: string }[] } {
  const calls: { system: string; user: string }[] = [];
  return {
    calls,
    async parse({ system, user, schema }) {
      calls.push({ system, user });
      const raw = typeof output === "function" ? (output as (u: string) => unknown)(user) : output;
      if (raw instanceof Error) return { ok: false, error: raw.message };
      // Mirror the real client: output that doesn't match the schema is a failed step.
      const parsed = schema.safeParse(raw);
      if (!parsed.success) return { ok: false, error: "The AI's answer wasn't in the expected format." };
      return { ok: true, data: parsed.data };
    },
  };
}
