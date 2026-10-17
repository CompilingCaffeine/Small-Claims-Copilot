import { useRef, useState, type DragEvent } from "react";
import { ACCEPTED_EXTENSIONS, MAX_DOCUMENTS, MAX_FILE_BYTES, MAX_PASTE_CHARS } from "../../shared/limits.ts";
import { formatFactValue } from "../../shared/normalize.ts";
import type { CaseState, PhotoEvidence, SourceDocument } from "../../shared/schemas.ts";
import { backingPrompts } from "../../shared/statements.ts";
import { describePhoto, uploadDocument } from "../api.ts";
import { PhotoCard } from "../components/PhotoCard.tsx";
import { SourceExcerpt } from "../components/SourceExcerpt.tsx";
import { cannotGenerateReason, extractDocument, type Update } from "../generate.ts";
import { forgetOriginal, keepOriginal, makePreview, originalFor } from "../photos.ts";

type Props = {
  state: CaseState;
  update: Update;
  generating: boolean;
  onGenerate: () => void;
  /** A recorded description for a known photo (the demo's), so describing it costs nothing. */
  savedPhotoDescription?: (sha256: string) => string | null;
};

/** A file on its way in, or one that was turned away. Not saved: it never became a document. */
type Upload = { key: string; file: File; status: "uploading" | "failed"; error?: string };

