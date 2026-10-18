// Vercel Function entry (bundled by scripts/vercel-output.ts): the same app as
// `npm run dev`.
import type { IncomingMessage, ServerResponse } from "node:http";
import { createAnthropicClient } from "./ai/client.ts";
import { createApp } from "./app.ts";

const app = createApp({ ai: createAnthropicClient() });

export default function handler(req: IncomingMessage, res: ServerResponse) {
  // Every /api/* path is routed to this one function. If the platform passes the
  // rewritten URL, the original path arrives as ?__path=.
  const url = new URL(req.url ?? "/", "http://localhost");
  const path = url.searchParams.get("__path");
  if (path !== null) {
    url.searchParams.delete("__path");
    req.url = `/api/${path}${url.search}`;
  }
  return app(req, res);
}
