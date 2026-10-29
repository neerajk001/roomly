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
    <div className="relative mx-auto w-full max-w-xl">
      {/* Decorative ambient backdrop glow */}
      <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-emerald-500/10 via-amber-200/20 to-emerald-700/15 blur-xl pointer-events-none" />

      <div className="relative rounded-2xl border border-[#d8d2c4] bg-white/90 p-2.5 shadow-2xl backdrop-blur-sm transition-all duration-300">
        <BeforeAfterSlider
          key={activeStyle.id}
          beforeImage="/demo/hero-before.jpg"
          afterImage={activeStyle.afterImage}
          beforeAlt="Messy unmade bedroom before redesign"
          afterAlt={`AI concept redesign in ${activeStyle.name} style`}
          aspectRatio="aspect-[4/3] sm:aspect-[16/11]"
          enableScrollEffect={true}
        />

        {/* Style selection strip */}
        <div className="mt-3">
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-xs font-medium text-[#4b5a51]">
              Select AI Style Concept:
            </span>
            <span className="text-xs font-semibold text-emerald-800">
              {activeStyle.name} · <span className="font-normal text-[#6b776f]">{activeStyle.desc}</span>
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
                  className={`group relative flex flex-col items-center gap-1.5 rounded-xl border p-1.5 transition-all text-left ${
                    isActive
                      ? "border-emerald-700 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-700"
                      : "border-[#e0dacf] bg-[#faf8f2] hover:border-[#c5beaf] hover:bg-white"
                  }`}
                >
                  <div className="relative h-11 w-full overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={style.thumb}
                      alt={style.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {isActive && (
                      <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-emerald-600 ring-2 ring-white" />
                    )}
                  </div>
                  <span
                    className={`text-[11px] font-medium tracking-tight ${
                      isActive ? "text-emerald-900 font-semibold" : "text-[#4b5a51]"
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
