---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast (chosen by learner; pauses at the slice 3 checkpoint and final review)

## Slices

- [x] **1. Paste a document and see its facts, each proven by an exact quote**
  Becomes usable: A running app (notice pinned at the top, step indicator) where you paste a document into Add evidence, click Extract, and see the facts Claude found, each with its excerpt and page. Any fact whose quote isn't really in the document is dropped and counted.
  Why now: This is the riskiest piece and the base of the kernel. It tests the live Claude call, `messages.parse` with Zod output, and the `fallbacks` question, and it proves the code-checks-the-quote mechanism before anything is built on top of it. Bootstrapping happens here: Vite + React + Express + TS 6.0, `npm run dev`, style tokens.
  PRD ref: `prd.md > Generate packet`, `prd.md > Not-legal-advice notice`, `prd.md > Look and Feel`
  Spec ref: `spec.md > Stack`, `spec.md > Where It Runs and How Someone Tries It`, `spec.md > Look and Feel`, `spec.md > App shell`, `spec.md > Fact extraction`, `spec.md > Data Model`, `spec.md > File Structure`, `spec.md > External Services and Dependencies` (Claude API)
  Build: Scaffold per the file structure (package.json scripts, vite proxy, `.env.example`, `index.html` with Geist). `shared/schemas.ts`, `shared/limits.ts`, `shared/excerpt.ts`, `shared/normalize.ts`. `server/index.ts`, `server/ai/client.ts` (AiClient interface + real client), `server/ai/prompts.ts` (untrusted-document rule), `server/ai/extractFacts.ts` → `POST /api/extract`. `src/App.tsx` shell + `Notice` + stepper, `src/styles.css` tokens, a minimal Evidence step with a paste box that lists verified facts with `SourceExcerpt`.
  Verify (mechanical): `npm test` passes `excerpt.test.ts` (exact, whitespace/quote-normalized, fabricated), `normalize.test.ts`, and an extract route test with a fake AI (a fabricated excerpt is dropped, malformed output returns a failed step, no crash). `npx tsc --noEmit` is clean. With a real key: `npm run dev` starts both processes, a live `POST /api/extract` on the demo contract returns verified facts with pages, `usage` is recorded, and the `fallbacks` + `messages.parse` result is noted under Revisions.
  Learner check: Run `npm run dev`, open http://localhost:5173, paste a short fictional contract into Add evidence, and extract. Each fact should show the exact words it came from. Then edit the pasted text so a quoted phrase no longer appears, extract again, and confirm that fact disappears instead of being shown as backed.
  Commit: `Scaffold app and verify extracted facts against exact excerpts`

- [ ] **2. Describe your case and see each statement marked ✓ backed or ⚠ your word only**
  Becomes usable: Fill in Describe (description plus the four clarifying questions), see backing prompts in Add evidence ("You said he owes $2,800. Do you have…"), click Generate packet, and get a Review page listing your statements, each ✓ backed by (click to reveal the document, page, and excerpt) or ⚠ your word only.
  Why now: This is the kernel itself, separating claims from proof, and it sits right on top of slice 1's verified facts. Everything after this is packaging around it.
  PRD ref: `prd.md > The Core Journey` (steps 2–6), `prd.md > Describe: clarifying questions`, `prd.md > Add evidence` (backing prompts), `prd.md > Review packet` (Statements), `prd.md > Editing` (no hand-marked backing), `prd.md > States and Boundaries` (Nothing to generate, No documents, AI returns malformed output)
  Spec ref: `spec.md > Describe step`, `spec.md > Evidence step`, `spec.md > Analysis`, `spec.md > Packet assembly` (Statements), `spec.md > Review step`, `spec.md > The Core Journey Through the System` (steps 4–7)
  Build: `src/steps/DescribeStep.tsx`, `shared/statements.ts` (answers → UserStatements with fixed IDs + backing prompts), `server/ai/analyze.ts` → `POST /api/analyze` (drop unknown fact IDs and unquoted description claims), `shared/packet.ts` `assemblePacket()` statements part, `src/api.ts`, Generate flow with per-document extraction cached on the document, `src/steps/ReviewStep.tsx` + `packet/Statements`, `StatusTag`, error banner that keeps inputs. Generate disabled with a reason when there's nothing to generate.
  Verify (mechanical): `npm test` passes `statements.test.ts`, `packet.test.ts` (an "obedient" fake AI that claims everything is supported still yields ⚠ your word only without a verified fact; no documents → all your word only), and an analyze route test (unknown fact IDs and fake quotes dropped; malformed output → error, not a crash). Live: generate on a pasted contract plus a description, and confirm at least one ✓ backed and one ⚠ your word only statement in the response.
  Learner check: Describe a dispute with an amount, paste one document that supports part of it, and generate. Click a ✓ backed statement to see its excerpt, and confirm a claim with no document behind it shows ⚠ your word only. Check that nothing on the page lets you mark something as backed by hand.
  Commit: `Mark statements backed or your-word-only from verified facts`

