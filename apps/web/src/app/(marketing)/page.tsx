import Link from "next/link";
import { HeroInteractive } from "@/components/marketing/hero-interactive";
import { GallerySection } from "@/components/marketing/gallery-section";
import { PricingSection } from "@/components/marketing/pricing-section";
import { FAQSection } from "@/components/marketing/faq-section";
export default function LandingPage() {
  return (
    <div className="overflow-x-hidden bg-white text-foreground">
      <section
        id="product"
        className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24"
      >
        <div>
          <p className="text-sm font-medium text-muted-foreground">AI interior design</p>
          <h1 className="mt-4 text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Reimagine your room.<span className="block text-primary">Start with a photo.</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
            Explore three different design ideas for your space. Choose a favourite and refine it
            with a simple edit.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/sign-up"
              className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white"
            >
              Get started →
            </Link>
            <Link
              href="#examples"
              className="rounded-lg border border-border px-5 py-3 text-sm font-medium"
            >
              See examples
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Concept visuals, not construction plans.
          </p>
        </div>
        <div className="rounded-2xl bg-muted p-4">
          <HeroInteractive />
        </div>
      </section>
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-14">
        <h2 className="text-3xl font-semibold tracking-tight">From your photo to a fresh idea.</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {[
            { title: "1. Add your room", body: "Upload a photo and choose the room type." },
            {
              title: "2. Pick any must-haves",
              body: "Choose items you want, or let AI decide. Style choice is optional.",
            },
            {
              title: "3. Explore and refine",
              body: "Compare three concepts, edit your favourite and save or share it.",
            },
          ].map((step) => (
            <article key={step.title} className="rounded-xl bg-muted p-6">
              <h3 className="font-semibold">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </article>
          ))}
        </div>
      </section>
      <GallerySection />
      <section className="mx-auto grid max-w-6xl gap-6 px-6 py-14 sm:grid-cols-2">
        <article id="homeowners" className="rounded-2xl bg-muted p-7">
          <h2 className="text-2xl font-semibold">For your own home</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Start with your room as it is. Explore a new look, refine individual areas and plan your
            next steps when you are ready.
          </p>
        </article>
        <article id="professionals" className="rounded-2xl bg-muted p-7">
          <h2 className="text-2xl font-semibold">For client projects</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Keep briefs, concepts, estimates and proposals together. Share a proposal when it is
            ready for client review.
          </p>
          <Link
            href="/sign-up?mode=pro"
            className="mt-4 inline-block text-sm font-medium underline"
          >
            Open a design studio →
          </Link>
        </article>
      </section>
      <PricingSection />
      <FAQSection />
    </div>
  );
}
