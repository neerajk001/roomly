"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/app", label: "Home", icon: "home" },
  { href: "/app/spaces", label: "My spaces", icon: "spaces" },
  { href: "/app/inspiration", label: "Inspiration", icon: "inspiration" },
  { href: "/app/saved", label: "Saved", icon: "saved" },
  { href: "/settings", label: "Settings", icon: "home" },
] as const;

type NavItem = (typeof NAV)[number];

function NavIcon({ name }: { name: NavItem["icon"] }) {
  const common = {
    className: "h-4 w-4 shrink-0",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case "spaces":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
        </svg>
      );
    case "inspiration":
      return (
        <svg {...common}>
          <path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.4 1 2.5h6c0-1.1.3-1.8 1-2.5A6 6 0 0 0 12 3Z" />
          <line x1="9" y1="19" x2="15" y2="19" />
        </svg>
      );
    case "saved":
      return (
        <svg {...common}>
          <path d="M6 3h12v18l-6-4-6 4z" />
        </svg>
      );
  }
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app";
  if (href === "/app/spaces" && (pathname === "/new" || pathname.startsWith("/app/projects")))
    return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({ variant }: { variant: "sidebar" | "mobile" }) {
  const pathname = usePathname();

  if (variant === "mobile") {
    return (
      <nav
        aria-label="Home"
        className="flex flex-wrap gap-2 border-b border-black bg-white px-4 py-2 lg:hidden"
      >
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-1.5 whitespace-nowrap border px-3 py-1 text-xs transition-colors ${
                active
                  ? "border-black bg-[#1f4fff] font-semibold text-white"
                  : "border-black bg-white text-black hover:bg-black/5"
              }`}
            >
              <NavIcon name={item.icon} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="Home" className="mt-8 space-y-1">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
              active ? "bg-[#1f4fff] font-semibold text-white" : "text-black hover:bg-black/5"
            }`}
          >
            <NavIcon name={item.icon} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
