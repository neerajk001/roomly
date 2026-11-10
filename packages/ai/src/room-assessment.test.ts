import { describe, it, expect, vi } from "vitest";
const { parse, constructor } = vi.hoisted(() => ({ parse: vi.fn(), constructor: vi.fn() }));
vi.mock("openai", () => ({
  default: class {
    responses = { parse };
    constructor(options: unknown) {
      constructor(options);
    }
  },
}));
import {
  createDemoRoomAssessmentProvider,
  createOpenAIRoomAssessmentProvider,
} from "./room-assessment";
const context = {
  roomType: "LIVING_ROOM",
  dimensionsMm: { width: 3000, length: 4000, height: null },
  requestedItems: [{ key: "sofa", label: "Sofa" }],
  keepList: ["Existing sofa"],
  renterMode: true,
  notes: "Leave room for reading",
};
describe("room assessment providers", () => {
  it("labels the fake assessor as demo without claiming to inspect pixels", async () => {
    const p = createDemoRoomAssessmentProvider();
    const result = await p.assess({ image: Buffer.from("fake"), mime: "image/jpeg", context });
    expect(p.source).toBe("demo");
    expect(result.summary).toContain("not been analysed");
    expect(result.items.map((item) => item.key)).toEqual(["sofa"]);
  });
  it("uses the configured model, full photo/context, structured output, no storage and no retries", async () => {
    const demo = await createDemoRoomAssessmentProvider().assess({
      image: Buffer.from("image"),
      mime: "image/jpeg",
      context,
    });
    parse.mockResolvedValue({
      output_parsed: { ...demo, summary: "A visible room with sufficient floor context." },
    });
    await createOpenAIRoomAssessmentProvider({
      apiKey: "test-not-real",
      model: "chosen-vision-model",
    }).assess({ image: Buffer.from("photo"), mime: "image/jpeg", context });
    expect(constructor).toHaveBeenCalledWith(
      expect.objectContaining({ maxRetries: 0, timeout: 25000 }),
    );
    expect(parse).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "chosen-vision-model",
        store: false,
        text: expect.objectContaining({ format: expect.objectContaining({ type: "json_schema" }) }),
        input: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: expect.arrayContaining([
              expect.objectContaining({
                image_url: "data:image/jpeg;base64," + Buffer.from("photo").toString("base64"),
                detail: "high",
              }),
              expect.objectContaining({ text: expect.stringContaining('"width":3000') }),
            ]),
          }),
        ]),
      }),
    );
  });
  it("rejects refusals and incomplete requested-item coverage", async () => {
    const p = createOpenAIRoomAssessmentProvider({ apiKey: "fake", model: "chosen" });
    for (const output_parsed of [null, { decision: "ready" }]) {
      parse.mockResolvedValue({ output_parsed });
      await expect(
        p.assess({ image: Buffer.from("photo"), mime: "image/jpeg", context }),
      ).rejects.toThrow();
    }
  });
  it("passes recognisable close-up planning through with uncertainty preserved", async () => {
    const content = {
      ...(await createDemoRoomAssessmentProvider().assess({
        image: Buffer.from("photo"),
        mime: "image/jpeg",
        context,
      })),
      confidence: "low",
      boundariesVisible: false,
      floorVisible: false,
      fixedFeatures: [],
      limitations: ["Only part of the room is visible; exact fit is unknown."],
      items: [
        {
          key: "sofa",
          fit: "uncertain",
          footprint: "Use a compact sofa.",
          placement: "Use the visible wall without adding floor space.",
        },
      ],
    };
    parse.mockResolvedValue({ output_parsed: content });
    const result = await createOpenAIRoomAssessmentProvider({
      apiKey: "fake",
      model: "chosen",
    }).assess({ image: Buffer.from("photo"), mime: "image/jpeg", context });
    expect(result).toMatchObject({
      decision: "ready",
      confidence: "low",
      boundariesVisible: false,
      items: [{ fit: "uncertain" }],
    });
  });
});
