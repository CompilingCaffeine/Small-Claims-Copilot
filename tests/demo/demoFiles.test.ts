import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { makePdf } from "../../scripts/pdf.ts";
import { DEMO_DOCUMENTS } from "../../src/demo/demoCase.ts";

// If this fails after changing the demo text, run `npm run demo-files`.
describe("demo-files/", () => {
  it.each(DEMO_DOCUMENTS.map((d) => [d.filename, d] as const))("%s matches the Demo case exactly", (filename, doc) => {
    const file = readFileSync(new URL(`../../demo-files/${filename}`, import.meta.url));
    if (doc.kind === "pdf") expect(file.equals(makePdf(doc.pages))).toBe(true);
    else expect(file.toString("utf8")).toBe(doc.pages.join("\n"));
  });
});
