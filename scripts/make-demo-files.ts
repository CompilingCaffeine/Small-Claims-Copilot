// Writes the demo's documents to demo-files/ exactly as the Demo case holds them,
// so you can upload them to My case. The invoice becomes a real PDF.
import { mkdirSync, writeFileSync } from "node:fs";
import { DEMO_DOCUMENTS } from "../src/demo/demoCase.ts";
import { makePdf } from "./pdf.ts";

const dir = new URL("../demo-files/", import.meta.url);
mkdirSync(dir, { recursive: true });
for (const doc of DEMO_DOCUMENTS) {
  const data = doc.kind === "pdf" ? makePdf(doc.pages) : doc.pages.join("\n");
  writeFileSync(new URL(doc.filename, dir), data);
  console.log(`demo-files/${doc.filename}`);
}
