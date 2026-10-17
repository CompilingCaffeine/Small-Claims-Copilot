// Turns written amounts and dates into comparable values. Anything that can't be
// read unambiguously comes back as null ("unknown"), never a guess.

const MONEY = /\$\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{2}))?/g;

export function parseAmountToCents(text: string): number | null {
  const all = findAmounts(text);
  if (all.length > 0) return all[0]!;
  // Allow a bare number like "2400" or "2,400.00" when the whole string is the amount.
  const bare = text.trim().match(/^(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{2}))?$/);
  if (!bare) return null;
  return toCents(bare[1]!, bare[2]);
}

/** Every dollar amount written in the text, in cents. */
export function findAmounts(text: string): number[] {
  return [...text.matchAll(MONEY)].map((m) => toCents(m[1]!, m[2]));
}

function toCents(whole: string, fraction: string | undefined): number {
  return Number(whole.replace(/,/g, "")) * 100 + (fraction ? Number(fraction) : 0);
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_NAME =
  "(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\.?";
const DATE_PATTERNS: { re: RegExp; toIso: (m: RegExpMatchArray) => string | null }[] = [
  { re: /\b(\d{4})-(\d{2})-(\d{2})\b/g, toIso: (m) => iso(+m[1]!, +m[2]!, +m[3]!) },
  {
    re: new RegExp(`\\b${MONTH_NAME}\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, "gi"),
    toIso: (m) => iso(+m[3]!, monthIndex(m[1]!), +m[2]!),
  },
  {
    re: new RegExp(`\\b(\\d{1,2})\\s+${MONTH_NAME},?\\s+(\\d{4})\\b`, "gi"),
    toIso: (m) => iso(+m[3]!, monthIndex(m[2]!), +m[1]!),
  },
  { re: /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g, toIso: (m) => iso(+m[3]!, +m[1]!, +m[2]!) },
];

function monthIndex(name: string): number {
  return MONTHS.indexOf(name.slice(0, 3).toLowerCase()) + 1;
}

function iso(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1) return null; // e.g. Feb 30
  return date.toISOString().slice(0, 10);
}

/** Every full date (with a year) written in the text, as ISO strings. */
export function findDates(text: string): string[] {
  const found: string[] = [];
  for (const { re, toIso } of DATE_PATTERNS) {
    for (const m of text.matchAll(re)) {
      const value = toIso(m);
      if (value && !found.includes(value)) found.push(value);
    }
  }
  return found;
}

export function parseDate(text: string): string | null {
  return findDates(text)[0] ?? null;
}

export function formatIsoDate(isoDate: string, month: "long" | "short" = "long"): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).toLocaleDateString("en-US", {
    year: "numeric",
    month,
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatFactValue(value: { type: "date"; iso: string } | { type: "amount"; cents: number } | { type: "text"; text: string }): string {
  switch (value.type) {
    case "amount":
      return formatCents(value.cents);
    case "date":
      return formatIsoDate(value.iso);
    case "text":
      return value.text;
  }
}
