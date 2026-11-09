import { expect, it, vi } from "vitest";
const { edit } = vi.hoisted(() => ({ edit: vi.fn() }));
vi.mock("openai", () => ({
  default: class {
    images = { edit };
  },
  toFile: async (data: Buffer, name: string, options: { type: string }) => ({
    data,
    name,
    type: options.type,
  }),
}));
import { createOpenAIProvider } from "./openai";

it("forwards the PNG mask for targeted edits and omits it for whole-image edits", async () => {
  edit.mockResolvedValue({ data: [{ b64_json: Buffer.from("output").toString("base64") }] });
  const provider = createOpenAIProvider({ apiKey: "test-only", model: "configured-model" });
  const input = {
    image: Buffer.from("source"),
    mime: "image/png",
    prompt: "Change the selected sofa",
    n: 1,
    size: "auto" as const,
    quality: "high" as const,
  };
  await provider.edit({ ...input, mask: Buffer.from("mask") });
  expect(edit).toHaveBeenLastCalledWith(
    expect.objectContaining({
      model: "configured-model",
      mask: { data: Buffer.from("mask"), name: "selection.png", type: "image/png" },
    }),
    undefined,
  );
  await provider.edit(input);
  expect(edit.mock.calls[1]?.[0]).not.toHaveProperty("mask");
});
