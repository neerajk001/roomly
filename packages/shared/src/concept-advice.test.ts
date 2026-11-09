import { describe, expect, it } from "vitest";
import { conceptAdviceSchema, savedConceptAdvice, renderSourceOutputId } from "./concept-advice";

describe("advice payload boundary", () => {
  const advice = {
    summary: "A calm concept.",
    suggestions: [],
    source: "demo",
    preparedAt: "2026-11-09T00:00:00.000Z",
  };
  it("keeps advice tied to one output and handles missing legacy data", () => {
    expect(savedConceptAdvice({}, "b")).toBeUndefined();
    const params = {
      conceptAdvice: {
        b: {
          status: "ready",
          provider: "demo",
          requestId: "request",
          attempts: 1,
          startedAt: advice.preparedAt,
          advice,
        },
      },
    };
    expect(savedConceptAdvice(params, "b")).toEqual(advice);
    expect(savedConceptAdvice(params, "a")).toBeUndefined();
    expect(renderSourceOutputId({ sourceOutputId: "b" })).toBe("b");
    expect(renderSourceOutputId({})).toBeNull();
  });
  it("rejects unbounded or malformed model content", () => {
    expect(conceptAdviceSchema.safeParse({ ...advice, suggestions: [null] }).success).toBe(false);
    expect(conceptAdviceSchema.safeParse({ ...advice, source: "unknown" }).success).toBe(false);
  });
});
