import type { Packet } from "../../shared/schemas.ts";
import { PhotoCard } from "../components/PhotoCard.tsx";

export function Photos({ packet }: { packet: Packet }) {
  if (packet.photos.length === 0) return null;
  return (
    <section className="panel">
      <h2>Photo evidence</h2>
      <p className="lede">
        Photos are kept apart from your documents. A photo never makes a statement ✓ backed: only quoted document text can.
        Technical metadata is read from the file; the description is the AI's reading of the picture.
      </p>
      <div className="stack">
        {packet.photos.map((photo) => (
          <PhotoCard key={photo.id} photo={photo} />
        ))}
      </div>
    </section>
  );
}
