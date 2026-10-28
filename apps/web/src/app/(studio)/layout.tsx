import { signOutAction } from "@/app/(auth)/actions";
import { requireOnboarded, requireWorkspace } from "@/server/auth/session";
import Link from "next/link";

const navItems = [
  { href: "/studio", label: "Projects" },
  { href: "/settings", label: "Settings" },
];

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  await requireOnboarded();
  const { workspace, user } = await requireWorkspace();

  return (
    <div className="flex min-h-dvh bg-slate-50">
      <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white p-4 sm:block">
        <Link href="/studio" className="block text-base font-semibold tracking-tight text-slate-900">
          RoomDesigner
        </Link>
        <p className="mt-1 truncate text-xs text-slate-500">{workspace.name}</p>
        <nav aria-label="Studio" className="mt-6 space-y-1 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 border-t border-slate-200 pt-4">
          <p className="truncate text-xs text-slate-500">{user.email}</p>
          <form action={signOutAction} className="mt-2">
            <button type="submit" className="text-sm text-slate-600 hover:text-slate-900">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:hidden">
          <Link href="/studio" className="text-base font-semibold text-slate-900">
            Studio
          </Link>
          <Link href="/settings" className="text-sm text-slate-600">
            Settings
          </Link>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      </div>
    </div>
  );
}
