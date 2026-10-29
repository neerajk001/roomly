import Link from "next/link";
import { HeroInteractive } from "@/components/marketing/hero-interactive";
import { GallerySection } from "@/components/marketing/gallery-section";
import { PricingSection } from "@/components/marketing/pricing-section";
import { FAQSection } from "@/components/marketing/faq-section";
import { CtaBanner } from "@/components/marketing/cta-banner";

export default function LandingPage() {
  return (
    <div className="bg-[#f7f4ed] text-[#1f2a24] overflow-x-hidden">
      {/* 1. HERO SECTION */}
      <section className="relative mx-auto max-w-6xl px-4 pt-12 pb-16 lg:pt-16 lg:pb-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left Column: Headline & CTA */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#d8d2c4] bg-white/80 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#45534b] shadow-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
              AI Interior Design
            </span>

            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl lg:text-[54px] lg:leading-[1.15] text-[#1a2620]">
              Reimagine your space.
              <br />
              <span className="font-serif italic font-normal text-[#23533b]">
                Before you spend a rupee.
              </span>
            </h1>

            <p className="mt-5 max-w-md text-sm leading-relaxed text-[#4b5a51] sm:text-base">
              Upload a photo, choose a style, and get stunning AI-generated room redesigns with cost guidance. For homeowners, renters and professional designers.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 rounded-full bg-[#23533b] px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-[#1a402d] active:scale-95 transition-all"
              >
                <span>Try your first redesign</span>
                <span className="text-base">→</span>
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-full border border-[#d8d2c4] bg-white/90 px-5 py-3 text-sm font-medium text-[#1f2a24] shadow-xs hover:bg-white hover:border-[#b8b09f] transition-all"
              >
                <svg className="h-4 w-4 fill-emerald-800 text-emerald-800" viewBox="0 0 24 24">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span>Watch how it works</span>
              </a>
            </div>

            <p className="mt-3.5 text-xs text-[#707c74]">
              Free plan · No card required
            </p>

            {/* Social proof avatars */}
            <div className="mt-8 flex items-center gap-3 pt-6 border-t border-[#e2dcd0]">
              <div className="flex -space-x-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/demo/avatar-1.jpg"
                  alt="User avatar"
                  className="h-9 w-9 rounded-full border-2 border-white object-cover shadow-xs"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/demo/avatar-2.jpg"
                  alt="User avatar"
                  className="h-9 w-9 rounded-full border-2 border-white object-cover shadow-xs"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/demo/avatar-3.jpg"
                  alt="User avatar"
                  className="h-9 w-9 rounded-full border-2 border-white object-cover shadow-xs"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/demo/avatar-4.jpg"
                  alt="User avatar"
                  className="h-9 w-9 rounded-full border-2 border-white object-cover shadow-xs"
                />
              </div>
              <div className="text-xs leading-snug">
                <p className="font-bold text-[#1f2a24]">28,500+ spaces reimagined</p>
                <p className="text-[#65736a]">by homeowners and designers.</p>
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
      <section className="border-y border-[#e2dcd0] bg-[#f0ebd9]/60 py-6">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 md:grid-cols-4">
          {[
            {
              title: "Upload your room",
              body: "A simple photo and dimensions",
              icon: (
                <svg className="h-5 w-5 text-emerald-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              ),
            },
            {
              title: "Get AI redesigns",
              body: "Multiple concepts in seconds",
              icon: (
                <svg className="h-5 w-5 text-emerald-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                </svg>
              ),
            },
            {
              title: "Refine with chat",
              body: "Change colors, furniture, style",
              icon: (
                <svg className="h-5 w-5 text-emerald-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              ),
            },
            {
              title: "See costs & som",
              body: "Estimated cost and shopping list",
              icon: (
                <svg className="h-5 w-5 text-emerald-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              ),
            },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d8d2c4] bg-white shadow-xs">
                {item.icon}
              </span>
              <div>
                <p className="text-xs font-semibold text-[#1f2a24]">{item.title}</p>
                <p className="mt-0.5 text-[11px] text-[#65736a]">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. LOGOS / TRUST STRIP */}
      <section className="py-12 border-b border-[#e6e0d2] bg-[#f7f4ed]">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#758279]">
            Trusted by <span className="text-[#1f2a24]">28,500+ happy users</span> · From homeowners to professional designers
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-8 opacity-75 grayscale sm:gap-14">
            <span className="text-base font-serif font-black tracking-tighter text-[#3a483f]">Forbes</span>
            <span className="text-sm font-mono font-bold tracking-widest text-[#3a483f]">TECHRADAR</span>
            <span className="text-sm font-serif font-bold tracking-tight text-[#3a483f]">THE TIMES OF INDIA</span>
            <span className="text-xs font-sans font-black tracking-wider text-[#3a483f]">THE ECONOMIC TIMES</span>
            <span className="text-sm font-sans font-bold tracking-normal text-[#3a483f]">yourstory</span>
            <span className="text-sm font-sans font-bold tracking-tight text-[#3a483f]">P Product Hunt</span>
          </div>
        </div>
      </section>

      {/* 4. SEE WHAT'S POSSIBLE (INTERACTIVE BEFORE/AFTER GALLERY) */}
      <GallerySection />

      {/* 5. TESTIMONIALS */}
      <section className="border-t border-[#e2dcd0] bg-[#f2eee4]/50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <span className="inline-flex items-center rounded-full border border-[#d8d2c4] bg-white px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#6b776f]">
              Loved by Homeowners and Designers
            </span>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl text-[#1f2a24]">
              Beautiful spaces. Happier people.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                quote: "I redesigned my entire living room in minutes. The results were stunning and the cost estimate really helped!",
                name: "Priya S.",
                role: "Homeowner, Mumbai",
                avatar: "/demo/avatar-1.jpg",
              },
              {
                quote: "My clients love the concepts. It saves me hours and helps me close projects faster with clear proposals.",
                name: "Arjun C.",
                role: "Interior Designer",
                avatar: "/demo/avatar-2.jpg",
              },
              {
                quote: "Super easy to use. The chat edits make it so flexible. I could try different styles until it felt perfect.",
                name: "Neha R.",
                role: "Renter, Bangalore",
                avatar: "/demo/avatar-3.jpg",
              },
            ].map((testi) => (
              <div
                key={testi.name}
                className="flex flex-col justify-between rounded-2xl border border-[#d8d2c4] bg-white p-6 shadow-xs hover:shadow-md transition-shadow"
              >
                <div>
                  {/* 5 Stars */}
                  <div className="flex gap-1 text-amber-500 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="h-4 w-4 fill-amber-400 text-amber-400" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-sm font-medium leading-relaxed text-[#2a3830]">
                    &ldquo;{testi.quote}&rdquo;
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-3 border-t border-[#eee8db] pt-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={testi.avatar}
                    alt={testi.name}
                    className="h-10 w-10 rounded-full object-cover border border-[#d8d2c4]"
                  />
                  <div>
                    <p className="text-xs font-bold text-[#1f2a24]">{testi.name}</p>
                    <p className="text-[11px] text-[#6b776f]">{testi.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. HOW IT WORKS (FROM PHOTO TO YOUR DREAM SPACE) */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <span className="inline-flex items-center rounded-full border border-[#d8d2c4] bg-[#faf8f2] px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#6b776f]">
              A Simple, Guided Process
            </span>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl text-[#1f2a24]">
              From photo to your dream space
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#6b776f]">
              A simple, guided process. No design experience needed.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Step 1 */}
            <div className="flex flex-col rounded-2xl border border-[#e2dcd0] bg-[#faf8f2] p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#23533b] text-xs font-semibold text-white">
                  1
                </span>
                <h3 className="text-sm font-semibold text-[#1f2a24]">Upload a photo</h3>
              </div>
              <p className="mt-2 text-xs leading-5 text-[#65736a]">
                Take or upload a clear photo of your room.
              </p>
              <div className="mt-5 flex-1 overflow-hidden rounded-xl border border-dashed border-[#c8c0b0] bg-white p-3 flex flex-col items-center justify-center min-h-[140px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/demo/hero-before.jpg"
                  alt="Upload preview"
                  className="h-20 w-full rounded-lg object-cover"
                />
                <span className="mt-2 text-[10px] text-[#808c83] font-medium">Original photo</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col rounded-2xl border border-[#e2dcd0] bg-[#faf8f2] p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#23533b] text-xs font-semibold text-white">
                  2
                </span>
                <h3 className="text-sm font-semibold text-[#1f2a24]">Add details</h3>
              </div>
              <p className="mt-2 text-xs leading-5 text-[#65736a]">
                Enter room dimensions, doors and windows.
              </p>
              <div className="mt-5 flex-1 overflow-hidden rounded-xl border border-[#d8d2c4] bg-white p-3 flex flex-col items-center justify-center min-h-[140px]">
                <div className="relative w-full h-24 border border-emerald-800/40 rounded bg-emerald-50/30 flex items-center justify-center">
                  <span className="text-[10px] font-mono font-medium text-emerald-950">14&apos; x 12&apos; Bedroom</span>
                  <span className="absolute top-1 left-2 text-[8px] text-[#6b776f]">Door ◩</span>
                  <span className="absolute bottom-1 right-2 text-[8px] text-[#6b776f]">Window 🪟</span>
                </div>
                <span className="mt-2 text-[10px] text-[#808c83] font-medium">Lock layout &amp; size</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col rounded-2xl border border-[#e2dcd0] bg-[#faf8f2] p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#23533b] text-xs font-semibold text-white">
                  3
                </span>
                <h3 className="text-sm font-semibold text-[#1f2a24]">Generate designs</h3>
              </div>
              <p className="mt-2 text-xs leading-5 text-[#65736a]">
                Get multiple AI concepts in seconds.
              </p>
              <div className="mt-5 flex-1 overflow-hidden rounded-xl border border-[#d8d2c4] bg-white p-2 min-h-[140px]">
                <div className="grid grid-cols-2 gap-1.5 h-24">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/demo/hero-after-modern.jpg" alt="Modern" className="h-full w-full object-cover rounded" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/demo/hero-after-minimal.jpg" alt="Minimal" className="h-full w-full object-cover rounded" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/demo/hero-after-boho.jpg" alt="Boho" className="h-full w-full object-cover rounded" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/demo/hero-after-classic.jpg" alt="Classic" className="h-full w-full object-cover rounded" />
                </div>
                <span className="mt-1.5 block text-center text-[10px] text-[#808c83] font-medium">Multiple styles</span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col rounded-2xl border border-[#e2dcd0] bg-[#faf8f2] p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#23533b] text-xs font-semibold text-white">
                  4
                </span>
                <h3 className="text-sm font-semibold text-[#1f2a24]">Refine &amp; save</h3>
              </div>
              <p className="mt-2 text-xs leading-5 text-[#65736a]">
                Use natural language to make changes and get cost guidance.
              </p>
              <div className="mt-5 flex-1 overflow-hidden rounded-xl border border-[#d8d2c4] bg-white p-3 flex flex-col justify-center min-h-[140px]">
                <div className="rounded-lg bg-[#f0ebd9] p-2 text-[10px] text-[#2a3830] flex items-center justify-between gap-1 shadow-xs">
                  <span>&ldquo;Make the walls sage green and add a floor lamp.&rdquo;</span>
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#23533b] text-white text-[9px]">
                    ✓
                  </span>
                </div>
                <span className="mt-2 text-center text-[10px] text-[#808c83] font-medium">Instant adjustments</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. TARGET AUDIENCE CARDS (HOMEOWNERS & PROFESSIONALS) */}
      <section id="homeowners" className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Card 1: For Homeowners */}
          <div className="flex flex-col justify-between overflow-hidden rounded-3xl border border-[#d8d2c4] bg-[#eef2ea] p-8 shadow-xs">
            <div>
              <span className="inline-flex rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#45534b]">
                For Homeowners
              </span>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#1a2620] sm:text-3xl">
                Design your home, your way
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-[#4e5c53]">
                Perfect for homeowners, renters and DIYers who want to explore ideas before spending.
              </p>

              <div className="mt-6 grid sm:grid-cols-2 gap-4 items-center">
                <ul className="space-y-3 text-xs text-[#303e35]">
                  {[
                    "Get multiple AI redesign variations",
                    "Keep your existing furniture",
                    "Renter-friendly, no-construction ideas",
                    "See estimated costs and shopping list",
                    "Save, compare and share designs",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-white text-[10px]">
                        ✓
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="relative overflow-hidden rounded-2xl shadow-md border border-white/60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/demo/homeowner-feature.jpg"
                    alt="Home interior redesign"
                    className="h-44 w-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-black/60 backdrop-blur-xs px-2.5 py-1 text-[10px] text-white">
                    ✨ Your dream space is closer than you think
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <Link
                href="/sign-up"
                className="inline-block rounded-xl bg-[#23533b] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#1a402d] transition-all"
              >
                Start redesigning free →
              </Link>
            </div>
          </div>

          {/* Card 2: For Professionals */}
          <div id="professionals" className="flex flex-col justify-between overflow-hidden rounded-3xl border border-[#d8d2c4] bg-[#f5ede1] p-8 shadow-xs">
            <div>
              <span className="inline-flex rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#544638]">
                For Professionals
              </span>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#1a2620] sm:text-3xl">
                Win clients and close projects faster
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-[#5a4f43]">
                Built for interior designers, remodelers and studios to create concepts, estimates and proposals.
              </p>

              <div className="mt-6 grid sm:grid-cols-2 gap-4 items-center">
                <ul className="space-y-3 text-xs text-[#303e35]">
                  {[
                    "Manage clients and projects",
                    "Collect client briefs with a public link",
                    "Generate branded design renders",
                    "Use your own pricing and rate card",
                    "Create editable estimates and proposals",
                    "Get client feedback and approvals",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-white text-[10px]">
                        ✓
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="relative overflow-hidden rounded-2xl shadow-md border border-white/60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/demo/pro-feature.jpg"
                    alt="Professional studio flat lay"
                    className="h-44 w-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-black/60 backdrop-blur-xs px-2.5 py-1 text-[10px] text-white">
                    📐 Concept to client approval in one place
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <Link
                href="/sign-up?mode=pro"
                className="inline-block rounded-xl border border-[#23533b] bg-white px-5 py-2.5 text-xs font-semibold text-[#23533b] shadow-xs hover:bg-emerald-50 transition-all"
              >
                Explore Pro features →
              </Link>
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
