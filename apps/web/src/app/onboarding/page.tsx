import { ModeCards } from "@/components/onboarding/mode-cards";
import { prisma } from "@roomdesigner/db";
import { requireSession } from "@/server/auth/session";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Welcome" };

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
      <div className="flex min-h-dvh items-center justify-center bg-[#f5f1e8] px-4">
        <p className="text-sm text-[#6b776f]">Preparing your workspace… refresh in a moment.</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#f5f1e8] px-4 py-8 text-[#1f2a24]">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-3xl border border-[#e2ddd0] bg-[#fbf9f3] p-5 shadow-sm sm:p-8">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eee8db] pb-4">
            <Link href="/" className="text-base font-semibold tracking-tight">
              🌿 RoomDesigner
            </Link>
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-wide text-[#7a857d]">
              <span>Welcome · 1 of 2</span>
              <span className="h-1.5 w-28 overflow-hidden rounded-full bg-[#e4dfd3]">
                <span className="block h-full w-1/2 bg-[#2f5233]" />
              </span>
            </div>
          </header>

          <div className="mt-6 max-w-2xl">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              What brings you to RoomDesigner?
            </h1>
            <p className="mt-2 text-sm text-[#5b665f]">
              We&apos;ll shape your workspace around the way you design.
            </p>
          </div>

          <div className="mt-6">
            <ModeCards
              defaultCurrency={membership.workspace.currency}
              defaultUnitSystem={membership.workspace.unitSystem}
            />
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-[#7a857d]">
          Step 1 choose your workspace · Step 2 see the right dashboard · Step 3 start a design
        </p>
      </div>
    </div>
  );
}
