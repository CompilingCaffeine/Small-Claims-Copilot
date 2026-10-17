export type Status = "backed" | "your_word_only" | "mismatch" | "differs" | "ai" | "ai_suggestion";

const TAGS: Record<Status, { className: string; text: string }> = {
  backed: { className: "tag ok", text: "✓ backed by" },
  your_word_only: { className: "tag warn", text: "⚠ your word only" },
  mismatch: { className: "tag bad", text: "✕ doesn't match" },
  differs: { className: "tag neutral", text: "≠ documents differ" },
  ai: { className: "tag neutral", text: "AI interpretation" },
  ai_suggestion: { className: "tag neutral", text: "AI suggestion" },
};

/** Always icon + words, never color alone, so status survives print and color blindness. */
export function StatusTag({ status }: { status: Status }) {
  const tag = TAGS[status];
  return <span className={tag.className}>{tag.text}</span>;
}
