import { describe, it, expect } from "vitest";
import {
  validateRoomAssessment,
  savedRoomAssessment,
  type RoomAssessmentContent,
} from "./room-assessment";

const ready: RoomAssessmentContent = {
  decision: "ready",
  confidence: "high",
  boundariesVisible: true,
  floorVisible: true,
  summary: "Visible boundaries and floor support a compact layout.",
  nextStep: "",
  fixedFeatures: ["Keep the visible door and wall junctions."],
  accessConstraints: ["Leave the door approach clear."],
  layoutGuidance: ["Use a compact sofa along the visible wall."],
  limitations: ["Exact scale is not known from the photo."],
  items: [
    {
      key: "sofa",
      fit: "compact",
      footprint: "Compact two-seat option, not a large sectional.",
      placement: "Along the visible wall, clear of the door.",
    },
  ],
};
describe("room assessment boundaries", () => {
  it("accepts complete item coverage and preserves explicit planning limitations", () => {
    expect(validateRoomAssessment(ready, ["sofa"])).toEqual(ready);
  });
  it("allows partial room views and uncertain scale without forcing a wider photo", () => {
    for (const patch of [
      { confidence: "low" as const },
      { boundariesVisible: false },
      { floorVisible: false },
      { fixedFeatures: [] },
      { layoutGuidance: [] },
      { items: [{ ...ready.items[0]!, fit: "uncertain" as const }] },
    ])
      expect(validateRoomAssessment({ ...ready, ...patch }, ["sofa"])).toMatchObject({
        decision: "ready",
        ...patch,
      });
  });
  it("keeps an explicit unusable-photo decision and requires actionable recovery", () => {
    const unusable = {
      ...ready,
      decision: "needs-photo",
      confidence: "low",
      summary: "The image is too dark to recognise any interior detail.",
      nextStep: "Upload a room photo with enough light to see the interior.",
    };
    expect(validateRoomAssessment(unusable, ["sofa"])).toEqual(unusable);
    expect(() => validateRoomAssessment({ ...unusable, nextStep: "" }, ["sofa"])).toThrow();
  });
  it("blocks infeasible furniture rather than enlarging the room", () => {
    expect(
      validateRoomAssessment({ ...ready, items: [{ ...ready.items[0]!, fit: "cannot-fit" }] }, [
        "sofa",
      ]),
    ).toMatchObject({ decision: "review-items" });
  });
  it("rejects invented, missing, duplicate and malformed item plans", () => {
    for (const items of [
      [],
      [ready.items[0], ready.items[0]],
      [{ ...ready.items[0], key: "pool" }],
      [{ ...ready.items[0], footprint: "" }],
    ])
      expect(() => validateRoomAssessment({ ...ready, items }, ["sofa"])).toThrow();
    expect(savedRoomAssessment({})).toBeUndefined();
  });
});
