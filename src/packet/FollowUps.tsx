import { formatIsoDate } from "../../shared/normalize.ts";
import type { Packet } from "../../shared/schemas.ts";
import { StatusTag } from "../components/StatusTag.tsx";

export function FollowUps({ packet }: { packet: Packet }) {
  return (
    <section className="panel">
      <h2>Follow-up questions</h2>
      <p className="lede">Answering these, or adding the document they ask about, makes your packet stronger. Then generate again.</p>
      {packet.followUps.length === 0 && <p className="muted">No follow-up questions.</p>}
      <div className="stack">
        {packet.followUps.map((f) => (
          <div key={f.id} className="card">
            <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <strong style={{ flex: 1, minWidth: 240, fontWeight: 500 }}>{f.question}</strong>
              {f.origin === "ai" && <StatusTag status="ai" />}
            </div>
            <p className="why">
              <span style={{ fontWeight: 500 }}>Why it matters:</span> {f.whyItMatters}
            </p>
            {f.link && (
              <div className="official">
                Official info:{" "}
                <a href={f.link.url} target="_blank" rel="noreferrer">
                  {f.link.title}
                </a>{" "}
                <span className="muted">· last checked {formatIsoDate(f.link.lastChecked)}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
