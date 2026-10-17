// Browser-side photo handling. The saved case keeps only a small re-encoded preview
// (re-drawing on a canvas drops all embedded metadata, including GPS). The original
// file stays in memory for this page session, for "Open original" and Retry.

const MAX_PREVIEW_SIDE = 480;
const originals = new Map<string, File>();

export function keepOriginal(id: string, file: File) {
  originals.set(id, file);
}

export function originalFor(id: string): File | undefined {
  return originals.get(id);
}

export function forgetOriginal(id: string) {
  originals.delete(id);
}

/** A JPEG data: URL no larger than 480 px on a side, or "" if the browser can't draw the image. */
export async function makePreview(file: File): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_PREVIEW_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", 0.8);
  } catch {
    return "";
  }
}