- [ ] **3. The demo case flags the $2,400 vs $2,800 conflict at the top, and your case survives a browser restart**
  Becomes usable: A **Demo case** tab pre-filled with the fictional contractor dispute (contract, invoice, text thread, deposit receipt) that generates a packet opening with **Needs attention**: the amount conflict with both excerpts side by side, and the "location unknown" gap. Follow-up questions follow, each with why it matters and, where relevant, a dated official California Courts link. My case and Demo case are kept separately in the browser and survive closing it; Reset demo and Clear case (with confirmation) work.
  Why now: The conflict flag is the wow moment and completes the kernel's "flag disagreements instead of smoothing them over." The demo case gives a realistic dataset for everything after it, and the tabs need the case store, so persistence comes in here too. This is the right point for your first hands-on look, while the remaining slices can still change.
  PRD ref: `prd.md > Case tabs and demo case`, `prd.md > Review packet` (Needs attention, Follow-up questions), `prd.md > Clear case`, `prd.md > States and Boundaries` (First use, Persistence, Some facts unknown), `prd.md > The Core Journey` (success criteria)
  Spec ref: `spec.md > Case store`, `spec.md > Demo case`, `spec.md > Packet assembly` (Conflicts, Gaps, Follow-ups), `spec.md > External Services and Dependencies` (California Courts self-help), `spec.md > Data Model`, `spec.md > Important Failure Modes` (localStorage)
  Build: `src/demo/demoCase.ts` (synthetic, labeled fictional; pages pre-extracted), `shared/conflicts.ts` (code-detected + AI-proposed checked/ai_interpretation), `shared/gaps.ts` (location, amount, no documents, failed documents + rule follow-ups), `shared/officialLinks.ts` (verify real selfhelp.courts.ca.gov URLs, dated the day checked), `packet/NeedsAttention` + `packet/FollowUps`, `src/state/caseStore.ts` (`useCase(tab)`, Zod-validated localStorage, corrupt → fresh with message, quota banner), tabs, Reset demo, Clear case with `ConfirmDialog`, first-use hint.
  Verify (mechanical): `npm test` passes `conflicts.test.ts` (conflicting amounts and dates across two documents; same values → no conflict), `gaps.test.ts` (location no/not sure → gap + linked follow-up), a case store test (round-trip; corrupt data → fresh). Each official URL is fetched and returns 200. Live: generate on the Demo case and confirm the packet has a `checked` conflict 240000 vs 280000 cents and a location gap with a link.
  Learner check: Open Demo case and generate. The $2,400 vs $2,800 conflict should be first, with both excerpts, followed by the location gap and its official link. Type something in My case, switch tabs and back, close the browser and reopen it: both cases should be as you left them. Try Reset demo, and Clear case on My case.
  Commit: `Add demo case, conflict and gap flags, and saved cases`

