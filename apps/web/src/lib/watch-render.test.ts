import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { watchRender } from "./watch-render";

const job = {
  id: "job",
  kind: "RESTYLE",
  status: "RUNNING",
  errorMessage: null,
  creditsCharged: 3,
  outputs: [],
  styleKey: "modern",
};
const handlers = () => ({ onUpdate: vi.fn(), onComplete: vi.fn(), onError: vi.fn() });
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("bounded render status polling", () => {
  it("reads until terminal and never starts another generation", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(job))
      .mockResolvedValueOnce(Response.json({ ...job, status: "SUCCEEDED" }));
    const callbacks = handlers();
    const stop = watchRender("job", callbacks, fetcher);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/renders/job",
      expect.objectContaining({ cache: "no-store", signal: expect.any(AbortSignal) }),
    );
    expect(callbacks.onComplete).toHaveBeenCalledTimes(1);
    expect(callbacks.onError).not.toHaveBeenCalled();
    stop();
  });
  it("pauses after five failed reads and rejects mismatched or malformed job payloads", async () => {
    for (const data of [{ ...job, id: "other-job" }, {}, null]) {
      const callbacks = handlers();
      const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => Response.json(data));
      const stop = watchRender("job", callbacks, fetcher);
      await vi.advanceTimersByTimeAsync(90_000);
      expect(fetcher).toHaveBeenCalledTimes(5);
      expect(callbacks.onError).toHaveBeenCalledTimes(1);
      expect(callbacks.onUpdate).not.toHaveBeenCalled();
      stop();
    }
  });
  it("times out stuck reads and can be restarted without another mutation", async () => {
    const callbacks = handlers();
    const stalled = vi.fn<typeof fetch>().mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () => reject(new Error("timeout")));
        }),
    );
    const stop = watchRender("job", callbacks, stalled);
    await vi.advanceTimersByTimeAsync(150_000);
    expect(callbacks.onError).toHaveBeenCalledTimes(1);
    expect(stalled).toHaveBeenCalledTimes(5);
    stop();
    const fresh = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ ...job, status: "SUCCEEDED" }));
    const stopFresh = watchRender("job", callbacks, fresh);
    await vi.advanceTimersByTimeAsync(2000);
    expect(callbacks.onComplete).toHaveBeenCalledTimes(1);
    stopFresh();
  });
  it("ignores late replies and aborts when switching away", async () => {
    let resolve: (response: Response) => void = () => undefined;
    const fetcher = vi.fn<typeof fetch>().mockImplementation(
      () =>
        new Promise<Response>((done) => {
          resolve = done;
        }),
    );
    const callbacks = handlers();
    const stop = watchRender("job", callbacks, fetcher);
    await vi.advanceTimersByTimeAsync(2000);
    const signal = fetcher.mock.calls[0]?.[1]?.signal;
    stop();
    expect(signal?.aborted).toBe(true);
    resolve(Response.json({ ...job, status: "SUCCEEDED" }));
    await vi.advanceTimersByTimeAsync(30_000);
    expect(callbacks.onUpdate).not.toHaveBeenCalled();
    expect(callbacks.onComplete).not.toHaveBeenCalled();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("pauses after ten minutes even if the backend keeps returning RUNNING", async () => {
    const callbacks = handlers();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => Response.json(job));
    const stop = watchRender("job", callbacks, fetcher);
    await vi.advanceTimersByTimeAsync(12 * 60_000);
    expect(callbacks.onError).toHaveBeenCalledTimes(1);
    expect(callbacks.onComplete).not.toHaveBeenCalled();
    stop();
  });
});
