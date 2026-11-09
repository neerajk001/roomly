import Link from "next/link";
import { HeroInteractive } from "@/components/marketing/hero-interactive";
import { GallerySection } from "@/components/marketing/gallery-section";
import { PricingSection } from "@/components/marketing/pricing-section";
import { FAQSection } from "@/components/marketing/faq-section";
import { CtaBanner } from "@/components/marketing/cta-banner";

export default function LandingPage() {
  return (
    <div className="bg-background text-foreground overflow-x-hidden">
      {/* 1. HERO SECTION */}
      <section className="relative mx-auto max-w-6xl bg-background px-6 pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center lg:gap-12">
          {/* Left Column: Headline & CTA */}
          <div>
            <span className="inline-block rounded-full bg-accent px-3 py-1 text-[11px] font-semibold tracking-wide text-accent-foreground">
              AI Interior Design
            </span>

            <h1 className="mt-6 text-5xl font-semibold leading-[0.95] tracking-tight text-foreground sm:text-6xl lg:text-[64px]">
              Reimagine
              <br />
              your space.
            </h1>

            <span className="relative mt-4 inline-block">
              <span className="absolute inset-0 bg-transparent" aria-hidden="true" />
              <span className="relative block text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-[52px]">
                Before you
                <br />
                spend a rupee.
              </span>
            </span>

            <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
              Upload a photo, choose a style, and get stunning AI-generated room redesigns with cost
              guidance. For homeowners, renters and professional designers.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-3 rounded-xl border border-border bg-primary px-6 py-3 text-xs font-semibold tracking-normal text-white shadow-sm transition-all   hover:shadow-sm   active:shadow-none"
              >
                <span>Try your first redesign</span>
                <span aria-hidden="true">→</span>
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-foreground px-5 py-3 text-xs font-semibold tracking-normal text-white transition-colors hover:bg-foreground/90"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <polygon points="6 4 20 12 6 20 6 4" />
                </svg>
                <span>Watch how it works</span>
              </a>
            </div>

            <p className="mt-4 text-xs font-medium text-muted-foreground">
              Free plan · No card required
            </p>

            {/* Social proof avatars */}
            <div className="mt-8 flex items-center gap-3 border-t border-border pt-6">
              <div className="flex -space-x-2">
                {[
                  "/demo/avatar-1.jpg",
                  "/demo/avatar-2.jpg",
                  "/demo/avatar-3.jpg",
                  "/demo/avatar-4.jpg",
                ].map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={src}
                    src={src}
                    alt="User avatar"
                    className="h-9 w-9 rounded-full border border-border object-cover grayscale"
                  />
                ))}
              </div>
              <div className="text-xs leading-snug">
                <p className="font-semibold text-foreground">28,500+ spaces reimagined</p>
                <p className="text-muted-foreground">by homeowners and designers.</p>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Interactive Before/After with Scroll & Style Selectors */}
          <div>
            <HeroInteractive />
          </div>
        </div>
      </section>

      {/* 2. CAPABILITIES PROCESS STRIP */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-px rounded-xl border border-border bg-foreground sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "AI Designs",
              body: "Get 3 concept visuals in minutes.",
              icon: (
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                  <path d="M5 3v4M3 5h4" />
                </svg>
              ),
            },
            {
              title: "Cost Guidance",
              body: "See a rough budget for each design.",
              icon: (
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="8" y1="13" x2="16" y2="13" />
                  <line x1="8" y1="17" x2="13" y2="17" />
                </svg>
              ),
            },
            {
              title: "For Everyone",
              body: "Homeowners, renters and professionals.",
              icon: (
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" />
                  <path d="M3 11h18v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <path d="M6 18v2M18 18v2" />
                </svg>
              ),
            },
            {
              title: "Privacy First",
              body: "Your photos are secure and never shared.",
              icon: (
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
              ),
            },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3.5 bg-card p-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border text-foreground">
                {item.icon}
              </span>
              <div>
                <p className="text-[11px] font-semibold tracking-normal text-foreground">
                  {item.title}
                </p>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. SEE WHAT'S POSSIBLE (INTERACTIVE BEFORE/AFTER GALLERY) */}
      <GallerySection />

      {/* 5. TESTIMONIALS */}
      <section className="border-t border-border bg-background py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <span className="inline-block rounded-xl border border-border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground">
              Loved by Homeowners and Designers
            </span>
            <h2 className="mt-5 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Beautiful spaces. Happier people.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              Illustrative room concepts for homeowners, renters and professional designers.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
            {/* Priya — Living Room */}
            <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card sm:col-span-2 lg:col-span-5">
              <div className="flex flex-1">
                <div className="hidden w-1/2 sm:block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/demo/redesign/hero-after-modern.webp"
                    alt="Redesigned living room"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="relative flex-1 p-5">
                  <span
                    className="absolute left-3 top-1 select-none font-sans text-5xl leading-none text-accent"
                    aria-hidden="true"
                  >
                    &ldquo;
                  </span>
                  <p className="relative pt-6 text-xs leading-relaxed text-muted-foreground">
                    I redesigned my entire living room in minutes. The results were stunning and the
                    cost estimate really helped!
                  </p>
                  <div className="mt-4 flex items-center gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/demo/avatar-1.jpg"
                      alt="Priya S."
                      className="h-8 w-8 rounded-full border border-border object-cover"
                    />
                    <div>
                      <p className="text-[11px] font-semibold text-foreground">Priya S.</p>
                      <p className="text-[10px] text-muted-foreground">Homeowner, Mumbai</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border">
                <span className="px-3 py-1.5 text-[9px] font-semibold tracking-normal text-foreground">
                  Living Room
                </span>
                <div className="flex" aria-hidden="true">
                  <span className="flex h-7 w-7 items-center justify-center border-l border-border text-foreground">
                    ←
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center bg-foreground text-white">
                    →
                  </span>
                </div>
              </div>
            </div>

            {/* Neha — Bedroom */}
            <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card lg:col-span-4">
              <div className="h-28 w-full overflow-hidden border-b border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/demo/redesign/bedroom-after.webp"
                  alt="Redesigned bedroom"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="flex gap-0.5" aria-label="Rated 5 out of 5">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className="h-3.5 w-3.5 fill-primary"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  &ldquo;Super easy to use. The chat edits make it so flexible. I could try
                  different styles until it felt perfect.&rdquo;
                </p>
                <div className="mt-auto flex items-center gap-2.5 pt-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/demo/avatar-3.jpg"
                    alt="Neha R."
                    className="h-8 w-8 rounded-full border border-border object-cover"
                  />
                  <div>
                    <p className="text-[11px] font-semibold text-foreground">Neha R.</p>
                    <p className="text-[10px] text-muted-foreground">Renter, Bangalore</p>
                  </div>
                </div>
              </div>
              <div className="border-t border-border px-3 py-1.5 text-[9px] font-semibold tracking-normal text-foreground">
                Bedroom
              </div>
            </div>

            {/* Karan — 92% stat */}
            <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-foreground text-white lg:col-span-3">
              <div className="relative p-4">
                <span
                  className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center bg-foreground text-white"
                  aria-hidden="true"
                >
                  ↗
                </span>
                <p className="text-5xl font-semibold leading-none">92%</p>
                <p className="mt-2 text-[9px] font-semibold tracking-normal text-white/90">
                  of our clients approve the first concept round.
                </p>
              </div>
              <div className="mt-auto p-4">
                <p className="text-xs leading-relaxed text-white/90">
                  &ldquo;As a design studio, it streamlines our entire process from concepts to cost
                  estimates. We can show clients realistic options in hours, not days.&rdquo;
                </p>
                <div className="mt-3 flex items-center gap-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/demo/avatar-4.jpg"
                    alt="Karan V."
                    className="h-8 w-8 rounded-full border border-white/70 object-cover"
                  />
                  <div>
                    <p className="text-[11px] font-semibold text-white">Karan V.</p>
                    <p className="text-[10px] text-white/70">Design Studio, Delhi</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-white/25 px-3 py-1.5">
                <span className="text-[9px] font-semibold tracking-normal text-white/80">
                  Testimonial
                </span>
                <span
                  className="flex h-7 w-7 items-center justify-center bg-accent font-sans text-lg leading-none text-foreground"
                  aria-hidden="true"
                >
                  &rdquo;
                </span>
              </div>
            </div>

            {/* Arjun — Kitchen */}
            <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card sm:col-span-2 lg:col-span-7">
              <div className="flex flex-1 flex-col sm:flex-row">
                <div className="order-2 flex-1 p-5 sm:order-1">
                  <div className="flex gap-0.5" aria-label="Rated 5 out of 5">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className="h-3.5 w-3.5 fill-primary"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-foreground">
                    &ldquo;My clients love the concepts. It saves me hours and helps me close
                    projects faster with clear proposals.&rdquo;
                  </p>
                  <div className="mt-4 flex items-center gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/demo/avatar-2.jpg"
                      alt="Arjun C."
                      className="h-8 w-8 rounded-full border border-border object-cover"
                    />
                    <div>
                      <p className="text-[11px] font-semibold text-foreground">Arjun C.</p>
                      <p className="text-[10px] text-muted-foreground">Interior Designer</p>
                    </div>
                  </div>
                </div>
                <div className="order-1 h-36 w-full overflow-hidden border-b border-border sm:order-2 sm:h-auto sm:w-1/2 sm:border-b-0 sm:border-l">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/demo/redesign/kitchen-after.webp"
                    alt="Redesigned kitchen"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border">
                <span className="px-3 py-1.5 text-[9px] font-semibold tracking-normal text-foreground">
                  Kitchen
                </span>
                <span
                  className="flex h-7 w-7 items-center justify-center border-l border-border text-foreground"
                  aria-hidden="true"
                >
                  →
                </span>
              </div>
            </div>

            {/* Green CTA + Bathroom */}
            <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-foreground text-white lg:col-span-5">
              <div className="flex flex-1">
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-2xl font-semibold leading-tight">
                    From
                    <br />
                    empty rooms
                    <br />
                    to dream spaces.
                  </p>
                  <div className="mt-auto flex items-center gap-2 pt-6">
                    <div className="flex -space-x-2">
                      {["/demo/avatar-1.jpg", "/demo/avatar-2.jpg", "/demo/avatar-3.jpg"].map(
                        (src) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={src}
                            src={src}
                            alt="Happy user"
                            className="h-7 w-7 rounded-full border border-white object-cover grayscale"
                          />
                        ),
                      )}
                    </div>
                    <div>
                      <p className="text-lg font-semibold leading-none">28,500+</p>
                      <p className="mt-0.5 text-[10px] text-white/70">happy users</p>
                    </div>
                  </div>
                </div>
                <div className="relative hidden w-1/2 sm:block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/demo/redesign/bath-after.webp"
                    alt="Redesigned bathroom"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute bottom-0 left-0 bg-card px-2 py-1 text-[9px] font-semibold tracking-normal text-foreground">
                    Bathroom
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-end border-t border-white/25 px-2 py-1">
                <span
                  className="flex h-7 w-7 items-center justify-center border border-white/50 text-white"
                  aria-hidden="true"
                >
                  →
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. HOW IT WORKS (FROM PHOTO TO YOUR DREAM SPACE) */}
      <section id="how-it-works" className="border-t border-border bg-background py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <span className="inline-block rounded-xl border border-border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground">
              A Simple, Guided Process
            </span>
            <h2 className="mt-5 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              From photo to <span className="text-foreground">your dream space.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl font-sans text-lg text-muted-foreground">
              A simple, guided process. No design experience needed.
            </p>
          </div>

          <div className="relative mt-16">
            {/* Connecting timeline */}
            <div
              className="absolute left-0 right-0 top-6 hidden h-px bg-foreground lg:block"
              aria-hidden="true"
            />

            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
              {/* Step 1 */}
              <div className="relative">
                <div className="relative z-10 flex h-12 w-14 items-center justify-center rounded-xl border border-border bg-accent text-xl font-semibold text-foreground">
                  01
                </div>
                <h3 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
                  Upload a photo
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Take or upload a clear photo of your room.
                </p>
                <div className="relative mt-5 rounded-xl border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/demo/redesign/living-before-unfinished.webp"
                    alt="Original room photo"
                    className="h-56 w-full object-cover"
                  />
                  <span className="absolute bottom-3 left-3 rounded-xl border border-border bg-card px-2 py-1 text-[10px] font-semibold tracking-normal text-foreground">
                    Original Photo
                  </span>
                  <span
                    className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center bg-foreground text-white"
                    aria-hidden="true"
                  >
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 16V4" />
                      <path d="m6 10 6-6 6 6" />
                      <path d="M4 20h16" />
                    </svg>
                  </span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative">
                <div className="relative z-10 flex h-12 w-14 items-center justify-center rounded-xl border border-border bg-card text-xl font-semibold text-foreground">
                  02
                </div>
                <h3 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
                  Add room details
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Enter room dimensions, choose a style and key details.
                </p>
                <div className="mt-5 rounded-xl border border-border bg-card p-4">
                  <p className="text-xs font-semibold text-foreground">Room size</p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {[
                      { label: "Length", value: "14" },
                      { label: "Width", value: "12" },
                      { label: "Height", value: "9" },
                    ].map((dim) => (
                      <div key={dim.label} className="rounded-xl border border-border px-2 py-1.5">
                        <p className="text-[10px] text-muted-foreground">{dim.label}</p>
                        <p className="text-sm font-semibold text-foreground">
                          {dim.value}{" "}
                          <span className="text-[10px] font-normal text-muted-foreground">ft</span>
                        </p>
                      </div>
                    ))}
                  </div>

                  <p className="mt-4 text-xs font-semibold text-foreground">Room type</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {["Living Room", "Bedroom", "Kitchen", "Bathroom"].map((type, i) => (
                      <span
                        key={type}
                        className={`border px-2 py-1 text-[10px] font-semibold ${
                          i === 0
                            ? "border-foreground bg-foreground text-white"
                            : "border-border bg-card text-foreground"
                        }`}
                      >
                        {type}
                      </span>
                    ))}
                  </div>

                  <p className="mt-4 text-xs font-semibold text-foreground">Style</p>
                  <div className="mt-2 grid grid-cols-4 gap-1.5">
                    {[
                      { name: "Modern", src: "/demo/redesign/hero-after-modern.webp" },
                      { name: "Minimal", src: "/demo/redesign/hero-after-minimal.webp" },
                      { name: "Boho", src: "/demo/redesign/hero-after-boho.webp" },
                      { name: "Classic", src: "/demo/redesign/hero-after-classic.webp" },
                    ].map((style) => (
                      <div
                        key={style.name}
                        className={`border ${style.name === "Modern" ? "border-primary" : "border-border"}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={style.src} alt={style.name} className="h-9 w-full object-cover" />
                        <p className="py-0.5 text-center text-[9px] font-semibold text-foreground">
                          {style.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative">
                <div className="relative z-10 flex h-12 w-14 items-center justify-center rounded-xl border border-border bg-card text-xl font-semibold text-foreground">
                  03
                </div>
                <h3 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
                  Generate designs
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Get multiple AI concepts in seconds.
                </p>
                <div className="relative mt-5">
                  <div className="relative px-4 pt-4">
                    {/* Stacked concept cards peeking behind the main image */}
                    <div
                      className="absolute left-0 top-6 h-[72%] w-2/3 rounded-xl border border-border bg-card"
                      aria-hidden="true"
                    />
                    <div
                      className="absolute right-0 top-3 h-[82%] w-2/3 rounded-xl border border-border bg-card"
                      aria-hidden="true"
                    />

                    <div className="relative z-10 rounded-xl border border-border bg-card p-1.5">
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/demo/redesign/hero-after-modern.webp"
                          alt="AI generated concept"
                          className="h-44 w-full object-cover"
                        />
                        <span className="absolute right-2 top-2 rounded-xl border border-border bg-accent px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-foreground">
                          AI Generated
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {[
                      "/demo/redesign/hero-after-modern.webp",
                      "/demo/redesign/hero-after-boho.webp",
                      "/demo/redesign/hero-after-classic.webp",
                    ].map((src) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={src}
                        src={src}
                        alt="AI concept variant"
                        className="h-12 w-full rounded-xl border border-border object-cover"
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="relative">
                <div className="relative z-10 flex h-12 w-14 items-center justify-center rounded-xl border border-border bg-card text-xl font-semibold text-foreground">
                  04
                </div>
                <h3 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
                  Refine &amp; save
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Use natural language to make changes and get cost guidance.
                </p>
                <div className="mt-5 rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
                    <p className="flex-1 text-[11px] leading-snug text-muted-foreground">
                      Make the walls sage green and add a floor lamp.
                    </p>
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-white"
                      aria-hidden="true"
                    >
                      →
                    </span>
                  </div>
                  <div className="mt-2 rounded-xl border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/demo/redesign/living-refined.webp"
                      alt="Same living room refined with sage walls and a floor lamp"
                      className="h-36 w-full object-cover"
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-border py-2 text-[11px] font-semibold tracking-normal text-foreground">
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 3h12v18l-6-4-6 4z" />
                    </svg>
                    <span>Save Design</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. TARGET AUDIENCE CARDS (HOMEOWNERS & PROFESSIONALS) */}
      <section id="homeowners" className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Card 1: For Homeowners */}
          <div className="relative overflow-hidden rounded-xl border border-border bg-card">
            <div
              className="absolute right-0 top-0 h-28 w-36 bg-accent sm:h-32 sm:w-44"
              aria-hidden="true"
            />
            <div className="relative grid gap-8 p-7 md:grid-cols-2 md:items-center md:p-8">
              <div className="flex flex-col">
                <span className="inline-block self-start rounded-xl border border-border bg-card px-3 py-1 text-[11px] font-semibold tracking-normal text-foreground">
                  For Homeowners
                </span>
                <h2 className="mt-5 text-3xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-4xl">
                  Design your
                  <br />
                  home, your way
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Perfect for homeowners, renters and DIYers who want to explore ideas before
                  spending.
                </p>

                <ul className="mt-6 space-y-3">
                  {[
                    "Get multiple AI redesign variations",
                    "Keep your existing furniture",
                    "Renter-friendly, no-construction ideas",
                    "See estimated costs and shopping list",
                    "Save, compare and share designs",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-foreground">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-xl border border-border bg-accent text-foreground">
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
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/sign-up"
                  className="mt-8 inline-flex w-fit items-center gap-4 rounded-xl border border-border bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all   hover:shadow-sm   active:shadow-none"
                >
                  <span>Start redesigning free</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>

              <div className="relative z-10">
                <div className="rounded-xl border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/demo/redesign/hero-after-boho.webp"
                    alt="Home interior redesign"
                    className="h-72 w-full object-cover"
                  />
                  <div className="flex items-center gap-2 border-t border-border bg-foreground px-3 py-2 text-[11px] font-semibold text-white">
                    <span className="text-accent" aria-hidden="true">
                      ✦
                    </span>
                    <span className="flex-1">Turn your space into something special</span>
                    <span aria-hidden="true">→</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: For Professionals */}
          <div
            id="professionals"
            className="relative overflow-hidden rounded-xl border border-border bg-card"
          >
            <div
              className="absolute right-0 top-0 h-28 w-36 bg-accent sm:h-32 sm:w-44"
              aria-hidden="true"
            />
            <div className="relative grid gap-8 p-7 md:grid-cols-2 md:items-center md:p-8">
              <div className="flex flex-col">
                <span className="inline-block self-start rounded-xl border border-border bg-card px-3 py-1 text-[11px] font-semibold tracking-normal text-foreground">
                  For Professionals
                </span>
                <h2 className="mt-5 text-3xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-4xl">
                  Win clients and
                  <br />
                  close projects faster
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Built for interior designers, remodelers and studios to create concepts, estimates
                  and proposals.
                </p>

                <ul className="mt-6 space-y-3">
                  {[
                    "Manage clients and projects",
                    "Collect client briefs with a public link",
                    "Generate branded design renders",
                    "Use your own pricing and rate card",
                    "Create editable estimates and proposals",
                    "Get client feedback and approvals",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-foreground">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center bg-foreground text-white">
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
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/sign-up?mode=pro"
                  className="mt-8 inline-flex w-fit items-center gap-4 rounded-xl border border-border bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all   hover:shadow-sm   active:shadow-none"
                >
                  <span>Explore Pro features</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>

              <div className="relative z-10">
                <div className="rounded-xl border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/demo/redesign/office-after.webp"
                    alt="Home office concept for a designer's client project"
                    className="h-72 w-full object-cover"
                  />
                  <div className="flex items-center gap-2 border-t border-border bg-foreground px-3 py-2 text-[11px] font-semibold text-white">
                    <svg
                      className="h-3.5 w-3.5 shrink-0 text-white"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <rect x="3" y="12" width="4" height="9" />
                      <rect x="10" y="7" width="4" height="14" />
                      <rect x="17" y="3" width="4" height="18" />
                    </svg>
                    <span className="flex-1">Create concepts that win clients</span>
                    <span aria-hidden="true">→</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. PRICING SECTION */}
      <PricingSection />

      {/* 9. FAQ SECTION */}
      <FAQSection />

      {/* 10. FINAL BOTTOM CTA BANNER */}
      <CtaBanner />
    </div>
  );
}
