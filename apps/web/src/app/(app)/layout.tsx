import { signOutAction } from "@/app/(auth)/actions";
import { requireOnboarded, requireWorkspace } from "@/server/auth/session";
import Link from "next/link";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireOnboarded();
  const { workspace, user } = await requireWorkspace();

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/app" className="text-base font-semibold tracking-tight text-slate-900">
              RoomDesigner
            </Link>
            <span className="text-sm text-slate-500">{workspace.name}</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/settings" className="text-slate-600 hover:text-slate-900">
              Settings
            </Link>
            <form action={signOutAction}>
              <button type="submit" className="text-slate-600 hover:text-slate-900">
                Sign out
              </button>
            </form>
            <span className="hidden text-slate-400 sm:inline" aria-hidden="true">
              {user.email}
            </span>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
