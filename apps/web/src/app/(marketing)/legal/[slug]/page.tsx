import Link from "next/link";

const SECTIONS = [
  {
    slug: "terms",
    title: "Terms of Service",
    body: "RoomDesigner provides AI-generated concept visuals and rough estimates. Renders are concept visuals, not to scale, and are not a binding quote. Estimates are illustrative unless produced by your designer from their own rate card. Do not upload images you do not have the right to use.",
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    body: "We store account details, uploaded photos, prompts, renders and project data to provide the service. Photos are re-encoded to remove EXIF/GPS. We use processors for hosting, storage, email and (when enabled) the AI image provider. You can export your data or delete your account in Settings.",
  },
  {
    slug: "cookies",
    title: "Cookie notice",
    body: "We use strictly necessary cookies for signing in and for share-link voting. No advertising cookies are used. Public share/brief/proposal pages are not indexed.",
  },
  {
    slug: "refunds",
    title: "Refund policy",
    body: "Credits are consumed when a render starts. Failed renders are refunded automatically. Paid plans and credit packs are handled by the billing provider once billing goes live; contact support for billing questions.",
  },
] as const;

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const section = SECTIONS.find((entry) => entry.slug === slug);
  if (section === undefined) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-2xl font-semibold">Legal</h1>
        <ul className="mt-4 space-y-2 text-sm">
          {SECTIONS.map((entry) => (
            <li key={entry.slug}>
              <Link className="underline" href={`/legal/${entry.slug}`}>
                {entry.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">{section.title}</h1>
      <p className="text-sm text-muted-foreground">{section.body}</p>
      <p className="text-xs text-muted-foreground">
        Draft copy pending legal review. Rights/takedown contact: support@roomdesigner.example.
      </p>
    </div>
  );
}
