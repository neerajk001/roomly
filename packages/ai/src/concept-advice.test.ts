import { describe, expect, it, vi } from "vitest";
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
  createDemoAdviceProvider,
  createOpenAIAdviceProvider,
  CONCEPT_ADVICE_INSTRUCTIONS,
} from "./concept-advice";

const context = {
  roomType: "BEDROOM",
  style: "Indian minimal",
  direction: "Warm & tactile",
  keepList: ["Bed"],
  renterMode: true,
  budgetTier: "budget",
  notes: "Keep space for reading",
};
const content = {
  summary: "A calm bedroom.",
  suggestions: [
    {
      title: "Softer light",
      observation: "A visible portable lamp uses direct light.",
      reason: "A shade could soften the reading area.",
      instruction: "Add a shade to the portable lamp and keep everything else unchanged.",
    },
  ],
};

describe("concept advice provider", () => {
  it("labels demo suggestions honestly rather than claiming image analysis", async () => {
    const provider = createDemoAdviceProvider();
    expect(provider.source).toBe("demo");
    const result = await provider.suggest({
      image: Buffer.from("demo"),
      mime: "image/jpeg",
      context,
    });
    expect(result.summary).toContain("not image analysis");
    expect(result.summary).toContain("Indian minimal");
  });
  it("sends the selected image and context through structured output with storage and retries disabled", async () => {
    parse.mockResolvedValue({ output_parsed: content });
    const provider = createOpenAIAdviceProvider({
      apiKey: "test-key-not-real",
      model: "user-configured-vision-model",
    });
    expect(
      await provider.suggest({ image: Buffer.from("selected-image"), mime: "image/webp", context }),
    ).toEqual(content);
    expect(constructor).toHaveBeenCalledWith(
      expect.objectContaining({ maxRetries: 0, timeout: 25_000 }),
    );
    expect(parse).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "user-configured-vision-model",
        store: false,
        input: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: expect.arrayContaining([
              expect.objectContaining({
                type: "input_image",
                image_url: `data:image/webp;base64,${Buffer.from("selected-image").toString("base64")}`,
              }),
              expect.objectContaining({
                type: "input_text",
                text: expect.stringContaining("Keep space for reading"),
              }),
            ]),
          }),
        ]),
      }),
    );
    expect(CONCEPT_ADVICE_INSTRUCTIONS).toContain("Never change architecture");
    expect(CONCEPT_ADVICE_INSTRUCTIONS).toContain("exact prices");
  });
  it("rejects invalid or refused provider data", async () => {
    parse.mockResolvedValue({ output_parsed: null });
    await expect(
      createOpenAIAdviceProvider({ apiKey: "test-key", model: "configured" }).suggest({
        image: Buffer.from("image"),
        mime: "image/jpeg",
        context,
      }),
    ).rejects.toThrow();
  });
});
