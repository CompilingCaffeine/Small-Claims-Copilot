import { z } from "zod";
import { readImageInfo, stripMetadata } from "../image.ts";
import type { AiClient } from "./client.ts";
import { DESCRIBE_PHOTO_SYSTEM } from "./prompts.ts";

/** What Claude is asked to return for one photo. It's shown only as an AI visual description. */
export const DescribePhotoOutput = z.object({ description: z.string() });

const MAX_DESCRIPTION_CHARS = 400;

export type DescribeResult = { ok: true; description: string; sha256: string } | { ok: false; status: 400 | 502; error: string };

/**
 * Sends a copy of the photo with its embedded metadata (EXIF, including any GPS)
 * removed. The answer is plain text for a labeled card: it never becomes a fact,
 * and nothing in the packet's ✓ backed logic reads it.
 */
export async function describePhoto(ai: AiClient, filename: string, data: Buffer): Promise<DescribeResult> {
  const info = readImageInfo(data);
  if (!info) return { ok: false, status: 400, error: `${filename} isn't a readable JPEG or PNG image.` };
  const result = await ai.parse({
    system: DESCRIBE_PHOTO_SYSTEM,
    user: "Describe this photo.",
    image: { mediaType: info.mimeType, base64: stripMetadata(data).toString("base64") },
    schema: DescribePhotoOutput,
  });
  if (!result.ok) return { ok: false, status: 502, error: result.error };
  const description = result.data.description.replace(/\s+/g, " ").trim();
  if (!description) return { ok: false, status: 502, error: "The AI returned an empty description." };
  return {
    ok: true,
    description: description.length > MAX_DESCRIPTION_CHARS ? `${description.slice(0, MAX_DESCRIPTION_CHARS - 1)}…` : description,
    sha256: info.sha256,
  };
}
