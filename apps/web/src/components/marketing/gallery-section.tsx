"use client";

import { useState } from "react";
import { BeforeAfterSlider } from "./before-after-slider";

const CATEGORIES = ["All", "Living Room", "Bedroom", "Kitchen", "Bathroom", "Home Office"] as const;

interface GalleryItem {
  id: string;
  room: string;
  style: string;
  category: (typeof CATEGORIES)[number];
  beforeImg: string;
  afterImg: string;
}

const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: "living",
    room: "Living Room",
    style: "Modern · Warm · Cozy",
    category: "Living Room",
    beforeImg: "/demo/redesign/living-before.webp",
    afterImg: "/demo/redesign/hero-after-modern.webp",
  },
  {
    id: "bedroom",
    room: "Bedroom",
    style: "Minimal · Calm · Elegant",
    category: "Bedroom",
    beforeImg: "/demo/redesign/bedroom-before.webp",
    afterImg: "/demo/redesign/bedroom-after.webp",
  },
  {
    id: "kitchen",
    room: "Kitchen",
    style: "Modern · Functional · Bright",
    category: "Kitchen",
    beforeImg: "/demo/redesign/kitchen-before.webp",
    afterImg: "/demo/redesign/kitchen-after.webp",
  },
  {
    id: "office",
    room: "Home Office",
    style: "Productive · Stylish · Minimal",
    category: "Home Office",
    beforeImg: "/demo/redesign/office-before.webp",
    afterImg: "/demo/redesign/office-after.webp",
  },
  {
    id: "dining",
    room: "Dining Room",
    style: "Modern · Earthy · Inviting",
    category: "Living Room",
    beforeImg: "/demo/redesign/dining-before.webp",
    afterImg: "/demo/redesign/dining-after.webp",
  },
  {
    id: "bathroom",
    room: "Bathroom",
    style: "Spa-like · Clean · Premium",
    category: "Bathroom",
    beforeImg: "/demo/redesign/bath-before.webp",
    afterImg: "/demo/redesign/bath-after.webp",
  },
];

export function GallerySection() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const filteredItems = GALLERY_ITEMS.filter((item) =>
    selectedCategory === "All"
      ? true
      : item.category === selectedCategory ||
        item.room.toLowerCase().includes(selectedCategory.toLowerCase()),
  );

  return (
    <section id="examples" className="mx-auto max-w-6xl px-4 py-20">
      <div className="text-center">
        <span className="inline-block rounded-xl border border-border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground">
          Same Room. New Possibilities.
        </span>
        <h2 className="mt-5 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          See what&apos;s possible.
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
          Start with a room photo, then explore a new style. Each pair shows the same room before
          and after an illustrative redesign.
        </p>

        {/* Category filter tabs */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                aria-pressed={isActive}
                className={`rounded-xl border border-border px-4 py-1.5 text-[11px] font-semibold tracking-normal transition-colors ${
                  isActive
                    ? "bg-foreground text-white"
                    : "bg-card text-foreground hover:bg-foreground/5"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of before/after cards */}
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="group overflow-hidden rounded-xl border border-border bg-card"
          >
            <BeforeAfterSlider
              beforeImage={item.beforeImg}
              afterImage={item.afterImg}
              beforeAlt={`${item.room} before transformation`}
              afterAlt={`${item.room} AI redesign concept`}
              aspectRatio="aspect-[16/10]"
              enableScrollEffect={true}
              variant="block"
            />
            <div className="flex items-center gap-2.5 border-t border-border px-3 py-2">
              <h3 className="text-sm font-semibold text-foreground">{item.room}</h3>
              <span className="h-3 w-px bg-foreground/40" aria-hidden="true" />
              <p className="text-[11px] text-muted-foreground">{item.style}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        AI-generated demo scenes and redesign concepts. Actual results vary; visuals are not to
        scale.
      </p>
    </section>
  );
}
