// POST /api/documents: turns one uploaded .txt or .pdf into page text, or a .jpg/.png
// photo into its technical metadata. Files are read in memory and never stored or
// executed. Scanned (image-only) PDFs have no text to quote, so they're rejected
// rather than guessed at.
import express, { type Request, type Response } from "express";
import multer from "multer";
import { extractText } from "unpdf";
import { IMAGE_EXTENSIONS, MAX_FILE_BYTES, MAX_IMAGE_SIDE } from "../shared/limits.ts";
import { readImageInfo, type ImageInfo } from "./image.ts";

const MAX_PAGES = 500;

export type ReadResult =
  | { ok: true; filename: string; kind: "txt" | "pdf"; pages: string[] }
  | { ok: true; filename: string; kind: "image"; image: ImageInfo }
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

  if ((IMAGE_EXTENSIONS as readonly string[]).includes(ext ?? "")) return readPhoto(filename, data);

  return { ok: false, status: 400, error: `${filename}: only .txt, .pdf, .jpg, and .png files are supported.` };
}

/** The file's type comes from its bytes; a renamed non-image is rejected. */
export function readPhoto(filename: string, data: Buffer): ReadResult {
  const image = readImageInfo(data);
  if (!image) return { ok: false, status: 400, error: `${filename} isn't a readable JPEG or PNG image.` };
  if (image.width > MAX_IMAGE_SIDE || image.height > MAX_IMAGE_SIDE) {
    return { ok: false, status: 422, error: `${filename} is larger than ${MAX_IMAGE_SIDE} pixels on a side.` };
  }
  return { ok: true, filename, kind: "image", image };
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_BYTES, files: 1 } }).single("file");

/** Receives one file into memory, or answers with a clear error and returns null. */
export function receiveFile(req: Request, res: Response): Promise<{ filename: string; data: Buffer } | null> {
  return new Promise((resolve, reject) => {
    upload(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") res.status(413).json({ error: "That file is larger than 2 MB." });
        else res.status(400).json({ error: "Upload one file at a time." });
        return resolve(null);
      }
      if (err) return reject(err);
      if (!req.file) {
        res.status(400).json({ error: "No file was uploaded." });
        return resolve(null);
      }
      // Browsers send UTF-8 filenames; multer reads the header as latin1.
      resolve({ filename: Buffer.from(req.file.originalname, "latin1").toString("utf8"), data: req.file.buffer });
    });
  });
}

export function uploadRouter() {
  const router = express.Router();
  router.post("/api/documents", async (req, res) => {
    const file = await receiveFile(req, res);
    if (!file) return;
    const result = await readDocument(file.filename, file.data);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    const { ok: _ok, ...body } = result;
    res.json(body);
  });
  return router;
}
