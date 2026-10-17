import { useState, type ReactNode } from "react";

/** Everything below the flags and next steps. Collapsed on screen, always expanded in print. */
export function Details({ summary, children }: { summary: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="details">
      <button type="button" className="details-toggle no-print" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span aria-hidden="true">{open ? "▾" : "▸"}</span> Packet details <span className="muted small">{summary}</span>
      </button>
      <div className="details-body" hidden={!open}>
        {children}
      </div>
    </section>
  );
}
