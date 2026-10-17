import { describe, expect, it } from "vitest";
import { looksLikeAddress } from "../../shared/address.ts";

describe("looksLikeAddress", () => {
  it.each([
    "2150 Alder Creek Rd, Sacramento, CA 95826",
    "Office: 18 W. Main Street",
    "Sacramento CA 95826",
    "P.O. Box 4471",
  ])("recognizes %j", (text) => expect(looksLikeAddress(text)).toBe(true));

  it.each([
    "for work at the Owner's residence in Sacramento, California",
    "Total: $2,800.00",
    "Mar 12, 2026, 4:05 PM - Dale: Deck is done.",
    "Payment method: Check #2231",
  ])("doesn't mistake %j for an address", (text) => expect(looksLikeAddress(text)).toBe(false));
});
