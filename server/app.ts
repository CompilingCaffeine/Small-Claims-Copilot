import { timingSafeEqual } from "node:crypto";
import express, { type ErrorRequestHandler, type RequestHandler } from "express";
import type { AiClient } from "./ai/client.ts";
import { AnalyzeRequest, analyzeCase } from "./ai/analyze.ts";
import { ExtractRequest, extractFacts } from "./ai/extractFacts.ts";
import { StepRefs, describePhoto } from "./ai/describePhoto.ts";
import { receiveFile, uploadRouter } from "./upload.ts";

export const ACCESS_CODE_REQUIRED = "Live AI on this site needs an access code. Enter it at the top of My case.";

/**
 * accessCodes: undefined runs live AI for anyone (local use). A list (the hosted copy)
 * requires one of its codes in the X-Access-Code header on every route that calls the
 * AI; an empty list locks those routes, so a missing setting never opens them up.
 * Reading uploads costs nothing, so it stays open.
 */
export function createApp({ ai, accessCodes }: { ai: AiClient; accessCodes?: string[] }) {
  const app = express();
  app.use(express.json({ limit: "5mb" }));

  const needsCode: RequestHandler = (req, res, next) => {
    if (!accessCodes || matchesAny(accessCodes, req.get("x-access-code") ?? "")) return next();
    res.status(401).json({ error: ACCESS_CODE_REQUIRED, accessCodeRequired: true });
  };

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, accessCodeRequired: accessCodes !== undefined });
  });

  // Lets the page check a code when it's entered, instead of at the first Generate.
  app.post("/api/access", needsCode, (_req, res) => {
    res.json({ ok: true });
  });

  app.use(uploadRouter());

  app.post("/api/photos/describe", needsCode, async (req, res) => {
    const file = await receiveFile(req, res);
    if (!file) return;
    let steps: StepRefs = [];
    try {
      steps = StepRefs.parse(JSON.parse(String(req.body?.steps ?? "[]")));
    } catch {
      res.status(400).json({ error: "Invalid next steps." });
      return;
    }
    const result = await describePhoto(ai, file.filename, file.data, steps);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({ description: result.description, sha256: result.sha256, answersStepIds: result.answersStepIds });
  });

  app.post("/api/extract", needsCode, async (req, res) => {
    const parsed = ExtractRequest.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid document." });
      return;
    }
    const result = await extractFacts(ai, parsed.data.document);
    if (!result.ok) {
      res.status(502).json({ error: result.error });
      return;
    }
    res.json({ facts: result.facts, droppedCount: result.droppedCount });
  });

  app.post("/api/analyze", needsCode, async (req, res) => {
    const parsed = AnalyzeRequest.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid case data." });
      return;
    }
    const result = await analyzeCase(ai, parsed.data);
    if (!result.ok) {
      res.status(502).json({ error: result.error });
      return;
    }
    res.json(result.analysis);
  });

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    const status = typeof err?.status === "number" ? err.status : 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status === 413 ? "That's too large." : "Something went wrong on the server." });
  };
  app.use(onError);

  return app;
}

/** ACCESS_CODES: comma-separated, so each person can get their own code and lose it alone. */
export function parseAccessCodes(value: string | undefined): string[] {
  return (value ?? "").split(",").map((c) => c.trim()).filter((c) => c.length >= 8);
}

function matchesAny(codes: string[], given: string): boolean {
  const g = Buffer.from(given);
  // Check every code, in constant time per code, so timing doesn't reveal a near match.
  return codes.map((c) => Buffer.from(c)).reduce((hit, c) => (c.length === g.length && timingSafeEqual(c, g)) || hit, false);
}