export function EvidenceStep({ state, update, generating, onGenerate, savedPhotoDescription }: Props) {
  const [pasteName, setPasteName] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragging, setDragging] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  const setUpload = (key: string, change: Partial<Upload> | null) =>
    setUploads((all) => (change ? all.map((u) => (u.key === key ? { ...u, ...change } : u)) : all.filter((u) => u.key !== key)));

  function addFiles(files: File[]) {
    // Count slots here: several files can be dropped before any finishes uploading.
    let slots =
      MAX_DOCUMENTS - state.documents.length - state.photos.length - uploads.filter((u) => u.status === "uploading").length;
    const added: Upload[] = files.map((file) => {
      const key = newId();
      const error = checkFile(file) ?? (slots-- <= 0 ? `You can add up to ${MAX_DOCUMENTS} documents.` : undefined);
      return error ? { key, file, status: "failed", error } : { key, file, status: "uploading" };
    });
    setUploads((all) => [...all, ...added]);
    for (const u of added) if (u.status === "uploading") void send(u.key, u.file);
  }

  async function send(key: string, file: File) {
    setUpload(key, { status: "uploading", error: undefined });
    try {
      const uploaded = await uploadDocument(file);
      if (uploaded.kind === "image") {
        const photo: PhotoEvidence = {
          id: newId(),
          filename: uploaded.filename,
          metadata: { origin: "technical_metadata", ...uploaded.image },
          thumbnail: await makePreview(file),
          descriptionStatus: "pending",
        };
        keepOriginal(photo.id, file);
        update((s) => ({ ...s, photos: [...s.photos, photo] }));
        setUpload(key, null);
        void describe(photo, file);
      } else {
        const { kind, filename, pages } = uploaded;
        update((s) => ({ ...s, documents: [...s.documents, { id: newId(), status: "ready", kind, filename, pages }] }));
        setUpload(key, null);
      }
    } catch (err) {
      setUpload(key, { status: "failed", error: err instanceof Error ? err.message : "Upload failed." });
    }
  }

  /** A failed description leaves the photo and its metadata in place, with Retry. */
  async function describe(photo: PhotoEvidence, file: File) {
    const setPhoto = (change: Partial<PhotoEvidence>) =>
      update((s) => ({ ...s, photos: s.photos.map((p) => (p.id === photo.id ? { ...p, ...change } : p)) }));
    setPhoto({ descriptionStatus: "pending", descriptionError: undefined });
    const saved = savedPhotoDescription?.(photo.metadata.sha256);
    if (saved) {
      setPhoto({ descriptionStatus: "done", description: { origin: "ai_visual_description", text: saved } });
      return;
    }
    try {
      const result = await describePhoto(file);
      if (result.sha256 !== photo.metadata.sha256) throw new Error("The file changed after it was added. Remove it and add it again.");
      setPhoto({ descriptionStatus: "done", description: { origin: "ai_visual_description", text: result.description } });
    } catch (err) {
      setPhoto({ descriptionStatus: "failed", descriptionError: err instanceof Error ? err.message : "The description failed." });
    }
  }

  function removePhoto(id: string) {
    forgetOriginal(id);
    update((s) => ({ ...s, photos: s.photos.filter((p) => p.id !== id) }));
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    addFiles([...e.dataTransfer.files]);
  }

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
        Add the documents behind your case: a contract, an invoice, a text thread. Upload .txt or .pdf files, or paste
        text; you can also add .jpg or .png photos (experimental). Up to {MAX_DOCUMENTS} files, 2 MB each. Document text
        and photos (with their embedded metadata removed) are sent to an AI service (Claude), so use only fictional
        material for the demo.
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

      <div
        className={`dropzone${dragging ? " over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <div>Drop .txt, .pdf, .jpg, or .png files here</div>
        <button type="button" className="btn" onClick={() => picker.current?.click()}>
          Choose files
        </button>
        <input
          ref={picker}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          multiple
          hidden
          onChange={(e) => {
            addFiles([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
        <div className="small muted">Scanned PDFs (pictures of pages) can't be read; paste their text instead.</div>
      </div>

      <details className="paste">
        <summary>Or paste a document's text</summary>
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
      </details>

      <h3>Your documents ({state.documents.length + state.photos.length})</h3>
      {state.documents.length === 0 && state.photos.length === 0 && uploads.length === 0 && (
        <p className="muted small">No documents yet.</p>
      )}
      <div className="stack">
        {uploads.map((u) => (
          <div key={u.key} className="card">
            <div className="doc-row">
              <span>
                <span className="doc-name">{u.file.name}</span>{" "}
                {u.status === "uploading" ? (
                  <span className="tag neutral">uploading…</span>
                ) : (
                  <span className="tag bad">✕ not added</span>
                )}
              </span>
              {u.status === "failed" && (
                <span className="row">
                  {!checkFile(u.file) && (
                    <button type="button" className="btn" onClick={() => void send(u.key, u.file)}>
                      Retry
                    </button>
                  )}
                  <button type="button" className="btn quiet" onClick={() => setUpload(u.key, null)}>
                    Dismiss
                  </button>
                </span>
              )}
            </div>
            {u.error && <p className="small" style={{ color: "var(--bad-ink)" }}>{u.error}</p>}
          </div>
        ))}
        {state.documents.map((doc) => (
          <DocumentCard
            key={doc.id}
            doc={doc}
            state={state}
            onRetry={() => extractDocument(doc, update)}
            onRemove={() => removeDocument(doc.id)}
          />
        ))}
        {state.photos.map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            onRemove={() => removePhoto(photo.id)}
            onRetry={() => {
              const file = originalFor(photo.id);
              if (file) void describe(photo, file);
            }}
          />
        ))}
      </div>

      <div className="row" style={{ marginTop: 24 }}>
        <button
          type="button"
          className="btn primary"
          onClick={onGenerate}
          disabled={generating || blocked !== null || uploads.some((u) => u.status === "uploading")}
        >
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

/** The same checks the server makes, so obvious problems never leave the browser. */
function checkFile(file: File): string | null {
  const ext = file.name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? "";
  if (!(ACCEPTED_EXTENSIONS as readonly string[]).includes(ext))
    return `${file.name}: only .txt, .pdf, .jpg, and .png files are supported.`;
  if (file.size > MAX_FILE_BYTES) return `${file.name} is larger than 2 MB.`;
  if (file.size === 0) return `${file.name} is empty.`;
  return null;
}

function newId(): string {
  return crypto.randomUUID().slice(0, 8);
}
