// POST /api/documents: turns one uploaded .txt or .pdf into page text. Files are
// read in memory and never stored or executed. Scanned (image-only) PDFs have no
// text to quote, so they're rejected rather than guessed at.
import express from "express";
import multer from "multer";
import { extractText } from "unpdf";
import { MAX_FILE_BYTES } from "../shared/limits.ts";

const MAX_PAGES = 500;

export type ReadResult =
  | { ok: true; filename: string; kind: "txt" | "pdf"; pages: string[] }
  | { ok: false; status: 400 | 422; error: string };

export async function readDocument(filename: string, data: Buffer): Promise<ReadResult> {
  const ext = filename.toLowerCase().match(/\.[a-z0-9]+$/)?.[0];

  if (ext === ".txt") {
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(data).replace(/^﻿/, "");
    } catch {
      return { ok: false, status: 400, error: `${filename} isn't plain text (UTF-8).` };
    }
    if (!text.trim()) return { ok: false, status: 422, error: `${filename} is empty.` };
    return { ok: true, filename, kind: "txt", pages: [text] };
  }

  if (ext === ".pdf") {
    if (data.subarray(0, 5).toString("latin1") !== "%PDF-") {
      return { ok: false, status: 400, error: `${filename} isn't a valid PDF.` };
    }
    let pages: string[];
    try {
      // Copy: PDF.js takes ownership of the bytes it's given.
      ({ text: pages } = await extractText(new Uint8Array(data), { mergePages: false }));
    } catch {
      return { ok: false, status: 422, error: `${filename} couldn't be read as a PDF.` };
    }
    if (pages.length > MAX_PAGES) return { ok: false, status: 422, error: `${filename} has more than ${MAX_PAGES} pages.` };
    if (pages.every((p) => !p.trim())) {
      return { ok: false, status: 422, error: `${filename} has no readable text (scanned PDFs aren't supported).` };
    }
    return { ok: true, filename, kind: "pdf", pages };
  }

  return { ok: false, status: 400, error: `${filename}: only .txt and .pdf files are supported.` };
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_BYTES, files: 1 } }).single("file");

export function uploadRouter() {
  const router = express.Router();
  router.post("/api/documents", (req, res, next) => {
    upload(req, res, async (err: unknown) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(413).json({ error: "That file is larger than 2 MB." });
        } else {
          res.status(400).json({ error: "Upload one .txt or .pdf file at a time." });
        }
        return;
      }
      if (err) return next(err);
      if (!req.file) {
        res.status(400).json({ error: "No file was uploaded." });
        return;
      }
      // Browsers send UTF-8 filenames; multer reads the header as latin1.
      const filename = Buffer.from(req.file.originalname, "latin1").toString("utf8");
      const result = await readDocument(filename, req.file.buffer);
      if (!result.ok) {
        res.status(result.status).json({ error: result.error });
        return;
      }
      res.json({ filename: result.filename, kind: result.kind, pages: result.pages });
    });
  });
  return router;
}
