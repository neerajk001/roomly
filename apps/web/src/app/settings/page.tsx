import { signOutAction } from "@/app/(auth)/actions";
import { ProfileForm } from "@/components/settings/profile-form";
import { WorkspacePreferencesForm } from "@/components/settings/workspace-preferences-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOnboarded, requireWorkspace } from "@/server/auth/session";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireOnboarded();
  const { workspace, user, role } = await requireWorkspace();

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-2">
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

      <form action={signOutAction}>
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </div>
  );
}
