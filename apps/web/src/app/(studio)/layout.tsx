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
    <div className="min-h-dvh bg-[#f5f1e8] text-[#1f2a24]">
      <div className="mx-auto flex max-w-[1500px]">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-[#e4dfd3] bg-[#fbf9f3] px-4 py-5 lg:flex">
          <Link href="/studio" className="text-base font-semibold tracking-tight">
            🌿 RoomDesigner <span className="text-xs font-normal text-[#7a857d]">Studio</span>
          </Link>
          <p className="mt-1 truncate text-xs text-[#7a857d]">{workspace.name}</p>
          <StudioNav />
          <div className="mt-auto space-y-2 border-t border-[#e4dfd3] pt-4">
            <p className="truncate text-xs text-[#7a857d]">{user.email}</p>
            <form action={signOutAction}>
              <button type="submit" className="text-sm text-[#405048] underline">
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4dfd3] bg-[#fbf9f3] px-4 py-3">
            <div className="flex items-center gap-3">
              <Link href="/studio" className="text-base font-semibold lg:hidden">
                🌿 Studio
              </Link>
              <WorkspaceSwitcher current="PRO" />
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/studio/projects/new"
                className="rounded-lg bg-[#2f5233] px-3 py-2 text-xs text-white"
              >
                New project
              </Link>
              <span className="rounded-full border border-[#e4dfd3] bg-white px-3 py-1 text-xs">
                ◉ {credits} credits
              </span>
              <Link
                href="/studio/settings"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2f5233] text-xs font-semibold text-white"
                aria-label="Studio settings"
              >
                {initial}
              </Link>
            </div>
          </header>

          <StudioNav mobile />

          <main className="mx-auto w-full max-w-5xl px-4 py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
