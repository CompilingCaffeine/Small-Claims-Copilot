import { describe, expect, it } from "vitest";
import { emptyCase } from "../../shared/schemas.ts";
import { STORAGE_KEYS, loadCase, saveCase } from "../../src/state/caseStore.ts";

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, v),
  };
}

describe("case store", () => {
  it("round-trips a case, keeping My case and Demo case separate", () => {
    const storage = memoryStorage();
    const mine = { ...emptyCase(), input: { ...emptyCase().input, description: "My dispute" } };
    expect(saveCase(storage, "my", mine)).toBe(true);
    expect(loadCase(storage, "my").state.input.description).toBe("My dispute");
    expect(loadCase(storage, "demo").state.input.description).toMatch(/Ridgeline/);
  });

  it("starts fresh with a message when saved data is corrupt", () => {
    const storage = memoryStorage();
    storage.setItem(STORAGE_KEYS.my, "{not json");
    expect(loadCase(storage, "my")).toMatchObject({ state: emptyCase(), notice: expect.stringMatching(/couldn't be read/) });
    storage.setItem(STORAGE_KEYS.my, JSON.stringify({ schemaVersion: 1, documents: "nope" }));
    expect(loadCase(storage, "my").notice).toMatch(/couldn't be read/);
  });

  it("forgets extractions that were interrupted mid-request", () => {
    const storage = memoryStorage();
    saveCase(storage, "my", { ...emptyCase(), facts: { d: { status: "pending", facts: [], droppedCount: 0 } } });
    expect(loadCase(storage, "my").state.facts).toEqual({});
  });

  it("reports a failed save (storage full or blocked) instead of throwing", () => {
    const full = { ...memoryStorage(), setItem: () => { throw new Error("QuotaExceededError"); } } as Storage;
    expect(saveCase(full, "my", emptyCase())).toBe(false);
  });

  it("loads a case saved before photos existed, with no photos", () => {
    const storage = memoryStorage();
    const { photos: _none, ...old } = { ...emptyCase(), input: { ...emptyCase().input, description: "Old case" } };
    storage.setItem(STORAGE_KEYS.my, JSON.stringify(old));
    expect(loadCase(storage, "my").state).toMatchObject({ photos: [], input: { description: "Old case" } });
  });

  it("marks a photo description interrupted by closing the page as failed", () => {
    const storage = memoryStorage();
    const photo = {
      id: "p1", filename: "deck.jpg", thumbnail: "",
      metadata: { origin: "technical_metadata", mimeType: "image/jpeg", byteSize: 10, width: 1, height: 1, sha256: "ab" },
      descriptionStatus: "pending",
    };
    storage.setItem(STORAGE_KEYS.my, JSON.stringify({ ...emptyCase(), photos: [photo] }));
    expect(loadCase(storage, "my").state.photos[0]).toMatchObject({ descriptionStatus: "failed", descriptionError: expect.stringMatching(/Add the photo again/) });
  });
});
