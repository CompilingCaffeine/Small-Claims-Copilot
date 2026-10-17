import { useState } from "react";
import { MAX_DOCUMENTS, MAX_PASTE_CHARS } from "../../shared/limits.ts";
import { formatFactValue } from "../../shared/normalize.ts";
import type { CaseState, SourceDocument } from "../../shared/schemas.ts";
import { backingPrompts } from "../../shared/statements.ts";
import { SourceExcerpt } from "../components/SourceExcerpt.tsx";
import { cannotGenerateReason, extractDocument, type Update } from "../generate.ts";

type Props = {
  state: CaseState;
  update: Update;
  generating: boolean;
  onGenerate: () => void;
};

export function EvidenceStep({ state, update, generating, onGenerate }: Props) {
  const [pasteName, setPasteName] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function addPasted() {
    const text = pasteText.trim();
    if (!text) return;
    if (state.documents.length >= MAX_DOCUMENTS) {
      setMessage(`You can add up to ${MAX_DOCUMENTS} documents.`);
      return;
    }
    if (text.length > MAX_PASTE_CHARS) {
      setMessage("That text is too long to paste. Try a shorter excerpt of the document.");
      return;
    }
    const doc: SourceDocument = {
      id: newId(),
      filename: pasteName.trim() || `Pasted text ${state.documents.length + 1}`,
      kind: "pasted",
      pages: [text],
      status: "ready",
    };
    update((s) => ({ ...s, documents: [...s.documents, doc] }));
    setPasteName("");
    setPasteText("");
    setMessage(null);
  }

  function removeDocument(id: string) {
    update((s) => {
      const { [id]: _removed, ...facts } = s.facts;
      return { ...s, documents: s.documents.filter((d) => d.id !== id), facts };
    });
  }

  const prompts = backingPrompts(state.input);
  const blocked = cannotGenerateReason(state);

  return (
    <section className="panel">
      <h2>Add evidence</h2>
      <p className="lede">
        Add the documents behind your case: a contract, an invoice, a text thread. Their text is sent to an AI service
        (Claude) to pull out facts, so use only fictional documents for the demo.
      </p>

      <div className="card" style={{ background: "var(--bg)", marginBottom: 20 }}>
        <div className="small" style={{ fontWeight: 600, marginBottom: 6 }}>
          What would back what you said
        </div>
        <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
          {prompts.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>

      <div className="stack">
        <label className="field">
          Document name <span className="hint">e.g. contract.txt</span>
          <input type="text" value={pasteName} onChange={(e) => setPasteName(e.target.value)} />
        </label>
        <label className="field">
          Paste the document's text
          <textarea className="mono" value={pasteText} onChange={(e) => setPasteText(e.target.value)} />
        </label>
        <div className="row">
          <button type="button" className="btn" onClick={addPasted} disabled={!pasteText.trim()}>
            Add pasted document
          </button>
          {message && <span className="small muted">{message}</span>}
        </div>
      </div>

      <h3>Your documents ({state.documents.length})</h3>
      {state.documents.length === 0 && <p className="muted small">No documents yet.</p>}
      <div className="stack">
        {state.documents.map((doc) => (
          <DocumentCard
            key={doc.id}
            doc={doc}
            state={state}
            onRetry={() => extractDocument(doc, update)}
            onRemove={() => removeDocument(doc.id)}
          />
        ))}
      </div>

      <div className="row" style={{ marginTop: 24 }}>
        <button type="button" className="btn primary" onClick={onGenerate} disabled={generating || blocked !== null}>
          {generating ? "Generating…" : "Generate packet"}
        </button>
        {blocked && <span className="small muted">{blocked}</span>}
        {generating && <span className="small muted">Reading your documents and checking every quote…</span>}
      </div>
    </section>
  );
}

function DocumentCard({
  doc,
  state,
  onRetry,
  onRemove,
}: {
  doc: SourceDocument;
  state: CaseState;
  onRetry: () => void;
  onRemove: () => void;
}) {
  const extraction = state.facts[doc.id];
  const [showFacts, setShowFacts] = useState(false);
  return (
    <div className="card">
      <div className="doc-row">
        <span>
          <span className="doc-name">{doc.filename}</span>{" "}
          <span className="tag neutral">{doc.kind}</span>{" "}
          {!extraction && <span className="tag neutral">ready</span>}
          {extraction?.status === "pending" && <span className="tag neutral">reading…</span>}
          {extraction?.status === "done" && <span className="tag ok">✓ {extraction.facts.length} facts</span>}
          {extraction?.status === "failed" && <span className="tag bad">✕ failed</span>}
        </span>
        <span className="row">
          {extraction?.status === "done" && (
            <button type="button" className="btn quiet" onClick={() => setShowFacts(!showFacts)}>
              {showFacts ? "Hide facts" : "Show facts"}
            </button>
          )}
          {extraction?.status === "failed" && (
            <button type="button" className="btn" onClick={onRetry}>
              Retry
            </button>
          )}
          <button type="button" className="btn quiet" onClick={onRemove}>
            Remove
          </button>
        </span>
      </div>
      {extraction?.status === "failed" && <p className="small" style={{ color: "var(--bad-ink)" }}>{extraction.error}</p>}
      {extraction?.status === "done" && showFacts && (
        <div style={{ marginTop: 10 }}>
          {extraction.facts.map((fact) => (
            <div key={fact.id} className="fact">
              <div>{fact.originalWording}</div>
              <div className="small muted">
                <span className="mono">{fact.subject}</span> · {formatFactValue(fact.value)} ·{" "}
                <SourceExcerpt fact={fact} filename={doc.filename} />
              </div>
            </div>
          ))}
          {extraction.droppedCount > 0 && (
            <p className="small muted">
              {extraction.droppedCount} fact{extraction.droppedCount === 1 ? " was" : "s were"} dropped because the
              quoted words weren't found in the document.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function newId(): string {
  return crypto.randomUUID().slice(0, 8);
}
