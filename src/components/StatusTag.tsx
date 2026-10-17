export type Status = "backed" | "your_word_only" | "conflict" | "gap" | "ai";

const TAGS: Record<Status, { className: string; text: string }> = {
  backed: { className: "tag ok", text: "✓ backed by" },
  your_word_only: { className: "tag warn", text: "⚠ your word only" },
  conflict: { className: "tag bad", text: "✕ conflict" },
  gap: { className: "tag warn", text: "◌ gap" },
  ai: { className: "tag neutral", text: "AI interpretation" },
};

/** Always icon + words, never color alone, so status survives print and color blindness. */
export function StatusTag({ status }: { status: Status }) {
  const tag = TAGS[status];
  return <span className={tag.className}>{tag.text}</span>;
}
