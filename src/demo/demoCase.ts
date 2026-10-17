// The Demo case: a fictional contractor payment dispute. Every name, business,
// address, and document here is made up. The document text matches the files in
// demo-files/ exactly. Generating the unedited demo replays a saved AI run
// (demoResults.json, see demoReplay.ts) instead of calling the API.
import { contentId } from "../../shared/ids.ts";
import { emptyCase, type CaseState, type SourceDocument } from "../../shared/schemas.ts";

const FICTIONAL = "FICTIONAL DOCUMENT FOR DEMONSTRATION ONLY";

export const DEMO_DOCUMENTS: SourceDocument[] = [
  {
    id: "demo-contract",
    filename: "contract.txt",
    kind: "txt",
    status: "ready",
    pages: [
      `${FICTIONAL}

HOME IMPROVEMENT AGREEMENT

This agreement is made on February 2, 2026 between Ridgeline Home Repair ("Contractor"), represented by Dale Prescott, and Jordan Avila ("Owner"), for work at the Owner's residence in Sacramento, California.

1. Scope of work. Contractor will replace the back deck boards and railing, and repaint the deck with two coats of weatherproof stain.

2. Price. The total contract price is $2,400.00, including labor and materials.

3. Deposit. Owner will pay a deposit of $600.00 on signing. The balance is due when the work is complete.

4. Schedule. Work will begin on February 16, 2026 and will be finished by March 6, 2026.

5. Changes. Any change to the work or the price must be agreed in writing by both parties before the change is made.

Signed: Dale Prescott, Ridgeline Home Repair
Signed: Jordan Avila
`,
    ],
  },
  {
    id: "demo-invoice",
    filename: "invoice-1047.pdf",
    kind: "pdf",
    status: "ready",
    pages: [
      `${FICTIONAL}
RIDGELINE HOME REPAIR
2150 Alder Creek Rd, Sacramento, CA 95826
Invoice #1047
Invoice date: March 12, 2026
Bill to: Jordan Avila
Job: Back deck replacement and stain
Deck boards and railing replacement: $1,650.00
Weatherproof stain, two coats: $750.00
Additional third coat of stain: $400.00
Total: $2,800.00
Less deposit received: $600.00
Balance due: $2,200.00
Payment due by: March 19, 2026`,
    ],
  },
  {
    id: "demo-texts",
    filename: "text-messages.txt",
    kind: "txt",
    status: "ready",
    pages: [
      `${FICTIONAL}

Text messages between Jordan Avila and Dale Prescott (Ridgeline Home Repair)

Mar 12, 2026, 4:05 PM - Dale: Deck is done. Sending the invoice tonight.
Mar 12, 2026, 9:40 PM - Jordan: Got it. The invoice says $2,800 but our contract says $2,400. What's the extra $400?
Mar 13, 2026, 8:15 AM - Dale: Third coat of stain. Wood was thirsty, had to do it.
Mar 13, 2026, 8:32 AM - Jordan: We never agreed to a third coat. The contract says changes have to be in writing.
Mar 16, 2026, 10:02 AM - Dale: Balance is $2,200. Pay it this week or I file a lien.
Mar 18, 2026, 6:47 PM - Jordan: I sent the $2,200 by Zelle today under protest. I want the $400 back.
Mar 19, 2026, 7:30 AM - Dale: Not giving that back. We're done here.
`,
    ],
  },
  {
    id: "demo-receipt",
    filename: "deposit-receipt.txt",
    kind: "txt",
    status: "ready",
    pages: [
      `${FICTIONAL}

PAYMENT RECEIPT
Ridgeline Home Repair

Received from: Jordan Avila
Date: February 2, 2026
Amount: $600.00
For: Deposit on back deck job (agreement dated February 2, 2026)
Payment method: Check #2231
Received by: Dale Prescott
`,
    ],
  },
];

export function demoCase(): CaseState {
  return {
    ...emptyCase(),
    input: {
      description:
        "I hired Ridgeline Home Repair to replace and stain my back deck for $2,400. I paid a $500 deposit when I signed. The work finished about a week late, and then Dale sent an invoice for $2,800, saying the extra $400 was for a third coat of stain I never agreed to. I paid the $2,200 balance under protest so he would stop threatening a lien, but I want the $400 back. Ridgeline has since moved and I only have Dale's phone number.",
      amountOwed: "$400",
      overdue: "about 6 weeks",
      saidWontPay: "yes",
      knowsLocation: "no",
    },
    documents: structuredClone(DEMO_DOCUMENTS),
  };
}

/** Identifies the exact demo content a recording was made from. Any edit changes it. */
export function demoFingerprint(state: Pick<CaseState, "input" | "documents">): string {
  const documents = state.documents.map(({ id, filename, pages, status }) => ({ id, filename, pages, status }));
  return contentId("demo", JSON.stringify({ input: state.input, documents }));
}
