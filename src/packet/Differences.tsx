import type { Conflict, Fact, Packet, SourceDocument } from "../../shared/schemas.ts";
import { SourceExcerpt } from "../components/SourceExcerpt.tsx";
import { StatusTag } from "../components/StatusTag.tsx";

/** Where documents disagree with each other. Kept quiet: the user usually knows already. */
export function Differences({ packet, factsById, documents }: { packet: Packet; factsById: Map<string, Fact>; documents: SourceDocument[] }) {
  const filename = (fact: Fact) => documents.find((d) => d.id === fact.documentId)?.filename ?? "document";
  return (
    <section className="panel">
      <h2>Differences between documents</h2>
      {packet.documentDifferences.length === 0 && <p className="lede">Your documents agree with each other.</p>}
      <div className="stack">
        {packet.documentDifferences.map((c) => (
          <div key={c.id} className="card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="row">
                <StatusTag status="differs" />
                <strong>{sentenceCase(c.subject)}</strong>
              </div>
              {c.basis === "checked" ? <span className="small muted">values checked by code</span> : <StatusTag status="ai" />}
            </div>
            <div className="sides">
              {groupByValue(c.sides).map(({ value, factIds }) => (
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
            {c.note && <p className="why">{c.note}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

/** Several documents can state the same value; show each distinct value once with all its sources. */
function groupByValue(sides: Conflict["sides"]) {
  const groups: { value: string; factIds: string[] }[] = [];
  for (const side of sides) {
    if (!side.factId) continue;
    const group = groups.find((g) => g.value === side.value);
    if (group) group.factIds.push(side.factId);
    else groups.push({ value: side.value, factIds: [side.factId] });
  }
  return groups;
}

function sentenceCase(text: string): string {
  const t = text.trim();
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}
