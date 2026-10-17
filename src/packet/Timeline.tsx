import { formatIsoDate } from "../../shared/normalize.ts";
import type { Fact, Packet, SourceDocument, TimelineEvent } from "../../shared/schemas.ts";
import { SourceExcerpt } from "../components/SourceExcerpt.tsx";

export function Timeline({ packet, factsById, documents }: { packet: Packet; factsById: Map<string, Fact>; documents: SourceDocument[] }) {
  const filename = (fact: Fact) => documents.find((d) => d.id === fact.documentId)?.filename ?? "document";
  const row = (event: TimelineEvent) => (
    <li key={event.id} className="event">
      <span className="event-date">{event.date ? formatIsoDate(event.date, "short") : "date unknown"}</span>
      <div>
        <div>{event.label}</div>
        {event.factIds.map((id) => {
          const fact = factsById.get(id);
          return fact ? (
            <div key={id} className="small">
              <SourceExcerpt fact={fact} filename={filename(fact)} />
            </div>
          ) : null;
        })}
      </div>
    </li>
  );

  return (
    <section className="panel">
      <h2>Timeline</h2>
      <p className="lede">Only dates written in your documents. Nothing here is estimated.</p>
      {packet.timeline.length === 0 && <p className="muted">No dated events found in your documents.</p>}
      <ol className="events">{packet.timeline.map(row)}</ol>
      {packet.undated.length > 0 && (
        <>
          <h3>Date unknown</h3>
          <p className="small muted">Events and payments your documents mention without a date.</p>
          <ol className="events">{packet.undated.map(row)}</ol>
        </>
      )}
    </section>
  );
}
