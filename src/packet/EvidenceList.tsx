import type { Packet } from "../../shared/schemas.ts";

export function EvidenceList({ packet }: { packet: Packet }) {
  const text = (id: string) => packet.statements.find((s) => s.statement.id === id)?.statement.text ?? id;
  return (
    <section className="panel">
      <h2>Evidence list</h2>
      <p className="lede">Each document in your case and which of your statements it backs.</p>
      {packet.evidence.length === 0 && <p className="muted">No documents yet.</p>}
      <div className="stack">
        {packet.evidence.map((row) => (
          <div key={row.documentId} className="card">
            <div className="row">
              <span className="doc-name">{row.filename}</span>
              <span className="tag neutral">{row.kind}</span>
              <span className="small muted">
                {row.factCount} verified fact{row.factCount === 1 ? "" : "s"}
              </span>
            </div>
            {row.backs.length > 0 ? (
              <ul className="small" style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                {row.backs.map((id) => (
                  <li key={id}>{text(id)}</li>
                ))}
              </ul>
            ) : (
              <p className="small muted" style={{ margin: "8px 0 0" }}>
                Doesn't back any of your statements yet.
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
