import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/server/auth/session";
import { prisma } from "@roomdesigner/db";
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
      <div className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">
          Your workspace is still being prepared. Refresh in a moment.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <p className="text-lg font-semibold tracking-tight text-foreground">RoomDesigner</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome, {session.user.name}. One quick choice to set things up.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Set up your workspace</CardTitle>
            <CardDescription>You can change this later in settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <OnboardingWizard defaultCurrency={membership.workspace.currency} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
