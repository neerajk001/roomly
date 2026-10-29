import Link from "next/link";

const GALLERY = [
  { room: "Living room", style: "Modern · Warm · Calm", img: "living", category: "Living" },
  { room: "Bedroom", style: "Minimal · Clean · Calm", img: "bedroom", category: "Bedroom" },
  { room: "Kitchen", style: "Modern · Functional · Bright", img: "kitchen", category: "Kitchen" },
  { room: "Home office", style: "Productive · Stylish · Minimal", img: "office", category: "Home office" },
  { room: "Dining room", style: "Elegant · Modern · Earthy", img: "dining", category: "Dining" },
  { room: "Bathroom", style: "Spa-like · Clean · Premium", img: "bath", category: "Bathroom" },
];

const FAQ = [
  {
    q: "Are the designs realistic or just concept visuals?",
    a: "Renders are AI-generated concept visuals. They are not to scale and not a binding quote. Room dimensions drive estimates only — they are never sent to the image model.",
  },
  {
    q: "Can I keep my existing furniture?",
    a: "Yes. Add a keep list during the wizard and those items are locked in the prompt. Renter mode goes further and limits changes to paint, textiles, lighting, furniture and decor.",
  },
  {
    q: "Do you change windows, doors or the floor plan?",
    a: "No. Structure is locked in every prompt: windows, doors, walls, ceiling, floor layout and camera angle must stay as photographed.",
  },
  {
    q: "How do costs and credits work?",
    a: "Each generated image costs credits. Failed renders are refunded automatically. The cost range in your project is a rough estimate from illustrative rates — actual prices vary by location and provider.",
  },
  {
    q: "I'm a designer — can I send proposals?",
    a: "Studio mode covers clients, public brief links, your own rate card, editable estimates and a branded proposal the client can approve online.",
  },
];

