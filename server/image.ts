// Reads the few technical facts we show about a photo (type, size, pixel
// dimensions, SHA-256, and the camera's capture time if the file has one) straight
// from the file's headers, without decoding pixels. It deliberately never reads the
// GPS section, and stripMetadata() removes all embedded metadata (EXIF, XMP, text
// chunks) before a photo is sent anywhere.
import { createHash } from "node:crypto";

export type ImageType = "image/jpeg" | "image/png";

export type ImageInfo = {
  mimeType: ImageType;
  width: number;
  height: number;
  byteSize: number;
  sha256: string;
  capturedAt?: string; // "YYYY-MM-DDTHH:MM:SS", camera clock, time zone unknown
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** The image type from the file's first bytes, never from its name. */
export function sniffImageType(data: Buffer): ImageType | null {
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "image/jpeg";
  if (data.length >= 8 && data.subarray(0, 8).equals(PNG_SIGNATURE)) return "image/png";
  return null;
}

/** Null when the file isn't a well-formed JPEG or PNG. */
export function readImageInfo(data: Buffer): ImageInfo | null {
  const mimeType = sniffImageType(data);
  const parsed = mimeType === "image/jpeg" ? readJpeg(data) : mimeType === "image/png" ? readPng(data) : null;
  if (!mimeType || !parsed || parsed.width < 1 || parsed.height < 1) return null;
  return {
    mimeType,
    width: parsed.width,
    height: parsed.height,
    byteSize: data.length,
    sha256: createHash("sha256").update(data).digest("hex"),
    ...(parsed.capturedAt ? { capturedAt: parsed.capturedAt } : {}),
  };
}

type Parsed = { width: number; height: number; capturedAt?: string };

// --- JPEG -------------------------------------------------------------------

type Segment = { marker: number; start: number; end: number; dataStart: number };

/** The segments before the image data, or null if the structure is broken. */
function jpegSegments(data: Buffer): { segments: Segment[]; scanStart: number } | null {
  const segments: Segment[] = [];
  let i = 2;
  while (i + 4 <= data.length) {
    if (data[i] !== 0xff) return null;
    const marker = data[i + 1]!;
    if (marker === 0xff) {
      i++; // fill byte
      continue;
    }
    if (marker === 0xd9) return null; // EOI before any image data
    const length = data.readUInt16BE(i + 2);
    const end = i + 2 + length;
    if (length < 2 || end > data.length) return null;
    if (marker === 0xda) return { segments, scanStart: i }; // start of scan: headers end here
    segments.push({ marker, start: i, end, dataStart: i + 4 });
    i = end;
  }
  return null;
}

const SOF_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

function readJpeg(data: Buffer): Parsed | null {
  const parsed = jpegSegments(data);
  if (!parsed) return null;
  let size: { width: number; height: number } | null = null;
  let capturedAt: string | undefined;
  for (const s of parsed.segments) {
    if (SOF_MARKERS.has(s.marker) && s.end - s.dataStart >= 5) {
      size = { height: data.readUInt16BE(s.dataStart + 1), width: data.readUInt16BE(s.dataStart + 3) };
    }
    if (s.marker === 0xe1 && data.subarray(s.dataStart, s.dataStart + 6).toString("latin1") === "Exif\0\0") {
      capturedAt ??= exifCaptureTime(data.subarray(s.dataStart + 6, s.end));
    }
  }
  return size ? { ...size, ...(capturedAt ? { capturedAt } : {}) } : null;
}

// APP0 (JFIF), APP2 (ICC color profile), and APP14 (Adobe color transform) affect how
// pixels look. Every other APPn (EXIF and XMP live in APP1) and comments are dropped.
const KEEP_APP_MARKERS = new Set([0xe0, 0xe2, 0xee]);

// --- PNG --------------------------------------------------------------------

type Chunk = { type: string; start: number; end: number; dataStart: number; length: number };

function pngChunks(data: Buffer): Chunk[] | null {
  const chunks: Chunk[] = [];
  let i = 8;
  while (i + 12 <= data.length) {
    const length = data.readUInt32BE(i);
    const type = data.subarray(i + 4, i + 8).toString("latin1");
    const end = i + 12 + length;
    if (end > data.length) return null;
    chunks.push({ type, start: i, end, dataStart: i + 8, length });
    if (type === "IEND") return chunks;
    i = end;
  }
  return null; // no IEND: truncated
}

function readPng(data: Buffer): Parsed | null {
  const chunks = pngChunks(data);
  const ihdr = chunks?.[0];
  if (!chunks || ihdr?.type !== "IHDR" || ihdr.length < 8) return null;
  const exif = chunks.find((c) => c.type === "eXIf");
  const capturedAt = exif ? exifCaptureTime(data.subarray(exif.dataStart, exif.dataStart + exif.length)) : undefined;
  return {
    width: data.readUInt32BE(ihdr.dataStart),
    height: data.readUInt32BE(ihdr.dataStart + 4),
    ...(capturedAt ? { capturedAt } : {}),
  };
}

const PNG_METADATA_CHUNKS = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]);

