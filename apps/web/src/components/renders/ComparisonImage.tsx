"use client";

import { useState } from "react";

export function ComparisonImage({
  url,
  label,
  onReady,
  onFailure,
}: {
  url: string;
  label: string;
  onReady(width: number, height: number): void;
  onFailure(): void;
}) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  return (
    <div className="relative h-full min-h-0 w-full">
      {state === "loading" && (
        <p
          role="status"
          className="absolute inset-0 flex items-center justify-center p-4 text-sm text-muted-foreground"
        >
          Loading {label.toLowerCase()} image…
        </p>
      )}
      {state === "error" ? (
        <div
          role="alert"
          className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center text-sm"
        >
          <p>{label} image could not be loaded.</p>
          <button
            type="button"
            className="rounded-lg border border-border bg-card px-3 py-2"
            onClick={() => {
              setAttempt(attempt + 1);
              setState("loading");
            }}
          >
            Retry {label.toLowerCase()} image
          </button>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- full signed private image, contained without cropping
        <img
          key={attempt}
          src={url}
          alt={label}
          draggable={false}
          className={
            "block h-full w-full object-contain " + (state === "loading" ? "opacity-0" : "")
          }
          onLoad={(event) => {
            const image = event.currentTarget;
            if (image.naturalWidth > 0 && image.naturalHeight > 0) {
              setState("ready");
              onReady(image.naturalWidth, image.naturalHeight);
            } else {
              setState("error");
              onFailure();
            }
          }}
          onError={() => {
            setState("error");
            onFailure();
          }}
        />
      )}
    </div>
  );
}
