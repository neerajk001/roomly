import { signOutAction } from "@/app/(auth)/actions";
import { DataControls } from "@/components/settings/data-controls";
import { ProfileForm } from "@/components/settings/profile-form";
import { WorkspacePreferencesForm } from "@/components/settings/workspace-preferences-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOnboarded, requireWorkspace } from "@/server/auth/session";
import Link from "next/link";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireOnboarded();
  const { workspace, user, role } = await requireWorkspace();

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-2">
      <nav aria-label="Back to workspace" className="flex flex-wrap gap-4 text-sm underline">
        <Link href="/app">Homeowner workspace</Link>
        <Link href="/studio">Interior designer studio</Link>
      </nav>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Account and workspace preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Signed in as {user.email} · role {role}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm defaultName={user.name} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>{workspace.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <WorkspacePreferencesForm
            mode={user.mode}
            currency={workspace.currency}
            unitSystem={workspace.unitSystem}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your data</CardTitle>
          <CardDescription>Export or permanently delete your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataControls />
        </CardContent>
      </Card>

      <form action={signOutAction}>
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </div>
  );
}
