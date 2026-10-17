// Builds small synthetic JPEG/PNG files for tests, including EXIF with a capture time
// and (fake) GPS coordinates, so tests can prove the GPS never comes out the other side.
import { crc32, deflateSync } from "node:zlib";

/** A little-endian TIFF block as found inside EXIF. */
export function exifTiff({ dateTimeOriginal, gps }: { dateTimeOriginal?: string; gps?: boolean }): Buffer {
  const b = Buffer.alloc(256);
  b.write("II", 0, "latin1");
  b.writeUInt16LE(42, 2);
  b.writeUInt32LE(8, 4);
  // IFD0 at 8: [ExifIFD pointer, GPS pointer?]
  const ifd0Entries = gps ? 2 : 1;
  b.writeUInt16LE(ifd0Entries, 8);
  const exifIfd = 8 + 2 + ifd0Entries * 12 + 4;
  const entry = (at: number, tag: number, type: number, count: number, value: number) => {
    b.writeUInt16LE(tag, at);
    b.writeUInt16LE(type, at + 2);
    b.writeUInt32LE(count, at + 4);
    b.writeUInt32LE(value, at + 8);
  };
  entry(10, 0x8769, 4, 1, exifIfd);
  const gpsIfd = exifIfd + 2 + 12 + 4;
  if (gps) entry(22, 0x8825, 4, 1, gpsIfd);
  // Exif IFD: DateTimeOriginal
  const dateAt = 200;
  b.writeUInt16LE(dateTimeOriginal ? 1 : 0, exifIfd);
  if (dateTimeOriginal) {
    entry(exifIfd + 2, 0x9003, 2, 20, dateAt);
    b.write(`${dateTimeOriginal}\0`, dateAt, "latin1");
  }
  if (gps) {
    // GPS IFD: latitude ref "N" and latitude 37°46'30" (fake), as rationals.
    const rationals = 160;
    b.writeUInt16LE(2, gpsIfd);
    entry(gpsIfd + 2, 0x0001, 2, 2, 0);
    b.write("N\0", gpsIfd + 2 + 8, "latin1");
    entry(gpsIfd + 14, 0x0002, 5, 3, rationals);
    [37, 1, 46, 1, 3000, 100].forEach((v, k) => b.writeUInt32LE(v, rationals + k * 4));
  }
  return b;
}

const segment = (marker: number, data: Buffer) => {
  const head = Buffer.from([0xff, marker, 0, 0]);
  head.writeUInt16BE(data.length + 2, 2);
  return Buffer.concat([head, data]);
};

/** A JPEG with valid headers (not decodable pixels), optional EXIF and XMP. */
export function jpeg({ width, height, exif, xmp }: { width: number; height: number; exif?: Buffer; xmp?: string }): Buffer {
  const sof = Buffer.from([8, 0, 0, 0, 0, 1, 1, 0x11, 0]);
  sof.writeUInt16BE(height, 1);
  sof.writeUInt16BE(width, 3);
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    segment(0xe0, Buffer.from("JFIF\0\x01\x01\0\0\x01\0\x01\0\0", "latin1")),
    ...(exif ? [segment(0xe1, Buffer.concat([Buffer.from("Exif\0\0", "latin1"), exif]))] : []),
    ...(xmp ? [segment(0xe1, Buffer.from(`http://ns.adobe.com/xap/1.0/\0${xmp}`, "latin1"))] : []),
    segment(0xfe, Buffer.from("camera comment", "latin1")),
    segment(0xc0, sof),
    segment(0xda, Buffer.from([1, 1, 0, 0, 63, 0])),
    Buffer.from([0x12, 0x34, 0x56]),
    Buffer.from([0xff, 0xd9]),
  ]);
}

const chunk = (type: string, data: Buffer) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

/** A real, decodable gray PNG, with optional eXIf and text chunks. */
export function png({ width, height, exif, text }: { width: number; height: number; exif?: Buffer; text?: string }): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 0, 0, 0, 0], 8); // 8-bit grayscale
  const rows = Buffer.alloc((width + 1) * height, 0x80);
  for (let y = 0; y < height; y++) rows[y * (width + 1)] = 0; // filter byte
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    ...(exif ? [chunk("eXIf", exif)] : []),
    ...(text ? [chunk("tEXt", Buffer.from(`Comment\0${text}`, "latin1"))] : []),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
