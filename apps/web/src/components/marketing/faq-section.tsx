"use client";

import { useState } from "react";
import Link from "next/link";

interface FAQItem {
  id: string;
  q: string;
  a: string;
}

const FAQS_LEFT: FAQItem[] = [
  {
    id: "q1",
    q: "Are the designs real or accurate floor plans?",
    a: "Renders are AI-generated concept visuals for inspiration and aesthetic guidance. They are not structural blueprints or binding contractor quotes.",
  },
  {
    id: "q2",
    q: "Do you provide furniture or product links?",
    a: "Yes! Alongside every redesign, we generate rough cost estimates and an illustrative shopping list matching the room's aesthetic.",
  },
  {
    id: "q3",
    q: "Can I use this if I'm a renter?",
    a: "Absolutely! Our renter mode locks walls and structural elements, restricting redesigns strictly to movable furniture, lighting, rugs, textiles, and paint.",
  },
  {
    id: "q4",
    q: "How does the pricing and credits work?",
    a: "Each image generation costs credits. Free accounts receive 10 initial credits. Paid plans receive generous monthly allowances, and failed renders are refunded automatically.",
  },
];

const FAQS_RIGHT: FAQItem[] = [
  {
    id: "q5",
    q: "Can I use my existing furniture in the designs?",
    a: "Yes! With our 'Keep List' feature, you specify which furniture or fixtures must stay, and the AI designs the new room around them.",
  },
  {
    id: "q6",
    q: "Can I create client proposals and estimates?",
    a: "Yes, Pro and Studio tiers offer dedicated client portals, custom rate cards, interactive budget estimates, and downloadable branded PDF proposals.",
  },
  {
    id: "q7",
    q: "Is there a free plan?",
    a: "Yes, you can sign up and start redesigning right away for free. No credit card or upfront commitment required.",
  },
  {
    id: "q8",
    q: "Do you offer refunds?",
    a: "If a render fails or doesn't complete due to provider error, credits are immediately returned to your account balance.",
  },
];

export function FAQSection() {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({
    q1: false,
    q5: false,
  });

  const toggleOpen = (id: string) => {
    setOpenIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <section id="faq" className="mx-auto max-w-6xl px-4 py-20">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <span className="inline-flex items-center rounded-full border border-[#d8d2c4] bg-white px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#6b776f]">
            Frequently Asked Questions
          </span>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl text-[#1f2a24]">
            Got questions? We&apos;ve got answers.
          </h2>
        </div>
        <Link
          href="/#faq"
          className="inline-flex items-center text-xs font-semibold text-emerald-800 hover:text-emerald-950 transition-colors"
        >
          View all FAQs →
        </Link>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-4">
          {FAQS_LEFT.map((faq) => {
            const isOpen = Boolean(openIds[faq.id]);
            return (
              <div
                key={faq.id}
                className="overflow-hidden rounded-xl border border-[#d8d2c4] bg-white transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleOpen(faq.id)}
                  className="flex w-full items-center justify-between p-4 text-left font-medium text-[#1f2a24] hover:bg-[#faf8f2] transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-medium">{faq.q}</span>
                  <svg
                    className={`h-4 w-4 shrink-0 text-[#6b776f] transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="border-t border-[#eee8db] bg-[#faf8f2]/50 px-4 py-3">
                    <p className="text-xs leading-5 text-[#5a685f]">{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {FAQS_RIGHT.map((faq) => {
            const isOpen = Boolean(openIds[faq.id]);
            return (
              <div
                key={faq.id}
                className="overflow-hidden rounded-xl border border-[#d8d2c4] bg-white transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleOpen(faq.id)}
                  className="flex w-full items-center justify-between p-4 text-left font-medium text-[#1f2a24] hover:bg-[#faf8f2] transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-medium">{faq.q}</span>
                  <svg
                    className={`h-4 w-4 shrink-0 text-[#6b776f] transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="border-t border-[#eee8db] bg-[#faf8f2]/50 px-4 py-3">
                    <p className="text-xs leading-5 text-[#5a685f]">{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
