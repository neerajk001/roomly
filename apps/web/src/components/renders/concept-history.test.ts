import { describe, expect, it } from "vitest";
import { conceptFamily } from "./concept-history";
import { conceptSelectionSchema } from "./use-concept-selection";
import type { RenderJobView } from "./types";

function job(id: string, ids: string[], sourceOutputId: string | null = null): RenderJobView {
  return {
    id,
    kind: sourceOutputId ? "EDIT" : "RESTYLE",
    sourceOutputId,
    status: "SUCCEEDED",
    errorMessage: null,
    creditsCharged: 1,
    label: id,
    styleKey: "modern",
    outputs: ids.map((outputId, index) => ({
      id: outputId,
      index,
      isFavorite: false,
      url: "image",
      thumbUrl: "thumbnail",
    })),
  };
}
describe("concept family and selection", () => {
  const history = [
    job("base", ["a", "b", "c"]),
    job("edit-b", ["b1"], "b"),
    job("edit-a", ["a1"], "a"),
    job("edit-b-again", ["b2"], "b1"),
  ];
  it("keeps only edits descended from the selected concept", () => {
    expect(conceptFamily(history, "b").map((item) => item.output.id)).toEqual(["b", "b1", "b2"]);
    expect(conceptFamily(history, "b2").map((item) => item.output.id)).toEqual(["b", "b1", "b2"]);
    expect(conceptFamily(history, "a").map((item) => item.output.id)).toEqual(["a", "a1"]);
    expect(conceptFamily(history, "missing")).toEqual([]);
  });
  it("bounds invalid/cyclic history and validates browser preferences", () => {
    expect(() =>
      conceptFamily([job("x", ["x1"], "y1"), job("y", ["y1"], "x1")], "x1"),
    ).not.toThrow();
    expect(
      conceptSelectionSchema.safeParse({ version: 1, jobId: "base", outputs: { base: "b" } })
        .success,
    ).toBe(true);
    expect(
      conceptSelectionSchema.safeParse({ version: 1, jobId: "base", outputs: { base: 42 } })
        .success,
    ).toBe(false);
  });
});
