"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Tabs } from "radix-ui";
import Link from "next/link";

export function RoomWorkspace({
  designs,
  costs,
  setup,
  hasPhoto,
  shoppingHref,
  shareHref,
}: {
  designs: ReactNode;
  costs: ReactNode;
  setup: ReactNode;
  hasPhoto: boolean;
  shoppingHref?: string;
  shareHref?: string;
}) {
  const [section, setSection] = useState(hasPhoto ? "designs" : "setup");
  useEffect(() => {
    const followHash = () => {
      if (location.hash === "#cost-breakdown") setSection("costs");
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
        <nav
          aria-label="Room workflow"
          className="flex gap-4 text-xs font-medium text-muted-foreground"
        >
          {shoppingHref && (
            <Link className="hover:text-foreground" href={shoppingHref}>
              Shopping list ↗
            </Link>
          )}
          {shareHref && (
            <Link className="hover:text-foreground" href={shareHref}>
              Share & get feedback ↗
            </Link>
          )}
        </nav>
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
      </Tabs.Content>
    </Tabs.Root>
  );
}
