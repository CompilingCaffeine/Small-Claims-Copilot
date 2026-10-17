import { useMemo } from "react";
import { assemblePacket, verifiedFacts } from "../../shared/packet.ts";
import type { CaseState } from "../../shared/schemas.ts";
import { Details } from "../packet/Details.tsx";
import { Differences } from "../packet/Differences.tsx";
import { KeyFlags } from "../packet/KeyFlags.tsx";
import { NextSteps } from "../packet/NextSteps.tsx";
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

  const backed = packet.statements.filter((s) => s.status === "backed").length;
  const diffs = packet.documentDifferences.length;
  const detailsSummary = `${backed} of ${packet.statements.length} statements backed · ${diffs} difference${diffs === 1 ? "" : "s"} between documents · summary`;

  return (
    <div>
      {state.generatedAt && (
        <p className="small muted no-print">
          Generated {new Date(state.generatedAt).toLocaleString()}. Changed something? Generate again from Add evidence.
          {packet.droppedFactCount > 0 &&
            ` ${packet.droppedFactCount} extracted fact${packet.droppedFactCount === 1 ? " was" : "s were"} discarded because the quoted words weren't in the document.`}
        </p>
      )}
      <KeyFlags packet={packet} factsById={factsById} documents={state.documents} />
      <NextSteps packet={packet} />
      <Details summary={detailsSummary}>
        <Statements packet={packet} factsById={factsById} state={state} />
        <Differences packet={packet} factsById={factsById} documents={state.documents} />
        <Summary packet={packet} />
      </Details>
    </div>
  );
}
