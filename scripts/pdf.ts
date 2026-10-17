// A minimal PDF writer: one Helvetica text line per input line, no dependencies.
// Used to make the demo invoice and test fixtures; not part of the app.

export function makePdf(pages: string[]): Buffer {
  const objects: string[] = [];
  const add = (body: string) => objects.push(body) - 1 + 1; // 1-based object number
  const catalog = add("");
  const pagesObj = add("");
  const font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const kids: number[] = [];
  for (const text of pages) {
    const content = text === "" ? "0.9 g 72 600 200 100 re f" : textStream(text);
    const stream = add(`<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`);
    kids.push(
      add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${stream} 0 R >>`),
    );
  }
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
  objects[pagesObj - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

/** Pass "" as a page to get a page with a drawn shape and no text (like a scan). */
function textStream(text: string): string {
  const lines = text.split("\n").map((line) => {
    if (/[^\x20-\x7e]/.test(line)) throw new Error(`Only printable ASCII is supported: ${line}`);
    return line ? `(${line.replace(/[\\()]/g, "\\$&")}) Tj T*` : "T*";
  });
  return `BT /F1 11 Tf 15 TL 60 740 Td ${lines.join(" ")} ET`;
}
