import { formatIsoDate } from "../../shared/normalize.ts";
import type { Packet } from "../../shared/schemas.ts";
import { StatusTag } from "../components/StatusTag.tsx";

export function NextSteps({ packet }: { packet: Packet }) {
  return (
    <section className="panel">
      <h2>Next steps</h2>
      <p className="lede">In order. When you've done one, update your answers or documents and generate again.</p>
      {packet.nextSteps.length === 0 && <p className="muted">Nothing left to do right now.</p>}
      <ol className="steps">
        {packet.nextSteps.map((s) => (
          <li key={s.id} className="card">
            <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <strong style={{ flex: 1, minWidth: 240, fontWeight: 500 }}>{s.action}</strong>
              {s.origin === "ai" && <StatusTag status="ai_suggestion" />}
            </div>
            <p className="why">
              {s.whyItMatters}
              {s.link && (
                <>
                  {" "}
                  <a className="official" href={s.link.url} target="_blank" rel="noreferrer" title={s.link.title}>
                    Additional info
                  </a>
                  <span className="muted small"> · checked {formatIsoDate(s.link.lastChecked, "short")}</span>
                </>
              )}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
