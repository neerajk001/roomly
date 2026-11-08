import { afterEach, describe, expect, it, vi } from "vitest";
import { saveFavorite } from "./save-favorite";

afterEach(() => vi.unstubAllGlobals());
describe("saving favorites", () => {
  it("requires confirmation from the server", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ ok: true, isFavorite: true })),
    );
    await expect(saveFavorite("output", true)).resolves.toBeUndefined();
  });
  it("reports failed writes and mismatched responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({}, { status: 500 })));
    await expect(saveFavorite("output", true)).rejects.toThrow("could not be saved");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ ok: true, isFavorite: false })),
    );
    await expect(saveFavorite("output", true)).rejects.toThrow("could not be confirmed");
  });
});
