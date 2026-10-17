import { useState } from "react";
import type { Fact } from "../../shared/schemas.ts";

/** Shows where a fact comes from: filename, page, and the exact excerpt, one click away. */
export function SourceExcerpt({ fact, filename, label }: { fact: Fact; filename: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span>
      <button type="button" className="excerpt-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        {label ?? `${filename}, p. ${fact.page}`}
      </button>
      {/* Always rendered in print so the packet carries its proof on paper. */}
      <blockquote className="excerpt" hidden={!open}>
        <span className="src">
          {filename} · page {fact.page}
        </span>
        “{fact.excerpt}”
      </blockquote>
    </span>
  );
}
