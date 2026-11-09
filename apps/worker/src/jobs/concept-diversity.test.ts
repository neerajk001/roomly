import { beforeAll, describe, expect, it, vi } from "vitest";
import { makeWebVersion } from "@roomdesigner/storage";
import type { EditInput, EditResult, ImageProvider } from "@roomdesigner/ai";
import { improveConceptDiversity } from "./concept-diversity";

let a: Buffer;
let b: Buffer;
let c: Buffer;
beforeAll(async () => {
  const room = async (colour: string, x: number) =>
    (
      await makeWebVersion(
        Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><rect width="160" height="120" fill="#ddd6cc"/><rect y="100" width="160" height="20" fill="#6f5c48"/><rect x="${x}" y="45" width="60" height="45" fill="${colour}"/></svg>`,
        ),
      )
    ).data;
  [a, b, c] = await Promise.all([room("#993322", 15), room("#228855", 80), room("#2244aa", 40)]);
});

function setup(images: Buffer[], replacement: Buffer = c) {
  const result: EditResult = {
    images: images.map((data) => ({ data, mime: "image/webp" })),
    costMicros: 300,
    model: "test",
  };
  const edit = vi.fn(async () => ({
    images: [{ data: replacement, mime: "image/webp" }],
    costMicros: 100,
    model: "test",
  }));
  const provider: ImageProvider = { name: "test", edit };
  const claimRetry = vi.fn(async () => true);
  const replacementInput = vi.fn((index: number): EditInput => ({
    image: a,
    mime: "image/webp",
    prompt: `replacement slot ${index}`,
    n: 1,
    size: "1024x1024",
    quality: "low",
  }));
  return {
    input: { result, provider, claimRetry, replacementInput, failedCallCostMicros: 250_000 },
    edit,
    claimRetry,
    replacementInput,
  };
}

describe("bounded concept diversity", () => {
  it("replaces only the duplicate slot and includes discarded-image cost", async () => {
    const test = setup([a, a, b]);
    const improved = await improveConceptDiversity(test.input);
    expect(test.edit).toHaveBeenCalledTimes(1);
    expect(test.replacementInput).toHaveBeenCalledWith(1);
    expect(improved.result.images.map((image) => image.data)).toEqual([a, c, b]);
    expect(improved.result.costMicros).toBe(400);
    expect(improved.report).toEqual({ similarConcepts: false, retryUsed: true });
  });
  it("makes no extra call for an already distinct set", async () => {
    const test = setup([a, b, c]);
    expect((await improveConceptDiversity(test.input)).report).toEqual({
      similarConcepts: false,
      retryUsed: false,
    });
    expect(test.edit).not.toHaveBeenCalled();
    expect(test.claimRetry).not.toHaveBeenCalled();
  });
  it("stops after one extra call even if other duplicates remain", async () => {
    const test = setup([a, a, a, a]);
    const improved = await improveConceptDiversity(test.input);
    expect(test.edit).toHaveBeenCalledTimes(1);
    expect(improved.result.images).toHaveLength(4);
    expect(improved.report).toEqual({ similarConcepts: true, retryUsed: true });
  });
  it("retains originals without an extra charge if the retry budget cannot be claimed", async () => {
    const test = setup([a, a]);
    test.claimRetry.mockResolvedValue(false);
    const improved = await improveConceptDiversity(test.input);
    expect(test.edit).not.toHaveBeenCalled();
    expect(improved.result.costMicros).toBe(300);
    expect(improved.report).toEqual({ similarConcepts: true, retryUsed: false });
  });
  it("retains originals if replacement fails and accounts conservatively for missing usage", async () => {
    const test = setup([a, a]);
    test.edit.mockRejectedValue(new Error("timeout"));
    const improved = await improveConceptDiversity(test.input);
    expect(improved.result.images.map((image) => image.data)).toEqual([a, a]);
    expect(improved.result.costMicros).toBe(250_300);
    expect(improved.report).toEqual({ similarConcepts: true, retryUsed: true });
  });
  it("discards an unimproved or unreadable replacement while accounting for returned usage", async () => {
    for (const replacement of [a, Buffer.from("invalid image")]) {
      const test = setup([a, a], replacement);
      const improved = await improveConceptDiversity(test.input);
      expect(improved.result.images.map((image) => image.data)).toEqual([a, a]);
      expect(improved.result.costMicros).toBe(400);
      expect(improved.report.similarConcepts).toBe(true);
    }
  });
});
