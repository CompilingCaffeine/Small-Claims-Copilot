import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readImageInfo, sniffImageType, stripMetadata } from "../../server/image.ts";
import { exifTiff, jpeg, png } from "../imageFixtures.ts";

const withEverything = jpeg({
  width: 640,
  height: 480,
  exif: exifTiff({ dateTimeOriginal: "2026:03:12 16:10:05", gps: true }),
  xmp: "<exif:GPSLatitude>37,46.5N</exif:GPSLatitude>",
});

describe("readImageInfo", () => {
  it("reads type, pixel size, byte size, and SHA-256 of the original bytes", () => {
    const info = readImageInfo(withEverything)!;
    expect(info).toMatchObject({ mimeType: "image/jpeg", width: 640, height: 480, byteSize: withEverything.length });
    expect(info.sha256).toBe(createHash("sha256").update(withEverything).digest("hex"));
  });

  it("reads the EXIF capture time, and never anything from the GPS section", () => {
    const info = readImageInfo(withEverything)!;
    expect(info.capturedAt).toBe("2026-03-12T16:10:05");
    expect(Object.keys(info).sort()).toEqual(["byteSize", "capturedAt", "height", "mimeType", "sha256", "width"]);
    expect(JSON.stringify(info)).not.toMatch(/GPS|latitude/i);
  });

  it("treats a missing or malformed capture time as absent", () => {
    expect(readImageInfo(jpeg({ width: 10, height: 10 }))!.capturedAt).toBeUndefined();
    expect(readImageInfo(jpeg({ width: 10, height: 10, exif: exifTiff({ gps: true }) }))!.capturedAt).toBeUndefined();
    expect(readImageInfo(jpeg({ width: 10, height: 10, exif: exifTiff({ dateTimeOriginal: "2026:02:30 25:00:00" }) }))!.capturedAt).toBeUndefined();
    expect(readImageInfo(jpeg({ width: 10, height: 10, exif: Buffer.from("II*\0garbage") }))!.capturedAt).toBeUndefined();
  });

  it("reads PNG size and an eXIf capture time", () => {
    const file = png({ width: 3, height: 2, exif: exifTiff({ dateTimeOriginal: "2025:12:01 08:00:00" }) });
    expect(readImageInfo(file)).toMatchObject({ mimeType: "image/png", width: 3, height: 2, capturedAt: "2025-12-01T08:00:00" });
  });

  it("identifies files by their bytes, not their names, and rejects malformed ones", () => {
    expect(sniffImageType(Buffer.from("just text, named photo.png"))).toBeNull();
    expect(readImageInfo(withEverything.subarray(0, 40))).toBeNull(); // truncated before the size header
    const p = png({ width: 2, height: 2 });
    expect(readImageInfo(p.subarray(0, p.length - 12))).toBeNull(); // no IEND
    expect(readImageInfo(jpeg({ width: 0, height: 10 }))).toBeNull();
  });
});

describe("stripMetadata", () => {
  it("removes EXIF (with GPS), XMP, and comments from a JPEG and keeps the image data", () => {
    const stripped = stripMetadata(withEverything);
    const text = stripped.toString("latin1");
    expect(text).not.toContain("Exif");
    expect(text).not.toContain("GPSLatitude");
    expect(text).not.toContain("camera comment");
    expect(text).toContain("JFIF");
    expect(readImageInfo(stripped)).toMatchObject({ width: 640, height: 480 });
    expect(readImageInfo(stripped)!.capturedAt).toBeUndefined();
    expect(stripped.subarray(-5).equals(withEverything.subarray(-5))).toBe(true);
  });

  it("removes eXIf and text chunks from a PNG", () => {
    const file = png({ width: 2, height: 2, exif: exifTiff({ dateTimeOriginal: "2025:12:01 08:00:00", gps: true }), text: "home address" });
    const stripped = stripMetadata(file);
    expect(stripped.toString("latin1")).not.toMatch(/eXIf|tEXt|home address/);
    expect(readImageInfo(stripped)).toMatchObject({ width: 2, height: 2 });
  });
});
