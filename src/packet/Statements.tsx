import type { CaseState, Fact, Packet } from "../../shared/schemas.ts";
import { SourceExcerpt } from "../components/SourceExcerpt.tsx";
import { StatusTag } from "../components/StatusTag.tsx";

export function Statements({ packet, factsById, state }: { packet: Packet; factsById: Map<string, Fact>; state: CaseState }) {
  const filename = (fact: Fact) => state.documents.find((d) => d.id === fact.documentId)?.filename ?? "removed document";
  const backed = packet.statements.filter((s) => s.status === "backed").length;

  return (
    <section className="panel">
      <h2>Your statements</h2>
      <p className="lede">
        {backed} of {packet.statements.length} backed by a document. "Backed by" means a document says so, not that it's
        proven true. Click a source to see the exact words.
      </p>
      {packet.statements.length === 0 && <p className="muted">No statements yet. Add a description or answers in Describe.</p>}
      <div className="stack">
        {packet.statements.map(({ statement, status, factIds, contradictingFactIds }) => (
          <div key={statement.id} className="card">
            <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div>{statement.text}</div>
                <div className="small muted">{statement.origin === "answer" ? "Your answer" : "From your description"}</div>
              </div>
              <StatusTag status={status} />
            </div>
            {factIds.length > 0 && (
              <div className="small" style={{ marginTop: 8 }}>
                {factIds.map((id) => {
                  const fact = factsById.get(id)!;
                  return (
                    <div key={id}>
                      <SourceExcerpt fact={fact} filename={filename(fact)} />
                    </div>
                  );
                })}
              </div>
            )}
            {contradictingFactIds.length > 0 && (
              <div className="small" style={{ marginTop: 8 }}>
                <StatusTag status="mismatch" /> <span className="muted">a document says otherwise:</span>
                {contradictingFactIds.map((id) => {
                  const fact = factsById.get(id)!;
                  return (
                    <div key={id}>
                      <SourceExcerpt fact={fact} filename={filename(fact)} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
