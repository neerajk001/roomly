import { signOutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { requireOnboarded, requireWorkspace } from "@/server/auth/session";
import Link from "next/link";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireOnboarded();
  const { workspace } = await requireWorkspace();

  return (
    <div className="flex min-h-dvh flex-col bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/app" className="text-base font-semibold tracking-tight text-foreground">
              RoomDesigner
            </Link>
            <span className="hidden text-sm text-muted-foreground sm:inline">{workspace.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/settings">Settings</Link>
            </Button>
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
