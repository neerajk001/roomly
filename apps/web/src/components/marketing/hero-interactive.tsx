"use client";

import { useState } from "react";
import { BeforeAfterSlider } from "./before-after-slider";

const STYLES = [
  {
    id: "modern",
    name: "Modern",
    afterImage: "/demo/hero-after-modern.jpg",
    thumb: "/demo/hero-after-modern.jpg",
    desc: "Warm wood, layered textures & ambient lighting",
  },
  {
    id: "minimal",
    name: "Minimal",
    afterImage: "/demo/hero-after-minimal.jpg",
    thumb: "/demo/hero-after-minimal.jpg",
    desc: "Clean Japandi calm, neutral hues & soft daylight",
  },
  {
    id: "boho",
    name: "Boho",
    afterImage: "/demo/hero-after-boho.jpg",
    thumb: "/demo/hero-after-boho.jpg",
    desc: "Earthy rattan, cozy greenery & textured decor",
  },
  {
    id: "classic",
    name: "Classic",
    afterImage: "/demo/hero-after-classic.jpg",
    thumb: "/demo/hero-after-classic.jpg",
    desc: "Timeless moulding, crisp linen & warm elegance",
  },
];

export function HeroInteractive() {
  const [activeStyle, setActiveStyle] = useState(STYLES[0]);

  return (
    <div className="w-full">
      <div className="border border-black bg-white p-2.5">
        <div className="border border-black">
          <BeforeAfterSlider
            key={activeStyle.id}
            beforeImage="/demo/hero-before.jpg"
            afterImage={activeStyle.afterImage}
            beforeAlt="Messy unmade bedroom before redesign"
            afterAlt={`AI concept redesign in ${activeStyle.name} style`}
            aspectRatio="aspect-[4/3]"
            enableScrollEffect={true}
            variant="block"
          />
        </div>

        {/* Style selection strip */}
        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-black">
              Select AI Style Concept:
            </span>
            <span className="truncate text-[11px] text-black">
              <span className="font-bold uppercase">{activeStyle.name}</span>
              <span className="text-black/60"> · {activeStyle.desc}</span>
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
                    isActive ? "border-black" : "border-black/30 hover:border-black"
                  }`}
                >
                  <span className="relative block h-12 w-full overflow-hidden border-b border-black/20 sm:h-16">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={style.thumb}
                      alt={style.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </span>
                  <span
                    className={`block py-1 text-center text-[10px] font-bold uppercase tracking-wide ${
                      isActive ? "bg-[#FFD400] text-black" : "bg-white text-black"
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
