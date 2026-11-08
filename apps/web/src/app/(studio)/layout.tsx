import { signOutAction } from "@/app/(auth)/actions";
import { getBalance, prisma } from "@roomdesigner/db";
import { requireOnboarded, requireWorkspace } from "@/server/auth/session";
import Link from "next/link";
import { StudioNav } from "@/components/app/studio-nav";
import { WorkspaceSwitcher } from "@/components/app/workspace-switcher";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  await requireOnboarded();
  const { workspace, user } = await requireWorkspace();
  const credits = await getBalance(prisma, workspace.id);
  const initial = (user.name.trim()[0] ?? "S").toUpperCase();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex max-w-[1500px]">
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-sidebar px-5 py-7 lg:flex">
          <Link href="/studio" className="text-base font-semibold tracking-tight">
            🌿 RoomDesigner{" "}
            <span className="text-xs font-normal text-muted-foreground">Studio</span>
          </Link>
          <p className="mt-1 truncate text-xs text-muted-foreground">{workspace.name}</p>
          <StudioNav />
          <div className="mt-auto space-y-2 border-t border-border pt-4">
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            <form action={signOutAction}>
              <button type="submit" className="text-sm text-muted-foreground underline">
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
            <div className="flex items-center gap-3">
              <Link href="/studio" className="text-base font-semibold lg:hidden">
                🌿 Studio
              </Link>
              <WorkspaceSwitcher current="PRO" />
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/studio/projects/new"
                className="rounded-lg bg-primary px-3 py-2 text-xs text-white"
              >
                New project
              </Link>
              <span className="rounded-full border border-border bg-card px-3 py-1 text-xs">
                ◉ {credits} credits
              </span>
              <Link
                href="/studio/settings"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white"
                aria-label="Studio settings"
              >
                {initial}
              </Link>
            </div>
          </header>

          <StudioNav mobile />

          <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