// --- EXIF -------------------------------------------------------------------

const EXIF_IFD_POINTER = 0x8769;
const DATE_TIME_ORIGINAL = 0x9003;

/**
 * DateTimeOriginal only: IFD0 → Exif IFD → tag 0x9003. The GPS IFD (tag 0x8825) is
 * never followed. Any out-of-bounds or odd structure returns undefined.
 */
export function exifCaptureTime(tiff: Buffer): string | undefined {
  if (tiff.length < 8) return undefined;
  const order = tiff.subarray(0, 2).toString("latin1");
  if (order !== "II" && order !== "MM") return undefined;
  const le = order === "II";
  const u16 = (o: number) => (o + 2 <= tiff.length ? (le ? tiff.readUInt16LE(o) : tiff.readUInt16BE(o)) : -1);
  const u32 = (o: number) => (o + 4 <= tiff.length ? (le ? tiff.readUInt32LE(o) : tiff.readUInt32BE(o)) : -1);
  if (u16(2) !== 42) return undefined;

  const findEntry = (ifd: number, tag: number) => {
    const count = u16(ifd);
    if (count < 0 || count > 500) return -1;
    for (let k = 0; k < count; k++) {
      const entry = ifd + 2 + k * 12;
      if (u16(entry) === tag) return entry;
    }
    return -1;
  };

  const pointer = findEntry(u32(4), EXIF_IFD_POINTER);
  if (pointer < 0) return undefined;
  const entry = findEntry(u32(pointer + 8), DATE_TIME_ORIGINAL);
  if (entry < 0 || u16(entry + 2) !== 2 || u32(entry + 4) < 19) return undefined; // ASCII, "YYYY:MM:DD HH:MM:SS"
  const offset = u32(entry + 8);
  if (offset < 0 || offset + 19 > tiff.length) return undefined;
  const m = tiff.subarray(offset, offset + 19).toString("latin1").match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return undefined;
  const [, y, mo, d, h, mi, s] = m.map(Number) as number[];
  const date = new Date(Date.UTC(y!, mo! - 1, d!, h!, mi!, s!));
  if (date.getUTCMonth() !== mo! - 1 || h! > 23 || mi! > 59 || s! > 59 || y! < 1900) return undefined;
  return date.toISOString().slice(0, 19);
}

// --- Stripping ---------------------------------------------------------------

/** A copy of the image with embedded metadata removed. Pixels are untouched. */
export function stripMetadata(data: Buffer): Buffer {
  const type = sniffImageType(data);
  if (type === "image/jpeg") {
    const parsed = jpegSegments(data);
    if (!parsed) throw new Error("Not a readable JPEG.");
    const kept = parsed.segments
      .filter((s) => !(s.marker >= 0xe0 && s.marker <= 0xef && !KEEP_APP_MARKERS.has(s.marker)) && s.marker !== 0xfe)
      .map((s) => data.subarray(s.start, s.end));
    return Buffer.concat([data.subarray(0, 2), ...kept, data.subarray(parsed.scanStart)]);
  }
  if (type === "image/png") {
    const chunks = pngChunks(data);
    if (!chunks) throw new Error("Not a readable PNG.");
    const kept = chunks.filter((c) => !PNG_METADATA_CHUNKS.has(c.type)).map((c) => data.subarray(c.start, c.end));
    return Buffer.concat([PNG_SIGNATURE, ...kept]);
  }
  throw new Error("Not a JPEG or PNG.");
}
