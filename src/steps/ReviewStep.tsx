import { useMemo } from "react";
import { assemblePacket, verifiedFacts } from "../../shared/packet.ts";
import type { CaseState } from "../../shared/schemas.ts";
import { Statements } from "../packet/Statements.tsx";
import { Summary } from "../packet/Summary.tsx";

export function ReviewStep({ state }: { state: CaseState }) {
  const facts = useMemo(() => verifiedFacts(state), [state]);
  const packet = useMemo(() => (state.analysis ? assemblePacket(state, state.analysis) : null), [state]);
  const factsById = useMemo(() => new Map(facts.map((f) => [f.id, f])), [facts]);

  if (!packet) {
    return (
      <section className="panel">
        <h2>Review packet</h2>
        <p className="lede">No packet yet. Describe your dispute, add documents, then click Generate packet.</p>
      </section>
    );
  }

  return (
    <div>
      {state.generatedAt && (
        <p className="small muted no-print">
          Generated {new Date(state.generatedAt).toLocaleString()}. Changed something? Generate again from Add evidence.
          {packet.droppedFactCount > 0 &&
            ` ${packet.droppedFactCount} extracted fact${packet.droppedFactCount === 1 ? " was" : "s were"} discarded because the quoted words weren't in the document.`}
        </p>
      )}
      <Statements packet={packet} factsById={factsById} state={state} />
      <Summary packet={packet} />
    </div>
  );
}
