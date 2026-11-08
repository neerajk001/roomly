import { BriefForm } from "@/components/brief/brief-form";
import { prisma } from "@roomdesigner/db";
import { getPublicBrief } from "@/server/services/briefs";
import { AppError } from "@/server/app-error";

export const metadata = {
  title: "Design brief",
  robots: { index: false, follow: false },
};

export default async function BriefPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let brief: Awaited<ReturnType<typeof getPublicBrief>> | null = null;
  let message = "This brief link is not valid.";
  try {
    brief = await getPublicBrief(prisma, token);
  } catch (error) {
    if (error instanceof AppError) {
      message =
        error.code === "EXPIRED"
          ? "This brief link has expired. Ask your designer for a new one."
          : message;
    }
  }

  if (brief === null) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-foreground">Brief link unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </div>
    );
  }

  if (brief.status !== "OPEN") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-foreground">Already submitted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This brief was already sent to {brief.brandName}. Thank you!
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-muted/30">
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: brief.brandColor ?? "#111827" }}
        aria-hidden="true"
      />
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
        <header className="space-y-1">
          <p className="text-xs tracking-normal text-muted-foreground">{brief.brandName}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Tell us about your room
          </h1>
          <p className="text-sm text-muted-foreground">
            A few questions and some photos. No account needed.
          </p>
        </header>
        <div className="rounded-xl rounded-xl border border-border bg-background p-5 shadow-sm">
          <BriefForm token={token} clientName={brief.clientName} brandName={brief.brandName} />
        </div>
        <p className="text-xs text-muted-foreground">
          Photos are stored without EXIF data. This page is not indexed.
        </p>
      </div>
    </div>
  );
}
