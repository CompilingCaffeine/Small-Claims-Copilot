import type { Fact, Packet, SourceDocument } from "../../shared/schemas.ts";
import { SourceExcerpt } from "../components/SourceExcerpt.tsx";
import { StatusTag } from "../components/StatusTag.tsx";

export function NeedsAttention({
  packet,
  factsById,
  documents,
}: {
  packet: Packet;
  factsById: Map<string, Fact>;
  documents: SourceDocument[];
}) {
  const { conflicts, gaps } = packet.needsAttention;
  const filename = (fact: Fact) => documents.find((d) => d.id === fact.documentId)?.filename ?? "document";
  const total = conflicts.length + gaps.length;

  return (
    <section className="panel attention">
      <h2>Needs attention</h2>
      <p className="lede">
        {total === 0
          ? "Nothing flagged. No conflicts between your documents and statements, and no must-resolve gaps."
          : "Resolve these before a hearing. Conflicts show both sides; this app never picks one."}
      </p>
      <div className="stack">
        {conflicts.map((c) => (
          <div key={c.id} className="card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="row">
                <StatusTag status="conflict" />
                <strong>{sentenceCase(c.subject)}</strong>
              </div>
              {c.basis === "checked" ? (
                <span className="small muted">values checked by code</span>
              ) : (
                <StatusTag status="ai" />
              )}
            </div>
            <div className="sides">
              {groupByValue(c.sides.filter((s) => s.factId)).map(({ value, factIds }) => (
                <div key={value} className="side">
                  <div className={factIds.some((id) => factsById.get(id)?.value.type === "text") ? "" : "value"}>{value}</div>
                  {factIds.map((id) => {
                    const fact = factsById.get(id);
                    return fact ? (
                      <div key={id} className="small">
                        <SourceExcerpt fact={fact} filename={filename(fact)} />
                      </div>
                    ) : null;
                  })}
                </div>
              ))}
            </div>
            {c.sides.some((s) => s.statementId) && (
              <div className="small" style={{ marginTop: 8 }}>
                <span className="muted">You said: </span>
                {c.sides
                  .filter((s) => s.statementId)
                  .map((s) => `“${s.value}”`)
                  .join(" ")}
              </div>
            )}
            {c.note && <p className="why">{c.note}</p>}
          </div>
        ))}
        {gaps.map((g) => (
          <div key={g.id} className="card">
            <div className="row">
              <StatusTag status="gap" />
              <strong>{g.title}</strong>
            </div>
            <p className="why">{g.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Several documents can state the same value; show each distinct value once with all its sources. */
function groupByValue(sides: Packet["needsAttention"]["conflicts"][number]["sides"]) {
  const groups: { value: string; factIds: string[] }[] = [];
  for (const side of sides) {
    const group = groups.find((g) => g.value === side.value);
    if (group) group.factIds.push(side.factId!);
    else groups.push({ value: side.value, factIds: [side.factId!] });
  }
  return groups;
}

function sentenceCase(text: string): string {
  const t = text.trim();
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}