- [ ] **4. Upload real .txt and .pdf files, with clear failures**
  Becomes usable: Drag in or pick `.txt`/`.pdf` files (up to 10, 2 MB each). Each shows its filename and status (reading / ready / failed) with Remove and Retry. Wrong types, oversized files, an 11th document, and scanned PDFs get clear messages, and one failed document doesn't stop the packet. `demo-files/` holds the demo documents as real files, including the invoice as a PDF.
  Why now: Paste already proves the kernel, so file handling is the next real behavior. It brings its own risks (PDF text extraction, limits) that should be settled before the packet is finished. The prompt-injection test belongs here too because uploaded files are the main way untrusted text gets in.
  PRD ref: `prd.md > Add evidence`, `prd.md > Generate packet` (document instructions treated as content), `prd.md > States and Boundaries` (Extraction failed for one document)
  Spec ref: `spec.md > Upload endpoint`, `spec.md > Evidence step`, `spec.md > Demo case` (`demo-files/`), `spec.md > Important Failure Modes`
  Build: `server/upload.ts` → `POST /api/documents` (multer memory, 2 MB, `.txt` UTF-8, `.pdf` magic bytes + unpdf per page, no text → 422), drop zone + picker with client-side checks, per-document status/remove/retry, `demo-files/` (generate the invoice PDF), `tests/fixtures/` injection doc, `npm run test:live`.
  Verify (mechanical): `npm test` passes route tests (wrong type → 400, over 2 MB → 413, textless PDF → 422, good .txt and .pdf → pages) and a structural injection test (with a fake "obedient" model, the injection document doesn't make anything backed that lacks a verified excerpt). Live: upload `demo-files/invoice.pdf` via curl and get its text page by page; `npm run test:live` on the injection fixture returns ordinary facts.
  Learner check: In My case, upload the files from `demo-files/`, including the PDF, and watch each one go from reading to ready. Try an image or a big file and read the message. Remove a document, regenerate, and confirm nothing from it remains in the packet.
  Commit: `Upload txt and pdf documents with limits and failure states`

- [ ] **5. A complete packet you can edit and print**
  Becomes usable: Review packet is complete, in order: Needs attention → Follow-ups → Statements → Timeline (dated events sorted, undated listed as "date unknown") → Evidence list (each document and what it backs) → Case summary (labeled AI interpretation). You can edit the summary, statement wording, and follow-up answers, and edits survive regenerating. Print gives a clean packet with no buttons, excerpts expanded, statuses written out, and the notice included. README covers setup, the demo, limitations, and data handling.
  Why now: These sections all build on facts and statements that already exist, so they're lower risk and best done last. Finishing here leaves the full core journey for final review.
  PRD ref: `prd.md > Review packet` (Timeline, Evidence list, Case summary), `prd.md > Editing`, `prd.md > Print`, `prd.md > The Core Journey` (step 7)
  Spec ref: `spec.md > Packet assembly` (Timeline, Evidence list, Summary), `spec.md > Editing`, `spec.md > Review step`, `spec.md > Look and Feel` (Print), `spec.md > File Structure` (README.md)
  Build: `shared/timeline.ts`, `packet/Timeline`, `packet/EvidenceList`, `packet/Summary`, `packet/Editable` (edits by stable ID), follow-up answer fields, print CSS + Print button, `README.md`.
  Verify (mechanical): `npm test` passes `timeline.test.ts` (sorted; undated separated; missing date → unknown) and packet tests for evidence rows, edits reapplied by ID after reassembly, and unknown amounts shown as unknown. `npx tsc --noEmit` and `npm run build` are clean. Live: the full demo journey generates every section.
  Learner check: Generate the demo packet, read it top to bottom, edit the summary and one statement's wording, regenerate, and confirm your edits are still there. Open the print preview and check that it reads like a clean document you could hand to someone.
  Commit: `Complete packet with timeline, evidence list, editing, and print`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 3 (demo case with the conflict flag, statements, saved cases)
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: [what actually happened; real document/test/code references; unfinished work if interrupted]
Route and stops: [actual paths and symbols; guided stops completed, or reference-only route]
Edit outcome: [tried/kept/reverted/declined/not applicable; verification if changed]
Reflection: [offered/answered/declined/already covered — personal answer belongs only in the ignored profile]
Activity mode: [live app and editor, explicit static fallback, focused alternative, prior practice, or recap]

## Revisions

- Server split into `server/app.ts` (`createApp({ ai })`) and `server/index.ts` (starts listening) — route tests need to inject a fake AI without opening a port.
- `fallbacks: "default"` works with `client.beta.messages.parse` (beta `server-side-fallback-2026-07-01`) — confirmed on the first live call, so it stays in.
- Cost estimate corrected: one contract extraction used ~1.6k input / 1.4k output tokens (≈ $0.03), so a full demo run (4 documents + analysis) is roughly $0.15–0.25, not "well under a cent" — the first live call measured it.
- Extraction asks Claude for each value *as written* (`valueText`) and code normalizes it; a date/amount whose normalized value isn't written in its own excerpt is dropped, and `eventDate` is kept only when that date is written in the excerpt — a stricter version of the spec's "value normalization," closing a gap where a real excerpt could carry a mislabeled value.
