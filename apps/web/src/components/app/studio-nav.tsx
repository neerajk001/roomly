"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/studio", label: "Projects & proposals" },
  { href: "/studio/clients", label: "Clients & briefs" },
  { href: "/studio/rate-cards", label: "Rate cards" },
  { href: "/studio/settings", label: "Studio settings" },
  { href: "/settings", label: "Account settings" },
];

export function StudioNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Studio"
      className={
        mobile
          ? "flex flex-wrap gap-2 border-b border-[#e4dfd3] bg-[#fbf9f3] px-4 py-2 lg:hidden"
          : "mt-6 space-y-1"
      }
    >
      {items.map((item) => {
        const active =
          item.href === "/studio"
            ? pathname === "/studio" || pathname.startsWith("/studio/projects/")
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`${mobile ? "inline-flex" : "flex"} min-h-10 items-center rounded-lg px-3 py-2 text-sm ${active ? "bg-[#e7ece0] font-semibold text-[#2f5233]" : "text-[#405048] hover:bg-[#f0ece2]"}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
