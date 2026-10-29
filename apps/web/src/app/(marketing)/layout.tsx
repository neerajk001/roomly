import Link from "next/link";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
            RoomDesigner
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/sign-in" className="text-slate-600 hover:text-slate-900">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-md bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-800"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap gap-4 px-4 py-6 text-xs text-muted-foreground">
          <Link href="/legal/terms">Terms</Link>
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/cookies">Cookies</Link>
          <Link href="/legal/refunds">Refunds</Link>
          <a href="mailto:support@roomdesigner.example">Support</a>
          <span>AI-generated concept visuals. Not to scale.</span>
        </div>
      </footer>
    </div>
  );
}
