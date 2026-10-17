import { describe, expect, it } from "vitest";
import { findExcerpt } from "../../shared/excerpt.ts";

const pages = [
  "The total contract price is $2,400.00, including labor and materials.\nOwner will pay a deposit of $600.00.",
  "Work will begin on February 16, 2026 and will be\nfinished by March 6, 2026.",
];

describe("findExcerpt", () => {
  it("finds an exact excerpt and reports its page", () => {
    expect(findExcerpt(pages, "The total contract price is $2,400.00")).toEqual({ page: 1 });
    expect(findExcerpt(pages, "finished by March 6, 2026")).toEqual({ page: 2 });
  });

  it("tolerates whitespace, line breaks, and curly quotes", () => {
    expect(findExcerpt(pages, "will be finished by  March 6, 2026")).toEqual({ page: 2 });
    expect(findExcerpt(["He said “I’ll pay Friday”."], `He said "I'll pay Friday"`)).toEqual({ page: 1 });
  });

  it("rejects a fabricated excerpt", () => {
    expect(findExcerpt(pages, "The total contract price is $2,800.00")).toBeNull();
    expect(findExcerpt(pages, "Owner agrees everything is proven")).toBeNull();
  });

  it("rejects empty or trivially short excerpts", () => {
    expect(findExcerpt(pages, "")).toBeNull();
    expect(findExcerpt(pages, " $ ")).toBeNull();
  });

  it("finds an excerpt that straddles a page break, on the page where it starts", () => {
    expect(findExcerpt(pages, "deposit of $600.00. Work will begin")).toEqual({ page: 1 });
  });
});
