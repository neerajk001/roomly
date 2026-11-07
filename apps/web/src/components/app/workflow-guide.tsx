import Link from "next/link";

export function WorkflowGuide({ studio = false }: { studio?: boolean }) {
  const steps = studio
    ? [
        {
          href: "/studio/clients",
          title: "1. Client & brief",
          body: "Add a client and send a brief link to collect photos and requirements.",
        },
        {
          href: "/studio/projects/new",
          title: "2. Design & estimate",
          body: "Create a project, add rooms, generate concepts and build estimates.",
        },
        {
          href: "/studio/rate-cards",
          title: "Set up your rates",
          body: "Replace the starter prices before preparing a client estimate.",
        },
      ]
    : [
        {
          href: "/new",
          title: "1. Design your room",
          body: "Upload a photo, choose what to keep, set a budget and pick your style.",
        },
        {
          href: "/app/spaces",
          title: "2. Review & plan",
          body: "Open a room to compare concepts, edit them and explore costs and your shopping list.",
        },
        {
          href: "/app/spaces",
          title: "3. Share your ideas",
          body: "Open a project to create a share link and collect votes.",
        },
      ];
  return (
    <section
      aria-label={studio ? "Designer workflow" : "Homeowner workflow"}
      className="grid gap-3 sm:grid-cols-3"
    >
      {steps.map((step) => (
        <Link
          key={step.title}
          href={step.href}
          className="rounded-lg border border-current/20 bg-white p-4 transition-colors hover:bg-black/5"
        >
          <h2 className="text-sm font-semibold">{step.title} →</h2>
          <p className="mt-2 text-xs leading-relaxed opacity-70">{step.body}</p>
        </Link>
      ))}
    </section>
  );
}
