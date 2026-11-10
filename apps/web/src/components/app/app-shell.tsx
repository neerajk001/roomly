import { AccountMenu } from "./AccountMenu";
import { AppNav } from "@/components/app/app-nav";
import { getBalance, prisma } from "@roomdesigner/db";
import { requireOnboarded, requireWorkspace } from "@/server/auth/session";
import Link from "next/link";

function HouseIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
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

export async function AppShell({ children }: { children: React.ReactNode }) {
  await requireOnboarded();
  const { workspace, user } = await requireWorkspace();
  const credits = await getBalance(prisma, workspace.id);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex max-w-[1500px]">
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-sidebar px-5 py-7 lg:flex">
          <Link href="/app" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-foreground">
              <HouseIcon />
            </span>
            <span className="text-base font-semibold tracking-tight text-foreground">
              RoomDesigner
            </span>
          </Link>
          <AppNav variant="sidebar" />
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
            <div className="flex items-center gap-3">
              <Link
                href="/app"
                aria-label="RoomDesigner"
                className="flex items-center gap-2 lg:hidden"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-foreground">
                  <HouseIcon className="h-4 w-4" />
                </span>
                <span className="hidden text-sm font-semibold tracking-tight sm:inline">
                  RoomDesigner
                </span>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium">
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <ellipse cx="12" cy="6" rx="8" ry="3" />
                  <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
                  <path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
                </svg>
                {credits} credits
              </span>
              <Link
                href="/new"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-foreground hover:text-white"
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                New design
              </Link>
              <AccountMenu name={user.name} />
            </div>
          </header>

          <AppNav variant="mobile" />

          <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
