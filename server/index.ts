import { createAnthropicClient } from "./ai/client.ts";
import { createApp } from "./app.ts";

const PORT = 3001;

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn("[server] ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.");
}

createApp({ ai: createAnthropicClient() }).listen(PORT, () => {
  console.log(`[server] API listening on http://localhost:${PORT}`);
});
