"use client";

import Link from "next/link";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/#homeowners", label: "For Homeowners" },
  { href: "/#professionals", label: "For Professionals" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#examples", label: "Examples" },
  { href: "/#faq", label: "FAQ" },
] as const;

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-3 lg:flex-nowrap">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <svg
              className="h-7 w-7 text-foreground"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M3 10.4 12 2.5l9 7.9V21a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1z" />
            </svg>
            <span className="h-6 w-px bg-foreground/70" aria-hidden="true" />
            <span className="text-sm font-semibold tracking-tight text-foreground sm:text-xl">
              RoomDesigner
            </span>
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-6 lg:flex xl:gap-10">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2 text-sm font-medium sm:gap-4">
            <span className="hidden h-6 w-px bg-foreground/70 sm:block" aria-hidden="true" />
            <Link
              href="/sign-in"
              className="hidden text-foreground transition-colors hover:text-muted-foreground sm:block"
            >
              Log in
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-2.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:px-5 sm:text-sm"
            >
              <span>Get started free</span>
              <span aria-hidden="true">→</span>
            </Link>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-foreground lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((value) => !value)}
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                {open ? (
                  <>
                    <path d="M6 6l12 12" />
                    <path d="M18 6 6 18" />
                  </>
                ) : (
                  <>
                    <path d="M4 7h16" />
                    <path d="M4 12h16" />
                    <path d="M4 17h16" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {open ? (
          <div id="mobile-nav" className="mt-2 rounded-xl border border-border bg-card lg:hidden">
            <nav aria-label="Mobile" className="flex flex-col">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="border-b border-border px-5 py-3 text-sm font-medium text-muted-foreground last:border-b-0 hover:bg-foreground/[0.03] hover:text-foreground"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/sign-in"
                className="px-5 py-3 text-sm font-medium text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground sm:hidden"
                onClick={() => setOpen(false)}
              >
                Log in
              </Link>
            </nav>
          </div>
        ) : null}
      </div>
    </header>
  );
}
