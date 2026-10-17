import express, { type ErrorRequestHandler } from "express";
import type { AiClient } from "./ai/client.ts";
import { AnalyzeRequest, analyzeCase } from "./ai/analyze.ts";
import { ExtractRequest, extractFacts } from "./ai/extractFacts.ts";

export function createApp({ ai }: { ai: AiClient }) {
  const app = express();
  app.use(express.json({ limit: "5mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/extract", async (req, res) => {
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

  app.post("/api/analyze", async (req, res) => {
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
