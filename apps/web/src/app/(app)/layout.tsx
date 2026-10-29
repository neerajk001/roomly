import { signOutAction } from "@/app/(auth)/actions";
import { getBalance, prisma } from "@roomdesigner/db";
import { requireOnboarded, requireWorkspace } from "@/server/auth/session";
import Link from "next/link";

const NAV = [
  { href: "/app", label: "Home", icon: "⌂" },
  { href: "/app#spaces", label: "My spaces", icon: "▢" },
  { href: "/app#saved", label: "Saved", icon: "♡" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireOnboarded();
  const { workspace, user } = await requireWorkspace();
  const credits = await getBalance(prisma, workspace.id);
  const initial = (user.name.trim()[0] ?? "R").toUpperCase();

  return (
    <div className="min-h-dvh bg-[#f5f1e8] text-[#1f2a24]">
      <div className="mx-auto flex max-w-[1500px]">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-[#e4dfd3] bg-[#fbf9f3] px-4 py-5 lg:flex">
          <Link href="/app" className="text-base font-semibold tracking-tight">
            🌿 RoomDesigner
          </Link>
          <p className="mt-1 truncate text-xs text-[#7a857d]">{workspace.name}</p>
          <nav aria-label="Home" className="mt-6 space-y-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                  item.href === "/app"
                    ? "bg-[#e7ece0] font-medium text-[#2f5233]"
                    : "text-[#405048] hover:bg-[#f0ece2]"
                }`}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
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
              <Link href="/app" className="text-base font-semibold lg:hidden">
                🌿 RoomDesigner
              </Link>
              <span className="hidden rounded-lg border border-[#e4dfd3] bg-white px-3 py-1.5 text-sm sm:inline">
                {workspace.type === "STUDIO" ? "Studio workspace" : "Home workspace"} ▾
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-[#e4dfd3] bg-white px-3 py-1 text-xs">
                ◉ {credits} credits
              </span>
              <Link
                href="/settings"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2f5233] text-xs font-semibold text-white"
                aria-label="Account settings"
              >
                {initial}
              </Link>
            </div>
          </header>

          <nav aria-label="Home" className="flex gap-2 overflow-x-auto border-b border-[#e4dfd3] bg-[#fbf9f3] px-4 py-2 lg:hidden">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-full border border-[#e4dfd3] px-3 py-1 text-xs text-[#405048]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <main className="mx-auto w-full max-w-5xl px-4 py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
