"use client";

import { Children, isValidElement, useId, useState, type ReactNode } from "react";

const TABS = [
  ["rooms", "Rooms & designs"],
  ["estimates", "Estimate"],
  ["proposals", "Proposals"],
  ["activity", "Activity"],
] as const;

export function ProjectTabs({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [selected, setSelected] = useState<string>("rooms");
  const groupId = useId();
  if (!enabled) return children;
  const sections = Children.toArray(children);
  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Project sections"
        className="grid grid-cols-3 gap-1 border-b pb-2 sm:flex"
      >
        {TABS.map(([id, label], index) => (
          <button
            key={id}
            id={`${groupId}-${id}`}
            type="button"
            role="tab"
            aria-selected={selected === id}
            aria-controls={`${groupId}-${id}-panel`}
            tabIndex={selected === id ? 0 : -1}
            className={`rounded-lg px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-primary ${selected === id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"}`}
            onClick={() => setSelected(id)}
            onKeyDown={(event) => {
              const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? TABS.length - 1
                    : offset !== 0
                      ? (index + offset + TABS.length) % TABS.length
                      : null;
              if (next === null) return;
              event.preventDefault();
              const nextId = TABS[next]?.[0];
              if (!nextId) return;
              setSelected(nextId);
              document.getElementById(`${groupId}-${nextId}`)?.focus();
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {TABS.map(([id]) => (
        <div
          key={id}
          id={`${groupId}-${id}-panel`}
          role="tabpanel"
          aria-labelledby={`${groupId}-${id}`}
          hidden={selected !== id}
          tabIndex={0}
        >
          {sections.filter(
            (section) =>
              isValidElement<{ id?: string }>(section) &&
              (section.props.id === id ||
                (id === "rooms" && ["renders", "add-room"].includes(section.props.id ?? ""))),
          )}
        </div>
      ))}
    </div>
  );
}
