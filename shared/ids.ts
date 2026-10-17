/** Short stable ID from content, so the same item gets the same ID after regenerating. */
export function contentId(prefix: string, text: string): string {
  let h = 5381;
  for (const ch of text.trim().toLowerCase()) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0;
  return `${prefix}-${h.toString(36)}`;
}
