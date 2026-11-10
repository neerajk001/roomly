"use client";
import { useRef, useState } from "react";
import { Dialog } from "radix-ui";

export function ConceptPreview({ url, onClose }: { url: string; onClose(): void }) {
  const [imageState, setImageState] = useState<"loading" | "ready" | "error">("loading");
  const opener = useRef<HTMLElement | null>(
    typeof document !== "undefined" && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-foreground/60" />
        <Dialog.Content
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            opener.current?.focus();
          }}
          className="fixed inset-3 z-[80] flex flex-col rounded-xl border border-border bg-card p-3 outline-none sm:inset-8"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 pb-3">
            <Dialog.Title className="text-sm font-semibold">Concept preview</Dialog.Title>
            <Dialog.Close className="rounded-lg border border-border px-3 py-2 text-sm">
              Close
            </Dialog.Close>
          </div>
          {imageState === "loading" && (
            <p role="status" className="py-3 text-sm text-muted-foreground">
              Loading image…
            </p>
          )}
          {imageState === "error" ? (
            <p role="alert" className="py-6 text-sm">
              This image could not be loaded. Close the preview and refresh your room.
            </p>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- signed private image with load/error states
            <img
              src={url}
              alt="Concept visual"
              onLoad={() => setImageState("ready")}
              onError={() => setImageState("error")}
              className="min-h-0 flex-1 object-contain"
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
