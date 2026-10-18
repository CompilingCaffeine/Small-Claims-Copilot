import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp, parseAccessCodes } from "../../server/app.ts";
import { fakeAi } from "../fakeAi.ts";

const document = { id: "doc1", filename: "note.txt", pages: ["The deposit was $600."] };
const CODE = "judge-7f3a9c21";

describe("access codes (the hosted copy)", () => {
  it("runs live AI for anyone when no codes are configured (local use)", async () => {
    const ai = fakeAi({ facts: [] });
    const app = createApp({ ai });
    expect((await request(app).get("/api/health")).body).toEqual({ ok: true, accessCodeRequired: false });
    expect((await request(app).post("/api/extract").send({ document })).status).toBe(200);
  });

  it("refuses AI routes without a valid code, before the AI is called", async () => {
    const ai = fakeAi({ facts: [] });
    const app = createApp({ ai, accessCodes: [CODE] });
    expect((await request(app).get("/api/health")).body.accessCodeRequired).toBe(true);
    for (const header of [undefined, "wrong-code-123", CODE.slice(0, -1)]) {
      const req = request(app).post("/api/extract").send({ document });
      const res = await (header ? req.set("X-Access-Code", header) : req);
      expect(res.status).toBe(401);
      expect(res.body.accessCodeRequired).toBe(true);
    }
    expect((await request(app).post("/api/analyze").send({})).status).toBe(401);
    expect((await request(app).post("/api/photos/describe")).status).toBe(401);
    expect(ai.calls).toHaveLength(0);
  });

  it("accepts any configured code", async () => {
    const app = createApp({ ai: fakeAi({ facts: [] }), accessCodes: ["other-code-0001", CODE] });
    expect((await request(app).post("/api/access").set("X-Access-Code", CODE)).status).toBe(200);
    expect((await request(app).post("/api/extract").set("X-Access-Code", CODE).send({ document })).status).toBe(200);
  });

  it("locks AI routes when the hosted copy has no codes set, rather than opening them", async () => {
    const app = createApp({ ai: fakeAi({ facts: [] }), accessCodes: parseAccessCodes(undefined) });
    expect((await request(app).post("/api/access").set("X-Access-Code", "")).status).toBe(401);
    expect((await request(app).post("/api/extract").send({ document })).status).toBe(401);
  });

  it("keeps reading uploads open, since it doesn't call the AI", async () => {
    const app = createApp({ ai: fakeAi({ facts: [] }), accessCodes: [CODE] });
    const res = await request(app).post("/api/documents").attach("file", Buffer.from("hello"), "note.txt");
    expect(res.status).toBe(200);
  });

  it("parses ACCESS_CODES as a comma-separated list, ignoring blanks and codes under 8 characters", () => {
    expect(parseAccessCodes(` ${CODE} , ,short, other-code-0001 `)).toEqual([CODE, "other-code-0001"]);
  });
});
