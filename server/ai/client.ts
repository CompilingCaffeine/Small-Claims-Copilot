import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

export const MODEL = "claude-opus-5-5";

export type AiResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface AiRequest<S extends z.ZodType> {
  system: string;
  user: string;
  schema: S;
}

/** The only way server code talks to Claude. Tests inject a fake that returns canned output. */
export interface AiClient {
  parse<S extends z.ZodType>(request: AiRequest<S>): Promise<AiResult<z.infer<S>>>;
}

export function createAnthropicClient(apiKey = process.env.ANTHROPIC_API_KEY): AiClient {
  if (!apiKey) {
    return {
      async parse() {
        return { ok: false, error: "No ANTHROPIC_API_KEY is set. Add it to .env and restart `npm run dev`." };
      },
    };
  }
  const client = new Anthropic({ apiKey });

  return {
    async parse({ system, user, schema }) {
      try {
        const response = await client.beta.messages.parse({
          model: MODEL,
          max_tokens: 16000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
          system,
          messages: [{ role: "user", content: user }],
        });
        const u = response.usage;
        console.log(
          `[claude] model=${response.model} stop=${response.stop_reason} in=${u.input_tokens} out=${u.output_tokens}`,
        );
        if (response.stop_reason === "refusal") return { ok: false, error: "The AI declined to process this request." };
        if (response.stop_reason === "max_tokens") return { ok: false, error: "The AI's answer was cut off (too long)." };
        if (response.parsed_output == null) return { ok: false, error: "The AI's answer wasn't in the expected format." };
        return { ok: true, data: response.parsed_output };
      } catch (err) {
        if (err instanceof Anthropic.AuthenticationError) return { ok: false, error: "The API key was rejected." };
        if (err instanceof Anthropic.RateLimitError) return { ok: false, error: "Rate limited by the AI service. Try again shortly." };
        if (err instanceof Anthropic.APIError) return { ok: false, error: `AI service error (${err.status ?? "network"}).` };
        // Zod validation of the model's output throws here when the shape is wrong.
        console.error("[claude] unexpected error", err);
        return { ok: false, error: "The AI's answer wasn't in the expected format." };
      }
    },
  };
}
