import { describe, expect, it } from "vitest";
import {
  ROOM_CHECKLISTS,
  checklistForRoom,
  roomIncludesAreValid,
  roomIncludesPrompt,
  savedRoomIncludes,
} from "./room-checklists";

describe("room-specific must-haves", () => {
  it("covers all ten room types with distinct bounded lists and no unknown-room fallback", () => {
    expect(ROOM_CHECKLISTS.map((room) => room.key)).toEqual([
      "LIVING_ROOM",
      "BEDROOM",
      "KITCHEN",
      "BATHROOM",
      "DINING_ROOM",
      "HOME_OFFICE",
      "KIDS_ROOM",
      "BALCONY",
      "HALLWAY",
      "OTHER",
    ]);
    expect(
      new Set(ROOM_CHECKLISTS.map((room) => room.items.map(([key]) => key).join(","))).size,
    ).toBe(10);
    for (const room of ROOM_CHECKLISTS) {
      expect(room.items.length).toBeGreaterThanOrEqual(7);
      expect(room.items.length).toBeLessThanOrEqual(12);
      expect(
        roomIncludesAreValid(
          room.key,
          room.items.map(([key]) => key),
        ),
      ).toBe(true);
      const prompt = roomIncludesPrompt(
        room.key,
        room.items.map(([key]) => key),
      );
      for (const [, label] of room.items) expect(prompt).toContain(label);
      expect(prompt).toContain("every concept");
      expect(prompt).toContain("avoid overcrowding");
    }
    expect(checklistForRoom("unknown")).toEqual([]);
    expect(roomIncludesAreValid("unknown", [])).toBe(false);
  });
  it("accepts skipping all picks but rejects cross-room, duplicate and unknown picks", () => {
    for (const room of ROOM_CHECKLISTS) expect(roomIncludesAreValid(room.key, [])).toBe(true);
    expect(roomIncludesAreValid("KITCHEN", ["sofa"])).toBe(false);
    expect(roomIncludesAreValid("BEDROOM", ["bed", "bed"])).toBe(false);
    expect(roomIncludesAreValid("OTHER", ["sofa"])).toBe(false);
    expect(roomIncludesAreValid("BALCONY", ["outdoor-chairs", "injected text"])).toBe(false);
    expect(() => roomIncludesPrompt("KITCHEN", ["sofa"])).toThrow();
    expect(roomIncludesPrompt("BEDROOM", [])).toBe("");
    expect(roomIncludesPrompt("BEDROOM", ["bed"], "edit")).toContain(
      "explicitly removes or replaces",
    );
    expect(savedRoomIncludes({})).toEqual([]);
  });
});
