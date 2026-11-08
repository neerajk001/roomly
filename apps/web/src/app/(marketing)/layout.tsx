import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/marketing-header";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <MarketingHeader />

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col items-center justify-between gap-6 border-b border-border pb-6 md:flex-row">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-foreground">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </span>
              <span className="h-6 w-px bg-foreground/40" aria-hidden="true" />
              <span className="text-lg font-semibold tracking-tight text-foreground">
                RoomDesigner
              </span>
            </Link>

            <nav
              aria-label="Footer Nav"
              className="flex flex-wrap items-center justify-center gap-6 text-sm text-foreground"
            >
              <Link href="/" className="hover:text-muted-foreground">
                Home
              </Link>
              <Link href="/#homeowners" className="hover:text-muted-foreground">
                Features
              </Link>
              <Link href="/#pricing" className="hover:text-muted-foreground">
                Pricing
              </Link>
              <Link href="/#examples" className="hover:text-muted-foreground">
                Examples
              </Link>
              <Link href="/#faq" className="hover:text-muted-foreground">
                FAQ
              </Link>
              <Link href="/#how-it-works" className="hover:text-muted-foreground">
                Blog
              </Link>
            </nav>

            {/* Social Icons */}
            <div className="flex items-center gap-5 text-foreground">
              <a
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
                aria-label="X / Twitter"
                className="hover:text-muted-foreground transition-colors"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="hover:text-muted-foreground transition-colors"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                aria-label="YouTube"
                className="hover:text-muted-foreground transition-colors"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
            </div>
          </div>

          <div className="mt-5 flex flex-col items-center justify-between gap-3 text-[11px] text-muted-foreground sm:flex-row">
            <p>
              © {new Date().getFullYear()} RoomDesigner. All rights reserved. Renders are concept
              visuals.
            </p>
            <div className="flex gap-6">
              <Link href="/legal/terms" className="hover:text-foreground">
                Terms
              </Link>
              <Link href="/legal/privacy" className="hover:text-foreground">
                Privacy
              </Link>
              <a href="mailto:support@roomdesigner.example" className="hover:text-foreground">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
