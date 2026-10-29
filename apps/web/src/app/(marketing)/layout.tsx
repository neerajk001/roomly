import Link from "next/link";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#f7f4ed]">
      <header className="border-b border-[#e4dfd3] bg-[#f7f4ed]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="text-base font-semibold tracking-tight text-emerald-900">
            RoomDesigner
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-5 text-sm text-[#405048] md:flex">
            <Link href="/" className="hover:text-emerald-900">
              Home
            </Link>
            <Link href="/#homeowners" className="hover:text-emerald-900">
              For homeowners
            </Link>
            <Link href="/#professionals" className="hover:text-emerald-900">
              For professionals
            </Link>
            <Link href="/pricing" className="hover:text-emerald-900">
              Pricing
            </Link>
            <Link href="/#examples" className="hover:text-emerald-900">
              Examples
            </Link>
            <Link href="/#faq" className="hover:text-emerald-900">
              FAQ
            </Link>
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/sign-in" className="text-[#405048] hover:text-emerald-900">
              Log in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg bg-emerald-800 px-3 py-1.5 font-medium text-white hover:bg-emerald-900"
            >
              Get started free
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-[#e4dfd3] bg-[#f2eee4]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-xs text-[#6b776f]">
          <span>
            © {new Date().getFullYear()} RoomDesigner. AI-generated concept visuals. Not to scale.
          </span>
          <nav aria-label="Legal" className="flex flex-wrap gap-4">
            <Link href="/legal/terms">Terms</Link>
            <Link href="/legal/privacy">Privacy</Link>
            <Link href="/legal/cookies">Cookies</Link>
            <Link href="/legal/refunds">Refunds</Link>
            <a href="mailto:support@roomdesigner.example">Support</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
