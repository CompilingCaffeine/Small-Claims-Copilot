import type { Fact, Packet, SourceDocument } from "../../shared/schemas.ts";
import { SourceExcerpt } from "../components/SourceExcerpt.tsx";
import { StatusTag } from "../components/StatusTag.tsx";

/** What the user said next to the document excerpt that disagrees with it. Never picks a side. */
export function KeyFlags({ packet, factsById, documents }: { packet: Packet; factsById: Map<string, Fact>; documents: SourceDocument[] }) {
  const filename = (fact: Fact) => documents.find((d) => d.id === fact.documentId)?.filename ?? "document";
  return (
    <section className="panel attention">
      <h2>Key flags</h2>
      <p className="lede">
        {packet.flags.length === 0
          ? "Nothing you said disagrees with your documents."
          : "Where your own documents disagree with what you said. Fix your account, or be ready to explain the document."}
      </p>
      <div className="stack">
        {packet.flags.map((flag) => (
          <div key={flag.id} className="card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <StatusTag status="mismatch" />
              {flag.basis === "checked" ? <span className="small muted">mismatch checked by code</span> : <StatusTag status="ai" />}
            </div>
            <div className="sides">
              <div className="side">
                <div className="label">You said</div>
                <div>“{flag.statement.quote ?? flag.statement.text}”</div>
              </div>
              <div className="side">
                <div className="label">Your documents</div>
                {flag.factIds.map((id) => {
                  const fact = factsById.get(id);
                  return fact ? (
                    <div key={id} className="small">
                      <SourceExcerpt fact={fact} filename={filename(fact)} />
                    </div>
                  ) : null;
                })}
              </div>
            </div>
            {flag.note && <p className="why">{flag.note}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
