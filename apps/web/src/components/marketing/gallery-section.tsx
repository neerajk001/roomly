"use client";

import { useState } from "react";
import { BeforeAfterSlider } from "./before-after-slider";

const CATEGORIES = [
  "All",
  "Living Room",
  "Bedroom",
  "Kitchen",
  "Bathroom",
  "Home Office",
] as const;

interface GalleryItem {
  id: string;
  room: string;
  style: string;
  category: typeof CATEGORIES[number];
  beforeImg: string;
  afterImg: string;
}

const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: "living",
    room: "Living Room",
    style: "Modern · Warm · Cosy",
    category: "Living Room",
    beforeImg: "/demo/living-before.jpg",
    afterImg: "/demo/living-after.jpg",
  },
  {
    id: "bedroom",
    room: "Bedroom",
    style: "Minimal · Clean · Calm",
    category: "Bedroom",
    beforeImg: "/demo/bedroom-before.jpg",
    afterImg: "/demo/bedroom-after.jpg",
  },
  {
    id: "kitchen",
    room: "Kitchen",
    style: "Modern · Functional · Bright",
    category: "Kitchen",
    beforeImg: "/demo/kitchen-before.jpg",
    afterImg: "/demo/kitchen-after.jpg",
  },
  {
    id: "office",
    room: "Home Office",
    style: "Productive · Stylish · Minimal",
    category: "Home Office",
    beforeImg: "/demo/office-before.jpg",
    afterImg: "/demo/office-after.jpg",
  },
  {
    id: "dining",
    room: "Dining Room",
    style: "Elegant · Modern · Earthy",
    category: "Living Room",
    beforeImg: "/demo/dining-before.jpg",
    afterImg: "/demo/dining-after.jpg",
  },
  {
    id: "bathroom",
    room: "Bathroom",
    style: "Spa-like · Clean · Premium",
    category: "Bathroom",
    beforeImg: "/demo/bath-before.jpg",
    afterImg: "/demo/bath-after.jpg",
  },
];

export function GallerySection() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const filteredItems = GALLERY_ITEMS.filter((item) =>
    selectedCategory === "All" ? true : item.category === selectedCategory || item.room.toLowerCase().includes(selectedCategory.toLowerCase())
  );

  return (
    <section id="examples" className="mx-auto max-w-6xl px-4 py-20">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d8d2c4] bg-white px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#6b776f]">
          Real Spaces, Real Transformations
        </span>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl text-[#1f2a24]">
          See what&apos;s possible
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-[#6b776f]">
          From small bedrooms to open living rooms, explore redesigns created by our users.
        </p>

        {/* Category filter pills */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-[#1f2a24] text-white shadow-sm"
                    : "border border-[#d8d2c4] bg-white text-[#4b5a51] hover:bg-[#eee8dc]"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of before/after cards */}
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="group overflow-hidden rounded-2xl border border-[#d8d2c4] bg-white shadow-sm transition-all hover:shadow-md"
          >
            <BeforeAfterSlider
              beforeImage={item.beforeImg}
              afterImage={item.afterImg}
              beforeAlt={`${item.room} before transformation`}
              afterAlt={`${item.room} AI redesign concept`}
              aspectRatio="aspect-[16/10]"
              enableScrollEffect={true}
            />
            <div className="border-t border-[#eee8db] bg-[#faf8f2]/60 px-4 py-3">
              <h3 className="text-sm font-semibold text-[#1f2a24]">{item.room}</h3>
              <p className="mt-0.5 text-xs text-[#6b776f]">{item.style}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-[#8a938c]">
        Renders are concept visuals. Not to scale. Illustrative room redesign examples.
      </p>
    </section>
  );
}