export default function LandingPage() {
  return (
    <div className="bg-[#f7f4ed] text-[#1f2a24]">
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-12 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#d8d2c4] bg-white/70 px-3 py-1 text-xs font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-700" /> AI interior design
          </span>
          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Reimagine your room.
            <br />
            <span className="text-emerald-800">Before you spend a fortune.</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-[#4b5a51]">
            Upload a photo, choose a style and get concept visuals with cost guidance. For
            homeowners, renters and design professionals. Your room&apos;s structure stays exactly as
            photographed.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/sign-up"
              className="rounded-lg bg-emerald-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-900"
            >
              Try your first redesign →
            </Link>
            <a
              href="#how-it-works"
              className="rounded-lg border border-[#d8d2c4] bg-white px-5 py-2.5 text-sm font-medium hover:bg-white/80"
            >
              See how it works
            </a>
          </div>
          <p className="mt-3 text-xs text-[#6b776f]">Free plan · No card required</p>
        </div>

        <div className="relative">
          <div className="overflow-hidden rounded-2xl border border-[#d8d2c4] bg-white shadow-xl">
            <div className="grid grid-cols-2">
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element -- static marketing asset */}
                <img src="/demo/living-before.jpg" alt="Room before redesign" className="h-full w-full object-cover" />
                <figcaption className="sr-only">Before</figcaption>
              </figure>
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element -- static marketing asset */}
                <img src="/demo/living-after.jpg" alt="AI concept visual after redesign" className="h-full w-full object-cover" />
                <figcaption className="sr-only">Concept visual</figcaption>
              </figure>
            </div>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white px-3 py-1 text-xs font-medium shadow">
              ↔ Compare
            </div>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {["Modern", "Japandi", "Minimal", "Classic"].map((style) => (
              <span
                key={style}
                className="rounded-md border border-[#d8d2c4] bg-white px-2 py-1.5 text-center text-[11px]"
              >
                {style}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Capability strip */}
      <section className="border-y border-[#e4dfd3] bg-[#f2eee4] py-6">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 text-xs sm:grid-cols-4">
          {[
            ["Upload your room", "A simple photo and optional sizes"],
            ["Get concept visuals", "Multiple options in seconds"],
            ["Refine with chat", "Change colours, furniture, style"],
            ["See costs", "Rough range and shopping list"],
          ].map(([title, body], index) => (
            <div key={title} className="flex gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#d8d2c4] bg-white text-[11px]">
                {index + 1}
              </span>
              <div>
                <p className="font-medium">{title}</p>
                <p className="mt-0.5 text-[#6b776f]">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Gallery */}
      <section id="examples" className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center">
          <span className="rounded-full border border-[#d8d2c4] bg-white px-3 py-1 text-[11px] uppercase tracking-wide text-[#6b776f]">
            Real spaces, real transformations
          </span>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">See what&apos;s possible</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-[#6b776f]">
            From empty rooms to fully furnished concepts. Every visual keeps the room&apos;s
            architecture intact.
          </p>
        </div>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GALLERY.map((item) => (
            <li key={item.img} className="overflow-hidden rounded-xl border border-[#d8d2c4] bg-white">
              <div className="grid grid-cols-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- static marketing asset */}
                <img src={`/demo/${item.img}-before.jpg`} alt={`${item.room} before`} className="h-36 w-full object-cover" />
                {/* eslint-disable-next-line @next/next/no-img-element -- static marketing asset */}
                <img src={`/demo/${item.img}-after.jpg`} alt={`${item.room} AI concept visual`} className="h-36 w-full object-cover" />
              </div>
              <div className="border-t border-[#eee8db] px-3 py-2">
                <p className="text-sm font-medium">{item.room}</p>
                <p className="text-xs text-[#6b776f]">{item.style}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-center text-[11px] text-[#8a938c]">
          Concept visuals. Not to scale. Illustrative examples.
        </p>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <span className="rounded-full border border-[#d8d2c4] px-3 py-1 text-[11px] uppercase tracking-wide text-[#6b776f]">
              How it works
            </span>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">
              From photo to your next space
            </h2>
            <p className="mt-2 text-sm text-[#6b776f]">A simple, guided process.</p>
          </div>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Upload a photo", "One clear photo of the room works best."],
              ["Add details", "Sizes are optional — skip if you don't know."],
              ["Generate concepts", "Pick a style and get several options."],
              ["Refine & save", "Chat edits, favorites, cost range and shopping list."],
            ].map(([title, body], index) => (
              <li key={title} className="rounded-xl border border-[#e4dfd3] bg-[#faf8f2] p-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-800 text-xs font-medium text-white">
                  {index + 1}
                </span>
                <p className="mt-3 text-sm font-medium">{title}</p>
                <p className="mt-1 text-xs leading-5 text-[#6b776f]">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Audiences */}
      <section id="homeowners" className="mx-auto grid max-w-6xl gap-4 px-4 py-16 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#d8d2c4] bg-[#eef1e8] p-6">
          <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] uppercase tracking-wide">
            For homeowners &amp; renters
          </span>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">Design your home your way</h2>
          <ul className="mt-4 space-y-2 text-sm text-[#405048]">
            {[
              "Multiple AI concept variations",
              "Keep your existing furniture and room structure",
              "Renter-safe changes only, when you want",
              "Rough cost range and shopping list",
              "Share results and compare favorites",
            ].map((item) => (
              <li key={item}>✓ {item}</li>
            ))}
          </ul>
          <Link
            href="/sign-up"
            className="mt-6 inline-block rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-900"
          >
            Start designing free →
          </Link>
        </div>

        <div id="professionals" className="rounded-2xl border border-[#d8d2c4] bg-[#f3ede3] p-6">
          <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] uppercase tracking-wide">
            For professionals
          </span>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            Win clients and close projects faster
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-[#405048]">
            {[
              "Clients, projects and public brief links",
              "Your own rate card and editable estimates",
              "Branded proposals the client can approve online",
              "Pro workspaces: no platform watermark",
              "Share galleries with client votes",
            ].map((item) => (
              <li key={item}>✓ {item}</li>
            ))}
          </ul>
          <Link
            href="/sign-up"
            className="mt-6 inline-block rounded-lg border border-emerald-800 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-50"
          >
            Explore studio mode →
          </Link>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="rounded-full border border-[#d8d2c4] px-3 py-1 text-[11px] uppercase tracking-wide text-[#6b776f]">
                Simple pricing
              </span>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">Plans for every type of user</h2>
              <p className="mt-1 text-sm text-[#6b776f]">
                Start free. Prices and plans launch with billing — shown here as indicative only.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Free", "Concept renders with a watermark, rough cost range, share links."],
              ["Home", "For homeowners and renters: more credits, higher quality."],
              ["Pro", "For individual designers: briefs, rate cards, proposals, PDF."],
              ["Studio", "For growing studios: more credits, more seats, priority."],
            ].map(([name, body], index) => (
              <div
                key={name}
                className={`rounded-xl border p-5 ${
                  index === 2 ? "border-emerald-800 bg-emerald-800 text-white" : "border-[#d8d2c4] bg-[#faf8f2]"
                }`}
              >
                <p className="text-sm font-medium">{name}</p>
                <p className={`mt-1 text-xs ${index === 2 ? "text-emerald-100" : "text-[#6b776f]"}`}>
                  {name === "Free" ? "Included" : "Price announced at launch"}
                </p>
                <p className={`mt-3 text-xs leading-5 ${index === 2 ? "text-emerald-50" : "text-[#4b5a51]"}`}>
                  {body}
                </p>
                <Link
                  href={name === "Free" ? "/sign-up" : "/pricing"}
                  className={`mt-4 inline-block rounded-md px-3 py-1.5 text-xs font-medium ${
                    index === 2
                      ? "bg-white text-emerald-900"
                      : "border border-[#d8d2c4] bg-white hover:bg-white/80"
                  }`}
                >
                  {name === "Free" ? "Get started free" : "See plans"}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-16">
        <div className="text-center">
          <span className="rounded-full border border-[#d8d2c4] bg-white px-3 py-1 text-[11px] uppercase tracking-wide text-[#6b776f]">
            Frequently asked questions
          </span>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">Got questions? We&apos;ve got answers.</h2>
        </div>
        <div className="mt-6 divide-y divide-[#e4dfd3] rounded-xl border border-[#d8d2c4] bg-white">
          {FAQ.map((item) => (
            <details key={item.q} className="group p-4">
              <summary className="cursor-pointer list-none text-sm font-medium marker:hidden">
                {item.q}
              </summary>
              <p className="mt-2 text-sm leading-6 text-[#6b776f]">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 pb-16">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 rounded-2xl bg-emerald-900 p-8 text-white sm:flex-row sm:items-center">
          <div>
            <p className="text-sm uppercase tracking-wide text-emerald-200">Get started</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Your next room redesign is just a photo away.
            </h2>
            <p className="mt-1 text-xs text-emerald-100">
              Concept visuals, not to scale. No card required.
            </p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <Link
              href="/sign-up"
              className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-emerald-900 hover:bg-emerald-50"
            >
              Get started free →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
