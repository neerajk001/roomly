"use client";

import { useState } from "react";
import { BeforeAfterSlider } from "./before-after-slider";

const STYLES = [
  {
    id: "modern",
    name: "Modern",
    afterImage: "/demo/redesign/hero-after-modern.webp",
    thumb: "/demo/redesign/hero-after-modern.webp",
    desc: "Warm wood, layered textures & ambient lighting",
  },
  {
    id: "minimal",
    name: "Minimal",
    afterImage: "/demo/redesign/hero-after-minimal.webp",
    thumb: "/demo/redesign/hero-after-minimal.webp",
    desc: "Clean Japandi calm, neutral hues & soft daylight",
  },
  {
    id: "boho",
    name: "Boho",
    afterImage: "/demo/redesign/hero-after-boho.webp",
    thumb: "/demo/redesign/hero-after-boho.webp",
    desc: "Earthy rattan, cozy greenery & textured decor",
  },
  {
    id: "classic",
    name: "Classic",
    afterImage: "/demo/redesign/hero-after-classic.webp",
    thumb: "/demo/redesign/hero-after-classic.webp",
    desc: "Walnut furniture, cream textiles & framed artwork",
  },
];

export function HeroInteractive() {
  const [activeStyle, setActiveStyle] = useState(STYLES[0]);

  return (
    <div className="min-w-0 w-full">
      <div className="rounded-xl border border-border bg-muted p-2.5">
        <div className="rounded-xl border border-border">
          <BeforeAfterSlider
            key={activeStyle.id}
            beforeImage="/demo/redesign/living-before-unfinished.webp"
            afterImage={activeStyle.afterImage}
            beforeAlt="Cluttered living room with mismatched furniture before redesign"
            afterAlt={`${activeStyle.name} concept of the same living room`}
            aspectRatio="aspect-[4/3]"
            enableScrollEffect={true}
            variant="block"
          />
        </div>

        {/* Style selection strip */}
        <div className="mt-3">
          <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2 px-0.5">
            <span className="text-[11px] font-semibold tracking-normal text-foreground">
              Demo: one room, four styles
            </span>
            <span className="min-w-0 truncate text-[11px] text-foreground">
              <span className="font-semibold uppercase">{activeStyle.name}</span>
              <span className="text-muted-foreground"> · {activeStyle.desc}</span>
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {STYLES.map((style) => {
              const isActive = activeStyle.id === style.id;
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setActiveStyle(style)}
                  aria-pressed={isActive}
                  className={`group flex flex-col border text-left transition-colors ${
                    isActive ? "border-border" : "border-border hover:border-border"
                  }`}
                >
                  <span className="relative block h-12 w-full overflow-hidden border-b border-border sm:h-16">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={style.thumb}
                      alt={style.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </span>
                  <span
                    className={`block py-1 text-center text-[10px] font-semibold tracking-normal ${
                      isActive ? "bg-accent text-foreground" : "bg-card text-foreground"
                    }`}
                  >
                    {style.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
