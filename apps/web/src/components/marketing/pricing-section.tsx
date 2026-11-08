import Link from "next/link";

interface PricingPlan {
  name: string;
  price: string;
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
    price: "₹0",
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
    price: "₹499",
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
    price: "₹1,499",
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
    price: "₹3,499",
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

function CheckIcon() {
  return (
    <svg
      className="h-3 w-3"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="4 10 8 14 16 5" />
    </svg>
  );
}

export function PricingSection() {
  return (
    <section id="pricing" className="border-t border-border bg-card py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <span className="inline-block rounded-xl border border-border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground">
            Simple Pricing
          </span>
          <h2 className="mt-5 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Plans for every type of user.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Start free and upgrade when you need more credits and features.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-xl border border-border bg-card p-6 ${
                plan.popular ? "shadow-sm" : ""
              }`}
            >
              {plan.popular && (
                <>
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl border border-border bg-accent px-4 py-1 text-[11px] font-semibold tracking-normal text-foreground">
                    Most Popular
                  </span>
                  <div
                    className="pointer-events-none absolute right-0 top-0 h-16 w-16 bg-accent"
                    style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
                    aria-hidden="true"
                  />
                </>
              )}

              <span className="inline-block self-start rounded-xl border border-border px-3 py-1 text-sm font-semibold tracking-normal text-foreground">
                {plan.name}
              </span>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-5xl font-semibold tracking-tight text-foreground">
                  {plan.price}
                </span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <p className="mt-3 min-h-[40px] text-sm text-muted-foreground">{plan.description}</p>

              <div className="mt-5 border-t border-border pt-5">
                <ul className="space-y-3 text-sm text-foreground">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center ${
                          plan.popular
                            ? "bg-primary text-white"
                            : "rounded-xl border border-border bg-card text-foreground"
                        }`}
                      >
                        <CheckIcon />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto pt-8">
                <Link
                  href={plan.ctaHref}
                  className={`flex w-full items-center justify-between rounded-xl border border-border px-4 py-3 text-sm font-semibold shadow-sm transition-all   hover:shadow-sm   active:shadow-none ${
                    plan.name === "Free" ? "bg-card text-foreground" : "bg-primary text-white"
                  }`}
                >
                  <span>{plan.ctaText}</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
