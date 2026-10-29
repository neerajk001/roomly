import Link from "next/link";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#f7f4ed] text-[#1f2a24]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#e4dfd3] bg-[#f7f4ed]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#23533b] text-white shadow-sm transition-transform group-hover:scale-105">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </span>
            <span className="text-base font-bold tracking-tight text-[#1f2a24]">
              RoomDesigner
            </span>
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-7 text-xs font-medium text-[#4a584e] lg:flex">
            <Link href="/" className="hover:text-[#23533b] transition-colors">
              Home
            </Link>
            <Link href="/#homeowners" className="hover:text-[#23533b] transition-colors">
              For Homeowners
            </Link>
            <Link href="/#professionals" className="hover:text-[#23533b] transition-colors">
              For Professionals
            </Link>
            <Link href="/#pricing" className="hover:text-[#23533b] transition-colors">
              Pricing
            </Link>
            <Link href="/#examples" className="hover:text-[#23533b] transition-colors">
              Examples
            </Link>
            <Link href="/#faq" className="hover:text-[#23533b] transition-colors">
              FAQ
            </Link>
          </nav>

          <div className="flex items-center gap-4 text-xs font-medium">
            <Link href="/sign-in" className="text-[#4a584e] hover:text-[#23533b] transition-colors">
              Log in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full bg-[#23533b] px-4 py-2 font-medium text-white shadow-sm hover:bg-[#1a402d] active:scale-95 transition-all"
            >
              Get started free
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-[#e4dfd3] bg-[#f7f4ed] py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col items-center justify-between gap-6 border-b border-[#e8e2d4] pb-8 md:flex-row">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#23533b] text-white">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </span>
              <span className="text-sm font-bold tracking-tight text-[#1f2a24]">
                RoomDesigner
              </span>
            </Link>

            <nav aria-label="Footer Nav" className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#5f6d63]">
              <Link href="/" className="hover:text-[#23533b]">Home</Link>
              <Link href="/#homeowners" className="hover:text-[#23533b]">Features</Link>
              <Link href="/#pricing" className="hover:text-[#23533b]">Pricing</Link>
              <Link href="/#examples" className="hover:text-[#23533b]">Examples</Link>
              <Link href="/#faq" className="hover:text-[#23533b]">FAQ</Link>
              <Link href="/#how-it-works" className="hover:text-[#23533b]">Blog</Link>
            </nav>

            {/* Social Icons */}
            <div className="flex items-center gap-4 text-[#5f6d63]">
              <a href="https://x.com" target="_blank" rel="noreferrer" aria-label="X / Twitter" className="hover:text-[#23533b] transition-colors">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram" className="hover:text-[#23533b] transition-colors">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube" className="hover:text-[#23533b] transition-colors">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-4 text-xs text-[#7c887e] sm:flex-row">
            <p>© {new Date().getFullYear()} RoomDesigner. All rights reserved. Renders are concept visuals.</p>
            <div className="flex gap-4">
              <Link href="/legal/terms" className="hover:text-[#23533b]">Terms</Link>
              <Link href="/legal/privacy" className="hover:text-[#23533b]">Privacy</Link>
              <a href="mailto:support@roomdesigner.example" className="hover:text-[#23533b]">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
