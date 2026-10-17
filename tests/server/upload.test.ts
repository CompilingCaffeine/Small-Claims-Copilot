import request from "supertest";
import { describe, expect, it } from "vitest";
import { makePdf } from "../../scripts/pdf.ts";
import { createApp } from "../../server/app.ts";
import { DEMO_DOCUMENTS } from "../../src/demo/demoCase.ts";
import { fakeAi } from "../fakeAi.ts";

const app = createApp({ ai: fakeAi({}) });
const post = (filename: string, data: Buffer) => request(app).post("/api/documents").attach("file", data, filename);

describe("POST /api/documents", () => {
  it("returns a .txt file's text as one page", async () => {
    const res = await post("contract.txt", Buffer.from("﻿The total contract price is $2,400.00."));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ filename: "contract.txt", kind: "txt", pages: ["The total contract price is $2,400.00."] });
  });

  it("returns a PDF's text page by page", async () => {
    const res = await post("two-pages.pdf", makePdf(["Page one says $2,400.", "Page two says $2,800."]));
    expect(res.status).toBe(200);
    expect(res.body.kind).toBe("pdf");
    expect(res.body.pages).toEqual(["Page one says $2,400.", "Page two says $2,800."]);
  });

  it("reads the demo invoice PDF back as exactly the demo's text", async () => {
    const invoice = DEMO_DOCUMENTS.find((d) => d.kind === "pdf")!;
    const res = await post(invoice.filename, makePdf(invoice.pages));
    expect(res.body.pages).toEqual(invoice.pages);
  });

  it("rejects other file types with 400", async () => {
    const res = await post("photo.png", Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/only \.txt and \.pdf/);
  });

  it("rejects a .pdf that isn't a PDF, and a .txt that isn't text, with 400", async () => {
    expect((await post("fake.pdf", Buffer.from("hello"))).status).toBe(400);
    expect((await post("binary.txt", Buffer.from([0xff, 0xfe, 0xfd]))).status).toBe(400);
  });

  it("rejects files over 2 MB with 413", async () => {
    const res = await post("big.txt", Buffer.alloc(2 * 1024 * 1024 + 1, "a"));
    expect(res.status).toBe(413);
    expect(res.body.error).toMatch(/larger than 2 MB/);
  });

  it("rejects a PDF with no text (like a scan) with 422", async () => {
    const res = await post("scan.pdf", makePdf([""]));
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/no readable text/);
  });

  it("rejects a broken PDF with 422 instead of crashing", async () => {
    const res = await post("broken.pdf", Buffer.from("%PDF-1.4\nnot really a pdf"));
    expect(res.status).toBe(422);
  });

  it("keeps non-ASCII filenames intact", async () => {
    const res = await post("reçu.txt", Buffer.from("Amount: $600.00"));
    expect(res.body.filename).toBe("reçu.txt");
  });
});
