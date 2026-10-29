"use client";

import { useState } from "react";
import Link from "next/link";

interface PricingPlan {
  name: string;
  monthlyPrice: string;
  yearlyPrice: string;
  period: string;
  description: string;
  popular?: boolean;
  features: string[];
  ctaText: string;
  ctaHref: string;
}

const PLANS: PricingPlan[] = [
  {
    name: "Free",
    monthlyPrice: "₹0",
    yearlyPrice: "₹0",
    period: "/ month",
    description: "Try it out with limited credits.",
    features: [
      "10 design credits",
      "Standard render quality",
      "Watermarked downloads",
      "Basic features",
    ],
    ctaText: "Get started free",
    ctaHref: "/sign-up",
  },
  {
    name: "Home",
    monthlyPrice: "₹499",
    yearlyPrice: "₹399",
    period: "/ month",
    description: "For homeowners and renters.",
    features: [
      "100 design credits",
      "High quality renders",
      "No watermark",
      "Shopping list and cost guidance",
      "Save and share designs",
    ],
    ctaText: "Start Home plan",
    ctaHref: "/sign-up?plan=home",
  },
  {
    name: "Pro",
    monthlyPrice: "₹1,499",
    yearlyPrice: "₹1,199",
    period: "/ month",
    popular: true,
    description: "For individual designers.",
    features: [
      "300 design credits",
      "Branded renders",
      "Client projects and briefs",
      "Editable estimates",
      "Proposal PDF export",
      "Client approvals",
    ],
    ctaText: "Start Pro plan",
    ctaHref: "/sign-up?plan=pro",
  },
  {
    name: "Studio",
    monthlyPrice: "₹3,499",
    yearlyPrice: "₹2,799",
    period: "/ month",
    description: "For growing studios.",
    features: [
      "1000 design credits",
      "Multiple team members",
      "Advanced project management",
      "Custom branding",
      "Priority support",
    ],
    ctaText: "Get Studio plan",
    ctaHref: "/sign-up?plan=studio",
  },
];

export function PricingSection() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section id="pricing" className="bg-[#faf8f2] py-20 border-y border-[#e6e0d2]">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center rounded-full border border-[#d8d2c4] bg-white px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#6b776f]">
            Simple Pricing
          </span>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl text-[#1f2a24]">
            Plans for every type of user
          </h2>
          <p className="mt-2 text-sm text-[#6b776f]">
            Start free and upgrade when you need more credits and features.
          </p>

          {/* Monthly / Yearly Toggle */}
          <div className="mt-7 flex items-center gap-3">
            <div className="flex items-center rounded-full border border-[#d8d2c4] bg-white p-1 shadow-inner">
              <button
                type="button"
                onClick={() => setIsYearly(false)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                  !isYearly
                    ? "bg-[#1f2a24] text-white shadow"
                    : "text-[#6b776f] hover:text-[#1f2a24]"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setIsYearly(true)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                  isYearly
                    ? "bg-[#1f2a24] text-white shadow"
                    : "text-[#6b776f] hover:text-[#1f2a24]"
                }`}
              >
                Yearly
              </button>
            </div>
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
              Save up to 20%
            </span>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => {
            const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
            return (
              <div
                key={plan.name}
                className={`relative flex flex-col justify-between rounded-2xl border p-6 transition-all duration-300 hover:shadow-lg ${
                  plan.popular
                    ? "border-emerald-700 bg-white shadow-md ring-2 ring-emerald-700/20"
                    : "border-[#d8d2c4] bg-white"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-emerald-800 px-3 py-0.5 text-[10px] font-semibold tracking-wide uppercase text-white shadow">
                      Most popular
                    </span>
                  </div>
                )}

                <div>
                  <h3 className="text-base font-semibold text-[#1f2a24]">{plan.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-bold tracking-tight text-[#1f2a24]">
                      {price}
                    </span>
                    <span className="text-xs text-[#6b776f]">{plan.period}</span>
                  </div>
                  <p className="mt-2 text-xs text-[#6b776f] min-h-[32px]">{plan.description}</p>

                  <div className="mt-6 border-t border-[#eee8db] pt-5">
                    <ul className="space-y-3 text-xs text-[#3f4d45]">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5">
                          <svg
                            className="h-4 w-4 shrink-0 text-emerald-700"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-8">
                  <Link
                    href={plan.ctaHref}
                    className={`block w-full rounded-xl py-2.5 text-center text-xs font-semibold transition-all ${
                      plan.popular
                        ? "bg-emerald-800 text-white hover:bg-emerald-900 shadow-sm"
                        : "border border-[#d8d2c4] bg-[#faf8f2] text-[#1f2a24] hover:bg-[#eee8dc]"
                    }`}
                  >
                    {plan.ctaText}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
