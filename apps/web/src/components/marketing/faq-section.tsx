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
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  const toggleOpen = (id: string) => {
    setOpenIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <section id="faq" className="mx-auto max-w-6xl px-4 py-20">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="relative">
          <span className="inline-block rounded-xl border border-border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground">
            Frequently Asked Questions
          </span>
          <h2 className="mt-5 text-4xl font-semibold leading-[1.02] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Got questions?
            <br />
            We&apos;ve got <span className="text-primary">answers.</span>
          </h2>
          <svg
            aria-hidden="true"
            className="absolute right-0 top-3 hidden h-12 w-16 text-foreground md:block"
            viewBox="0 0 60 48"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="14" y1="8" x2="26" y2="40" />
            <line x1="34" y1="8" x2="46" y2="40" />
          </svg>
        </div>
        <Link
          href="/#faq"
          className="inline-flex w-fit items-center gap-3 rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-foreground hover:text-white"
        >
          <span>View all FAQs</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-4">
          {FAQS_LEFT.map((faq, i) => {
            const isOpen = Boolean(openIds[faq.id]);
            const accent = i % 2 === 0 ? "bg-primary" : "bg-accent";
            return (
              <div key={faq.id} className="overflow-hidden rounded-xl border border-border bg-card">
                <button
                  type="button"
                  onClick={() => toggleOpen(faq.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-stretch text-left"
                >
                  <span className="flex-1 px-4 py-4 text-sm font-medium text-foreground">
                    {faq.q}
                  </span>
                  <span
                    className={`flex w-14 shrink-0 items-center justify-center border-l border-border text-2xl font-normal text-foreground ${accent}`}
                  >
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-border px-4 py-3">
                    <p className="text-xs leading-5 text-muted-foreground">{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {FAQS_RIGHT.map((faq, i) => {
            const isOpen = Boolean(openIds[faq.id]);
            const accent = i % 2 === 0 ? "bg-accent" : "bg-primary";
            return (
              <div key={faq.id} className="overflow-hidden rounded-xl border border-border bg-card">
                <button
                  type="button"
                  onClick={() => toggleOpen(faq.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-stretch text-left"
                >
                  <span className="flex-1 px-4 py-4 text-sm font-medium text-foreground">
                    {faq.q}
                  </span>
                  <span
                    className={`flex w-14 shrink-0 items-center justify-center border-l border-border text-2xl font-normal text-foreground ${accent}`}
                  >
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-border px-4 py-3">
                    <p className="text-xs leading-5 text-muted-foreground">{faq.a}</p>
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
