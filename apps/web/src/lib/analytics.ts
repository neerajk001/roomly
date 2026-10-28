"use client";

/** Privacy-friendly analytics: event names + non-identifying props only. */
export function track(event: string, props: Record<string, string | number | boolean> = {}): void {
  try {
    const payload = JSON.stringify({ event, props });
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      navigator.sendBeacon("/api/analytics", new Blob([payload], { type: "application/json" }));
      return;
    }
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
    });
  } catch {
    // Never break the UI for analytics.
  }
}
