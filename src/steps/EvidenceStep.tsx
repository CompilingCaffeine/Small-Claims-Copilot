import { useState } from "react";
import { MAX_DOCUMENTS, MAX_PASTE_CHARS } from "../../shared/limits.ts";
import { formatCents, formatIsoDate } from "../../shared/normalize.ts";
import type { CaseState, Fact, SourceDocument } from "../../shared/schemas.ts";
import { extractFacts } from "../api.ts";
import { SourceExcerpt } from "../components/SourceExcerpt.tsx";

type Props = {
  state: CaseState;
  update: (fn: (s: CaseState) => CaseState) => void;
};

export function EvidenceStep({ state, update }: Props) {
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

  async function extract(doc: SourceDocument) {
    update((s) => ({ ...s, facts: { ...s.facts, [doc.id]: { status: "pending", facts: [], droppedCount: 0 } } }));
    try {
      const result = await extractFacts(doc);
      update((s) => ({ ...s, facts: { ...s.facts, [doc.id]: { status: "done", ...result } } }));
    } catch (err) {
      const error = err instanceof Error ? err.message : "Extraction failed.";
      update((s) => ({ ...s, facts: { ...s.facts, [doc.id]: { status: "failed", facts: [], droppedCount: 0, error } } }));
    }
  }

  return (
    <section className="panel">
      <h2>Add evidence</h2>
      <p className="lede">
        Add the documents behind your case: a contract, an invoice, a text thread. Their text is sent to an AI service
        (Claude) to pull out facts, so use only fictional documents for the demo.
      </p>

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
            onExtract={() => extract(doc)}
            onRemove={() => removeDocument(doc.id)}
          />
        ))}
      </div>
    </section>
  );
}

function DocumentCard({
  doc,
  state,
  onExtract,
  onRemove,
}: {
  doc: SourceDocument;
  state: CaseState;
  onExtract: () => void;
  onRemove: () => void;
}) {
  const extraction = state.facts[doc.id];
  return (
    <div className="card">
      <div className="doc-row">
        <span>
          <span className="doc-name">{doc.filename}</span>{" "}
          <span className="tag neutral">{doc.kind}</span>{" "}
          {extraction?.status === "pending" && <span className="tag neutral">Reading…</span>}
          {extraction?.status === "done" && <span className="tag ok">✓ {extraction.facts.length} facts</span>}
          {extraction?.status === "failed" && <span className="tag bad">✕ failed</span>}
        </span>
        <span className="row">
          <button type="button" className="btn" onClick={onExtract} disabled={extraction?.status === "pending"}>
            {extraction?.status === "done" ? "Extract again" : extraction?.status === "failed" ? "Retry" : "Extract facts"}
          </button>
          <button type="button" className="btn quiet" onClick={onRemove}>
            Remove
          </button>
        </span>
      </div>
      {extraction?.status === "failed" && <p className="small" style={{ color: "var(--bad-ink)" }}>{extraction.error}</p>}
      {extraction?.status === "done" && (
        <div style={{ marginTop: 10 }}>
          {extraction.facts.map((fact) => (
            <div key={fact.id} className="fact">
              <div>{fact.originalWording}</div>
              <div className="small muted">
                <span className="mono">{fact.subject}</span> · {formatValue(fact)} ·{" "}
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

export function formatValue(fact: Fact): string {
  switch (fact.value.type) {
    case "amount":
      return formatCents(fact.value.cents);
    case "date":
      return formatIsoDate(fact.value.iso);
    case "text":
      return fact.value.text;
  }
}

function newId(): string {
  return crypto.randomUUID().slice(0, 8);
}
