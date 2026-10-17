import { useState } from "react";

type Props = {
  value: string; // what's shown now (edited or original)
  edited: boolean;
  onSave: (text: string) => void;
  onReset: () => void; // drops the edit, back to the generated text
  label: string; // names the thing being edited, for screen readers
  multiline?: boolean;
  emptyLabel?: string; // for optional fields like notes: the button shown when empty
};

/** Edit wording in place. Changes words only; it never changes whether something is backed. */
export function Editable({ value, edited, onSave, onReset, label, multiline, emptyLabel }: Props) {
  const [draft, setDraft] = useState<string | null>(null);

  if (draft !== null) {
    return (
      <div className="stack" style={{ gap: 8 }}>
        <textarea
          aria-label={label}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          style={{ minHeight: multiline ? 140 : 64 }}
          autoFocus
        />
        <div className="row">
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              onSave(draft.trim());
              setDraft(null);
            }}
          >
            Save
          </button>
          <button type="button" className="btn quiet" onClick={() => setDraft(null)}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (!value && emptyLabel) {
    return (
      <button type="button" className="btn quiet edit-link" onClick={() => setDraft("")}>
        {emptyLabel}
      </button>
    );
  }

  return (
    <div>
      <div style={{ whiteSpace: multiline ? "pre-wrap" : undefined }}>{value}</div>
      <div className="row edit-actions">
        <button type="button" className="btn quiet edit-link" onClick={() => setDraft(value)} aria-label={`Edit ${label}`}>
          Edit
        </button>
        {edited && (
          <>
            <span className="small muted">edited</span>
            <button type="button" className="btn quiet edit-link" onClick={onReset}>
              {emptyLabel ? "Remove" : "Undo edit"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
