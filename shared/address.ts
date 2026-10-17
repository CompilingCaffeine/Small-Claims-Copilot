// Recognizes text that contains a postal address, so a "you said you don't know
// where they are" flag can be confirmed by code rather than taken from the AI.

const SUFFIX =
  "St|Street|Ave|Avenue|Blvd|Boulevard|Rd|Road|Dr|Drive|Way|Ln|Lane|Ct|Court|Pl|Place|Pkwy|Parkway|Hwy|Highway|Cir|Circle|Ter|Terrace|Sq|Square";
const STREET = new RegExp(`\\b\\d{1,6}\\s+(?:[A-Za-z0-9.'-]+\\s+){0,4}(?:${SUFFIX})\\b`, "i");
const STATE_ZIP = /\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/;
const PO_BOX = /\bP\.?\s?O\.?\s+Box\s+\d+/i;

export function looksLikeAddress(text: string): boolean {
  return STREET.test(text) || STATE_ZIP.test(text) || PO_BOX.test(text);
}
