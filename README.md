# Small Claims Copilot

A free tool that turns the scattered documents behind a California small claims dispute into an organized packet, keeping **what you say** separate from **what your documents show**.

- **✓ backed by**: a document says so, and the exact words are one click away. A program checks that every quote really appears in the document; the AI can't mark anything backed on its own.
- **⚠ your word only**: no document says so yet.
- **Key flags**: places where your own documents disagree with what you said. For example, you say you don't know where the other party does business, but your invoice lists their address. Code confirms the mismatch where it can (the quote really contains an address, or the amounts really differ); anything else is labeled *AI interpretation*.
- **Next steps**: what to do next, each with why it matters, plus a short link to the official California Courts self-help page where relevant.
- **Packet details**: your statements, a timeline (dates only when a document states them), an evidence list, differences between documents, and an editable summary. Print gives a clean packet.

> **Not legal advice.** This app organizes your documents and gives general information. It doesn't give legal advice, predict outcomes, or decide who's right.

## Run it

Requires Node.js 22+ and an [Anthropic API key](https://console.anthropic.com/).

```sh
npm install
cp .env.example .env   # then set ANTHROPIC_API_KEY=... in .env (never commit it)
npm run dev            # web on :5173, API on :3001
```

Open http://localhost:5173.

## Try the demo

Open the **Demo case** tab: a fictional homeowner disputing a $400 charge with a contractor. Go to **Add evidence** and click **Generate packet**. It's instant and free: the unedited demo replays one saved run of the AI (`src/demo/demoResults.json`), and code still re-checks every quote against the documents. Once you edit the demo, it calls the AI like your own case. **Reset demo** restores it.

To try uploads, open **My case** and drop in the files from `demo-files/` (three `.txt` files and a `.pdf`).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the web app and API server |
| `npm test` | All tests, offline: the AI is faked, no key needed |
| `npm run test:live` | A prompt-injection document against the real API (≈ $0.10) |
| `npm run typecheck` / `npm run build` | Type-check / production build |
| `npm run record-demo` | Re-records the demo's saved AI run (≈ $0.60). Run it after changing the demo text or the prompts; `npm test` fails until you do |
| `npm run demo-files` | Rewrites `demo-files/` from the Demo case text |

## How it works

1. **Extraction** (`server/ai/extractFacts.ts`): Claude lists the facts in each document, each with an exact quote. Code drops any fact whose quote isn't in the document, and any date or amount that isn't written in its own quote.
2. **Analysis** (`server/ai/analyze.ts`): Claude links your statements to facts that support or contradict them, and suggests next steps. Code drops references to statements or facts that don't exist.
3. **Packet** (`shared/packet.ts`): built in your browser from the analysis and your current documents. It decides ✓ backed / ⚠ your word only and code-checks key flags, so removing a document immediately removes what it backed.

## Data and privacy

- Your case (description, answers, document text, packet, edits) is saved only in this browser's localStorage, until you click **Clear case**.
- Document text and your description are sent to the Anthropic API to extract and link facts. The server reads uploads in memory and doesn't store them.
- The app never asks for the other party's address, your address, or financial account numbers.
- Text inside documents is treated as data, never as instructions (see `tests/server/injection.test.ts`).

## Limitations

- Proof of concept: one fictional demo case; California small claims only.
- `.txt` and `.pdf` only, up to 10 documents of 2 MB each. Scanned PDFs (images of pages) can't be read; paste their text instead.
- "Backed by" means a document says so, not that it's true.
- AI suggestions and summaries can be wrong; they're labeled, and you can edit the wording.
- Costs: a typical 4-document case costs roughly $0.60 in API usage per full generate (documents already read are reused).
