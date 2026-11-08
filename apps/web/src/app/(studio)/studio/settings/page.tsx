import { StudioSettingsForm } from "@/components/studio/studio-settings-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@roomdesigner/db";
import { presignGet } from "@roomdesigner/storage";
import { requireWorkspace } from "@/server/auth/session";
import { getStudioProfile } from "@/server/services/studio";

export const metadata = { title: "Studio settings" };

export default async function StudioSettingsPage() {
  const { user, workspace } = await requireWorkspace();
  const profile = await getStudioProfile(prisma, { userId: user.id, workspaceId: workspace.id });
  const logoUrl = profile.logoStorageKey !== null ? await presignGet(profile.logoStorageKey) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Studio settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Branding and contact details used on briefs and proposals.
        </p>
      </div>

      {logoUrl !== null && (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- signed URL */}
          <img
            src={logoUrl}
            alt="Studio logo"
            className="h-12 w-auto rounded rounded-xl border border-border"
          />
          <span className="text-xs text-muted-foreground">Current logo</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Shown to clients on public pages.</CardDescription>
        </CardHeader>
        <CardContent>
          <StudioSettingsForm
            profile={{
              name: profile.name,
              brandColor: profile.brandColor,
              currency: profile.currency,
              unitSystem: profile.unitSystem,
              contactEmail: profile.contactEmail,
              contactPhone: profile.contactPhone,
              defaultTerms: profile.defaultTerms,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
