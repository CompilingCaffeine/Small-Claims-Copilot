import { EDIT_KEYS } from "../../shared/edits.ts";
import type { Packet } from "../../shared/schemas.ts";
import { StatusTag } from "../components/StatusTag.tsx";
import type { SetEdit } from "../steps/ReviewStep.tsx";
import { Editable } from "./Editable.tsx";

export function Summary({ packet, setEdit }: { packet: Packet; setEdit: SetEdit }) {
  return (
    <section className="panel">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2>Case summary</h2>
        <StatusTag status="ai" />
      </div>
      <p className="small muted">Written by AI from your statements and backed facts. Review and edit before relying on it.</p>
      <Editable
        label="case summary"
        multiline
        value={packet.summary.text}
        edited={packet.summary.edited}
        onSave={(text) => setEdit(EDIT_KEYS.summary, text)}
        onReset={() => setEdit(EDIT_KEYS.summary, null)}
      />
    </section>
  );
}
