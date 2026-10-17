// Excerpt verification: the check that makes "✓ backed by" trustworthy.
// The AI says "this fact comes from these words"; code confirms the words really
// appear in the document and works out which page they're on.

const MIN_EXCERPT_CHARS = 4;

/** Normalize only differences that don't change meaning: quote styles, dashes, whitespace. */
export function normalizeForMatch(text: string): string {
  return text
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/…/g, "...")
    .replace(/[\s ]+/g, " ")
    .trim();
}

/** Returns the 1-based page the excerpt appears on, or null if it isn't in the document. */
export function findExcerpt(pages: string[], quote: string): { page: number } | null {
  const needle = normalizeForMatch(quote);
  if (needle.length < MIN_EXCERPT_CHARS) return null;

  const normalizedPages = pages.map(normalizeForMatch);
  for (let i = 0; i < normalizedPages.length; i++) {
    if (normalizedPages[i]!.includes(needle)) return { page: i + 1 };
  }

  // An excerpt can straddle a page break; attribute it to the page where it starts.
  const joined = normalizedPages.join(" ");
  const at = joined.indexOf(needle);
  if (at === -1) return null;
  let offset = 0;
  for (let i = 0; i < normalizedPages.length; i++) {
    offset += normalizedPages[i]!.length + 1;
    if (at < offset) return { page: i + 1 };
  }
  return null;
}
