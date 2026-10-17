import { useMemo } from "react";
import { formatCents } from "../../shared/normalize.ts";
import { assemblePacket, verifiedFacts } from "../../shared/packet.ts";
import type { CaseState } from "../../shared/schemas.ts";
import type { Update } from "../generate.ts";
import { Details } from "../packet/Details.tsx";
import { Differences } from "../packet/Differences.tsx";
import { EvidenceList } from "../packet/EvidenceList.tsx";
import { KeyFlags } from "../packet/KeyFlags.tsx";
import { NextSteps } from "../packet/NextSteps.tsx";
import { Statements } from "../packet/Statements.tsx";
import { Summary } from "../packet/Summary.tsx";
import { Timeline } from "../packet/Timeline.tsx";

/** Saves an edit by its stable key; null removes it. */
export type SetEdit = (key: string, text: string | null) => void;

export function ReviewStep({ state, update }: { state: CaseState; update: Update }) {
  const facts = useMemo(() => verifiedFacts(state), [state]);
  const packet = useMemo(() => (state.analysis ? assemblePacket(state, state.analysis) : null), [state]);
  const factsById = useMemo(() => new Map(facts.map((f) => [f.id, f])), [facts]);

  const setEdit: SetEdit = (key, text) =>
    update((s) => {
      const { [key]: _old, ...rest } = s.edits;
      return { ...s, edits: text === null ? rest : { ...rest, [key]: text } };
    });

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
  const detailsSummary = `${backed} of ${packet.statements.length} statements backed · evidence list · ${diffs} difference${diffs === 1 ? "" : "s"} between documents · timeline`;

  return (
    <div>
      <div className="row no-print" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        {state.generatedAt && (
          <p className="small muted" style={{ margin: 0, flex: 1, minWidth: 260 }}>
            Generated {new Date(state.generatedAt).toLocaleString()}. Changed something? Generate again from Add evidence;
            your edits are kept.
            {packet.droppedFactCount > 0 &&
              ` ${packet.droppedFactCount} extracted fact${packet.droppedFactCount === 1 ? " was" : "s were"} discarded because the quoted words weren't in the document.`}
          </p>
        )}
        <button type="button" className="btn" onClick={() => window.print()}>
          Print packet
        </button>
      </div>
      <header className="print-only print-header">
        <h1>Case packet</h1>
        <p>
          Amount claimed: {packet.amountClaimedCents === null ? "unknown" : formatCents(packet.amountClaimedCents)}
          {state.generatedAt && ` · Generated ${new Date(state.generatedAt).toLocaleDateString()}`} · Small Claims Copilot
        </p>
        <p>
          ✓ backed by = a document says so (exact words quoted), not that it's proven true. ⚠ your word only = no document
          says so yet.
        </p>
      </header>
      <Summary packet={packet} setEdit={setEdit} />
      <KeyFlags packet={packet} factsById={factsById} documents={state.documents} />
      <NextSteps packet={packet} setEdit={setEdit} />
      <Details summary={detailsSummary}>
        <Statements packet={packet} factsById={factsById} state={state} setEdit={setEdit} />
        <EvidenceList packet={packet} />
        <Differences packet={packet} factsById={factsById} documents={state.documents} />
        <Timeline packet={packet} factsById={factsById} documents={state.documents} />
      </Details>
    </div>
  );
}
