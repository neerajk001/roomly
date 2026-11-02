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
    <header className="sticky top-0 z-50 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center justify-between gap-4 border border-black bg-white px-5 py-2.5">
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <svg className="h-7 w-7 text-black" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M3 10.4 12 2.5l9 7.9V21a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1z" />
            </svg>
            <span className="h-6 w-px bg-black/70" aria-hidden="true" />
            <span className="text-xl font-extrabold tracking-tight text-black">
              RoomDesigner
            </span>
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-6 lg:flex xl:gap-10">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-black/70 underline-offset-4 transition-colors hover:text-black hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-4 text-sm font-medium">
            <span className="hidden h-6 w-px bg-black/70 sm:block" aria-hidden="true" />
            <Link
              href="/sign-in"
              className="hidden text-black transition-colors hover:text-black/60 sm:block"
            >
              Log in
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 border border-black bg-[#FFD400] px-4 py-2 text-[11px] font-extrabold uppercase tracking-wide text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
            >
              <span>Get started free</span>
              <span aria-hidden="true">→</span>
            </Link>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center border border-black text-black lg:hidden"
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
          <div id="mobile-nav" className="mt-2 border border-black bg-white lg:hidden">
            <nav aria-label="Mobile" className="flex flex-col">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="border-b border-black/15 px-5 py-3 text-sm font-medium text-black/70 last:border-b-0 hover:bg-black/[0.03] hover:text-black"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/sign-in"
                className="px-5 py-3 text-sm font-medium text-black/70 hover:bg-black/[0.03] hover:text-black sm:hidden"
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
