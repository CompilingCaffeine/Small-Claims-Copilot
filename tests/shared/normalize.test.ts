import { describe, expect, it } from "vitest";
import { findAmounts, findDates, parseAmountToCents, parseDate } from "../../shared/normalize.ts";

describe("amounts", () => {
  it("parses unambiguous dollar amounts to cents", () => {
    expect(parseAmountToCents("$2,400.00")).toBe(240000);
    expect(parseAmountToCents("$2,800")).toBe(280000);
    expect(parseAmountToCents("2400")).toBe(240000);
    expect(parseAmountToCents("$ 99.95")).toBe(9995);
  });

  it("returns null (unknown) when there is no clear amount", () => {
    expect(parseAmountToCents("a couple thousand")).toBeNull();
    expect(parseAmountToCents("")).toBeNull();
  });

  it("finds every amount written in a passage", () => {
    expect(findAmounts("Total $2,400.00, deposit $600 paid.")).toEqual([240000, 60000]);
  });
});

describe("dates", () => {
  it("parses common written date formats to ISO", () => {
    expect(parseDate("March 6, 2026")).toBe("2026-03-06");
    expect(parseDate("Feb. 2 2026")).toBe("2026-02-02");
    expect(parseDate("6 March 2026")).toBe("2026-03-06");
    expect(parseDate("3/6/2026")).toBe("2026-03-06");
    expect(parseDate("2026-03-06")).toBe("2026-03-06");
  });

  it("returns null (unknown) for vague or impossible dates", () => {
    expect(parseDate("next Friday")).toBeNull();
    expect(parseDate("early March")).toBeNull();
    expect(parseDate("February 30, 2026")).toBeNull();
  });

  it("finds every date in a passage", () => {
    expect(findDates("Begin on February 16, 2026 and finish by March 6, 2026.")).toEqual(["2026-02-16", "2026-03-06"]);
  });
});
