import { ModeCards } from "@/components/onboarding/mode-cards";
import { prisma } from "@roomdesigner/db";
import { requireSession } from "@/server/auth/session";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Welcome" };

function HouseIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

export default async function OnboardingPage() {
  const session = await requireSession();
  if (session.user.onboardedAt != null) {
    redirect(session.user.mode === "PRO" ? "/studio" : "/app");
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
  if (membership === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-card px-4">
        <p className="text-sm text-muted-foreground">
          Preparing your workspace… refresh in a moment.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background px-5 py-12 text-foreground">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-foreground">
                <HouseIcon />
              </span>
              <span className="text-lg font-semibold tracking-tight text-foreground">
                RoomDesigner
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold tracking-normal text-muted-foreground">
                Choose your experience
              </span>
              <span className="h-2 w-32 overflow-hidden bg-foreground/10">
                <span className="block h-full w-1/2 bg-primary" />
              </span>
            </div>
          </header>

          <div className="mt-8 max-w-2xl">
            <h1 className="font-sans text-4xl font-semibold leading-[1.03] tracking-tight text-foreground sm:text-5xl">
              What brings you to RoomDesigner?
            </h1>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              We&apos;ll shape your workspace around the way you design.
            </p>
          </div>

          <div className="mt-8">
            <ModeCards
              defaultCurrency={membership.workspace.currency}
              defaultUnitSystem={membership.workspace.unitSystem}
            />
          </div>
        </div>

        {/* Step indicator */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-3 text-xs font-medium text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-white">
              1
            </span>
            Choose your workspace
          </span>
          <span className="h-px w-10 bg-foreground/30" aria-hidden="true" />
          <span className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-[11px] font-semibold text-foreground">
              2
            </span>
            See the right dashboard
          </span>
          <span className="h-px w-10 bg-foreground/30" aria-hidden="true" />
          <span className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-[11px] font-semibold text-foreground">
              3
            </span>
            Start a design
          </span>
        </div>
      </div>
    </div>
  );
}
