"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Dialog, Tabs } from "radix-ui";
import Link from "next/link";

export function RoomWorkspace({
  designs,
  costs,
  setup,
  hasPhoto,
  shoppingHref,
  share,
  manageHref,
}: {
  designs: ReactNode;
  costs: ReactNode;
  setup: ReactNode;
  hasPhoto: boolean;
  shoppingHref?: string;
  share?: ReactNode;
  manageHref?: string;
}) {
  const [section, setSection] = useState(hasPhoto ? "designs" : "setup");
  const shareOpener = useRef<HTMLElement | null>(null);
  const [sharing, setSharing] = useState(false);
  useEffect(() => {
    const followHash = () => {
      if (location.hash === "#share-room") {
        shareOpener.current =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setSharing(true);
      } else if (location.hash === "#cost-breakdown") setSection("costs");
      else if (location.hash === "#room-details") setSection("setup");
    };
    followHash();
    window.addEventListener("hashchange", followHash);
    return () => window.removeEventListener("hashchange", followHash);
  }, []);
  return (
    <Tabs.Root value={section} onValueChange={setSection} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <Tabs.List
          aria-label="Room sections"
          className="inline-flex w-full gap-1 rounded-xl bg-muted p-1 sm:w-auto"
        >
          {[
            ["designs", "Designs"],
            ["costs", "Costs"],
            ["setup", "Room setup"],
          ].map(([value, label]) => (
            <Tabs.Trigger
              key={value}
              value={value ?? "designs"}
              className="flex-1 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground outline-offset-2 data-[state=active]:bg-foreground data-[state=active]:text-background sm:flex-none"
            >
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </div>
      <Tabs.Content
        forceMount
        value="designs"
        className="space-y-6 outline-none data-[state=inactive]:hidden"
      >
        {hasPhoto ? (
          designs
        ) : (
          <section className="rounded-xl border border-border bg-card px-6 py-16 text-center">
            <h1 className="text-2xl font-semibold">Start with your room photo</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Add a photo in Room setup, then come here to create and compare your designs.
            </p>
            <button
              type="button"
              onClick={() => setSection("setup")}
              className="mt-5 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background"
            >
              Add a room photo
            </button>
          </section>
        )}
      </Tabs.Content>
      <Tabs.Content
        forceMount
        value="costs"
        className="space-y-6 outline-none data-[state=inactive]:hidden"
      >
        <div>
          <h2 className="text-2xl font-semibold">Plan your costs</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Estimates use your room measurements and selected scope. They are shared across design
            concepts.
          </p>
        </div>
        {costs}
        {shoppingHref && (
          <Link
            className="inline-block rounded-lg border border-border px-4 py-2 text-sm"
            href={shoppingHref}
          >
            Planning checklist →
          </Link>
        )}
      </Tabs.Content>
      <Tabs.Content
        forceMount
        value="setup"
        className="space-y-6 outline-none data-[state=inactive]:hidden"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Room setup</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Keep photos, measurements and your brief together here.
            </p>
          </div>
          {hasPhoto && (
            <button
              type="button"
              onClick={() => setSection("designs")}
              className="rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background"
            >
              View designs →
            </button>
          )}
        </div>
        {setup}
        {manageHref && (
          <Link href={manageHref} className="inline-block text-sm underline">
            Manage rooms in this project →
          </Link>
        )}
      </Tabs.Content>
      {share && (
        <Dialog.Root
          open={sharing}
          onOpenChange={(open) => {
            setSharing(open);
            if (!open && location.hash === "#share-room")
              history.replaceState(null, "", location.pathname + location.search);
          }}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-[70] bg-foreground/40" />
            <Dialog.Content
              aria-describedby="share-description"
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                shareOpener.current?.focus();
              }}
              className="fixed left-1/2 top-1/2 z-[80] max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl"
            >
              <div className="flex items-center justify-between gap-3">
                <Dialog.Title className="text-xl font-semibold">Share designs</Dialog.Title>
                <Dialog.Close className="rounded-lg border px-3 py-2 text-sm">Close</Dialog.Close>
              </div>
              <Dialog.Description
                id="share-description"
                className="mb-4 mt-2 text-sm text-muted-foreground"
              >
                Choose which designs from this project others can see. Creating a link makes that
                gallery public.
              </Dialog.Description>
              {share}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </Tabs.Root>
  );
}
