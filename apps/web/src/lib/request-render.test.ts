import { afterEach, expect, it, vi } from "vitest";
const { submit } = vi.hoisted(() => ({ submit: vi.fn() }));
vi.mock("../server/actions/renders", () => ({ createRenderAction: submit }));
import { requestRender } from "./request-render";

afterEach(() => submit.mockReset());
it("returns confirmed jobs and actionable server errors", async () => {
  submit.mockResolvedValueOnce({ jobId: "job", creditsCharged: 3 });
  await expect(requestRender(new FormData())).resolves.toEqual({ jobId: "job", creditsCharged: 3 });
  submit.mockResolvedValueOnce({ error: "Not enough credits." });
  await expect(requestRender(new FormData())).resolves.toEqual({ error: "Not enough credits." });
});
it("does not retry a dropped or malformed mutation response", async () => {
  for (const response of [new Error("private transport detail"), {}]) {
    submit.mockReset();
    if (response instanceof Error) submit.mockRejectedValue(response);
    else submit.mockResolvedValue(response);
    const result = await requestRender(new FormData());
    expect(result.error).toContain("Check design history");
    expect(result.error).not.toContain("private");
    expect(submit).toHaveBeenCalledTimes(1);
  }
});
