import Link from "next/link";
import { signOutAction } from "@/app/(auth)/actions";

export function AccountMenu({ name, studio = false }: { name: string; studio?: boolean }) {
  return (
    <details className="relative">
      <summary
        aria-label="Account menu"
        className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background [&::-webkit-details-marker]:hidden"
      >
        {(name.trim()[0] ?? "R").toUpperCase()}
      </summary>
      <nav
        aria-label="Account"
        className="absolute right-0 top-11 z-50 w-60 space-y-1 rounded-xl border border-border bg-card p-2 shadow-lg"
      >
        <p className="truncate px-3 py-2 text-sm font-semibold">{name}</p>
        <Link className="block rounded-lg px-3 py-2 text-sm hover:bg-muted" href="/settings">
          Account settings
        </Link>
        <Link className="block rounded-lg px-3 py-2 text-sm hover:bg-muted" href="/studio/settings">
          Studio setup
        </Link>
        <Link
          className="block rounded-lg px-3 py-2 text-sm hover:bg-muted"
          href="/studio/rate-cards"
        >
          Rate cards
        </Link>
        <Link
          className="block rounded-lg px-3 py-2 text-sm hover:bg-muted"
          href={studio ? "/app" : "/studio"}
        >
          {studio ? "Switch to homeowner" : "Switch to designer"}
        </Link>
        <Link className="block rounded-lg px-3 py-2 text-sm hover:bg-muted" href="/#faq">
          Help
        </Link>
        <form action={signOutAction}>
          <button
            className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
            type="submit"
          >
            Sign out
          </button>
        </form>
      </nav>
    </details>
  );
}
