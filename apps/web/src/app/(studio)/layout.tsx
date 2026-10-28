import { signOutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { requireOnboarded, requireWorkspace } from "@/server/auth/session";
import Link from "next/link";

const navItems = [
  { href: "/studio", label: "Projects" },
  { href: "/studio/clients", label: "Clients" },
  { href: "/studio/rate-cards", label: "Rate cards" },
  { href: "/settings", label: "Settings" },
];

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  await requireOnboarded();
  const { workspace, user } = await requireWorkspace();

  return (
    <div className="flex min-h-dvh bg-muted/30">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-background p-4 sm:flex sm:flex-col">
        <Link href="/studio" className="block text-base font-semibold tracking-tight text-foreground">
          RoomDesigner
        </Link>
        <p className="mt-1 truncate text-xs text-muted-foreground">{workspace.name}</p>
        <nav aria-label="Studio" className="mt-6 flex-1 space-y-1 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border pt-4">
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <form action={signOutAction} className="mt-2">
            <Button type="submit" variant="ghost" size="sm" className="px-0">
              Sign out
            </Button>
          </form>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3 sm:hidden">
          <Link href="/studio" className="text-base font-semibold text-foreground">
            Studio
          </Link>
          <nav aria-label="Studio" className="flex items-center gap-3 text-sm">
            <Link href="/studio/clients" className="text-muted-foreground">
              Clients
            </Link>
            <Link href="/studio/rate-cards" className="text-muted-foreground">
              Rates
            </Link>
            <Link href="/settings" className="text-muted-foreground">
              Settings
            </Link>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      </div>
    </div>
  );
}
