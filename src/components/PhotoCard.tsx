import { useEffect, useState } from "react";
import { formatIsoDate } from "../../shared/normalize.ts";
import type { PhotoEvidence } from "../../shared/schemas.ts";
import { originalFor } from "../photos.ts";

type Props = {
  photo: PhotoEvidence;
  onRetry?: () => void;
  onRemove?: () => void;
};

/**
 * One photo, with what code read from the file and what the AI said about it kept
 * visibly apart. Used in Add evidence (with Retry/Remove) and in the packet.
 */
export function PhotoCard({ photo, onRetry, onRemove }: Props) {
  const { metadata: m } = photo;
  const original = originalFor(photo.id);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!original) return;
    const url = URL.createObjectURL(original);
    setOriginalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [original]);
  return (
    <div className="card photo-card">
      <div className="photo-thumb">
        {photo.thumbnail ? <img src={photo.thumbnail} alt={`Preview of ${photo.filename}`} /> : <span className="small muted">No preview</span>}
      </div>
      <div className="photo-body">
        <div className="doc-row">
          <span>
            <span className="doc-name">{photo.filename}</span> <span className="tag neutral">photo</span>
          </span>
          {onRemove && (
            <button type="button" className="btn quiet" onClick={onRemove}>
              Remove
            </button>
          )}
        </div>

        <div className="photo-section">
          <div className="photo-label">Technical metadata · read from the file</div>
          <div className="small">
            {m.mimeType === "image/png" ? "PNG" : "JPEG"} · {m.width} × {m.height} px · {formatBytes(m.byteSize)}
          </div>
          <div className="small">
            Capture time in file:{" "}
            {m.capturedAt ? (
              <>
                {formatCapture(m.capturedAt)} <span className="muted">(camera clock; can be missing or changed)</span>
              </>
            ) : (
              <span className="muted">none</span>
            )}
          </div>
          <div className="small">
            SHA-256: <span className="mono hash">{m.sha256}</span>
          </div>
          <div className="small muted">
            The hash identifies this exact file. It doesn't show who took the photo, when, or where. Location data is never
            read.
          </div>
        </div>

        <div className="photo-section">
          <div className="photo-label ai">AI visual description — review before using</div>
          {photo.descriptionStatus === "pending" && <div className="small muted">Describing…</div>}
          {photo.descriptionStatus === "done" && photo.description && <div>{photo.description.text}</div>}
          {photo.descriptionStatus === "failed" && (
            <div className="row">
              <span className="small" style={{ color: "var(--bad-ink)" }}>
                {photo.descriptionError ?? "The description failed."}
              </span>
              {onRetry && original && (
                <button type="button" className="btn" onClick={onRetry}>
                  Retry
                </button>
              )}
            </div>
          )}
        </div>

        {original && originalUrl && (
          <a className="small no-print" href={originalUrl} target="_blank" rel="noreferrer">
            Open original
          </a>
        )}
      </div>
    </div>
  );
}

function formatBytes(n: number): string {
  return n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function formatCapture(iso: string): string {
  const time = iso.slice(11, 16);
  const [h, min] = time.split(":").map(Number);
  return `${formatIsoDate(iso.slice(0, 10))}, ${((h! + 11) % 12) + 1}:${String(min).padStart(2, "0")} ${h! < 12 ? "AM" : "PM"}`;
}
