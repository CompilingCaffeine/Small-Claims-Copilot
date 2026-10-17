---
doc: scope
status: approved
---

# Small Claims Copilot

A free tool that turns a California small claims dispute's scattered documents into a hearing-ready evidence packet that keeps what you claim separate from what your documents prove.

## The Unique Kernel
**Separating claims from proof.** Every statement in the packet is marked either *backed by a document* (with the exact excerpt one click away) or *your word only*. When your documents disagree with what you said (you say you don't know their address, but your invoice lists one; you say a $500 deposit, the receipt says $600), it's flagged at the top instead of smoothed over. Differences between documents are kept in the packet details, since you usually already know about them. This is the prep work the learner's lawyer never did.

## Who It's For
A tech-savvy California resident with a small claims dispute (the demo: a homeowner in a payment disagreement with a contractor) who has receipts, a contract, and a text thread scattered across email and their phone. Today they either organize it by hand, pay someone who may not do the prework, or give up.

## The Core Loop
Describe the dispute in a couple of sentences → add a few documents → generate the packet → review what's backed, what's unsupported, and what conflicts → answer follow-up questions or add a missing document → regenerate. They come back each time they find a new document or answer a question, watching "your word only" items turn into "backed by."

## Inspiration & Identity
Calm, trustworthy, organized, the opposite of the overwhelm of court paperwork. Clearly an organizer, not a lawyer: a visible notice that this is organizational help and general information, not legal advice.

## Why This Matters to the Learner
"I've had to go to small claims court twice and it sucked, was super hard, and I ended giving up out of frustration." The first time they gave up at serving the other party; another time a hired lawyer "did zero prework" before contesting a red-light camera citation, and they lost and the fine went up. Goal: a free app so people like them don't hit the same wall.

## What "Working" Looks Like
You open the app, type a two-sentence description of the fictional contractor dispute, and drop in 3–4 synthetic documents (contract, invoice, text thread). One click produces a packet: each of your statements marked **✓ backed by** (excerpt one click away) or **⚠ your word only**; a timeline; and **key flags** where what you said doesn't match your documents, e.g. you said you don't know where the other party does business, but your invoice lists their address. **That flag is the wow moment.** Next steps (each with why it matters) come right after the flags; everything else sits in the packet details, and you can print it.

## The POC Boundary
- One fictional California small claims demo case: a contractor payment dispute, with synthetic documents and a one-click reset to it.
- Dispute description + a few structured answers.
- Add a handful of text documents (PDF if it's cheap) and remove them.
- AI extracts facts with source excerpts; app code validates them, sorts the timeline, and checks mismatches between what you said and your documents (addresses, amounts, dates).
- Packet: key flags and next steps with "why it matters" first; then details: backed vs. your-word-only statements, timeline, evidence list, differences between documents, summary. Editable, printable.
- The demo case replays saved AI results, so trying it is instant and free; API calls are spent only on the user's own case.
- "Why it matters" explains the effect on organizing the case (e.g. "the amount you claim depends on which figure is right"). It never predicts outcomes. Any California law or procedure reference is a **hand-picked link to an official California Courts page with a last-checked date**, never AI-generated legal citations.
- Clear-case button; not-legal-advice notice; documents treated as untrusted data.
- **Photo evidence (experimental, added after the final review):** JPEG/PNG photos get technical metadata read from the file (type, size, dimensions, SHA-256, capture time if present; never GPS) and one labeled *AI visual description — review before using*. Photos sit in their own section and can never make a statement ✓ backed.

## Later
- Serving the other party: a service plan/checklist linked to official sources (the learner's own sticking point).
- Other low-stakes California disputes beyond small claims (e.g. traffic citation contests).
- More automation of the process overall.

## Explicitly Cut
- Filing forms, arranging service, contacting the other party: real-world legal actions, far beyond a 2–4 hour proof of concept, and risky to automate.
- Legal advice, outcome predictions, or deciding who's right: the app is an organizer, and pretending otherwise could hurt the people it's meant to help.
- AI-generated legal citations or rules: unverifiable and easy to hallucinate.
- Beyond the narrow photo slice: HEIC, OCR, image forensics or authenticity checks, video, GPS/location mapping, and scanned-PDF support. Each is its own project, and location data is a privacy risk.
- Accounts, database, deployment: not needed to prove the kernel.
