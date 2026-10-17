import type { Packet } from "../../shared/schemas.ts";
import { StatusTag } from "../components/StatusTag.tsx";

export function Summary({ packet }: { packet: Packet }) {
  return (
    <section className="panel">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2>Case summary</h2>
        <StatusTag status="ai" />
      </div>
      <p className="small muted">Written by AI from your statements and backed facts. Review and edit before relying on it.</p>
      <p style={{ whiteSpace: "pre-wrap" }}>{packet.summary.text}</p>
    </section>
  );
}
