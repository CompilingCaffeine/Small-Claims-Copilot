import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readImageInfo } from "../../server/image.ts";
import { demoPhotoDescription } from "../../src/demo/demoReplay.ts";
import saved from "../../src/demo/demoPhoto.json";

// If this fails after changing the demo photo or the prompt, run `npm run record-demo-photo`.
describe("demo photo", () => {
  const file = readFileSync(new URL("../../demo-files/deck-photo.jpg", import.meta.url));
  const sha256 = createHash("sha256").update(file).digest("hex");

  it("has a recorded description matched to its exact bytes", () => {
    expect(demoPhotoDescription(sha256)).toMatch(/^Photo appears to show/);
    expect(demoPhotoDescription("0".repeat(64))).toBeNull();
    expect((saved as { sha256: string }).sha256).toBe(sha256);
  });

  it("is a synthetic JPEG with a capture time and no GPS", () => {
    expect(readImageInfo(file)).toMatchObject({ mimeType: "image/jpeg", width: 1200, height: 900, capturedAt: "2026-03-13T09:20:14" });
    expect(file.toString("latin1")).not.toMatch(/GPS/);
  });
});
