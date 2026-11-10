"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const NAV = [
  { href: "/app", label: "My rooms" },
  { href: "/app/saved", label: "Saved" },
];
export function AppNav({ variant }: { variant: "sidebar" | "mobile" }) {
  const path = usePathname();
  return (
    <nav
      aria-label="Home"
      className={
        variant === "mobile"
          ? "flex gap-2 border-b border-border bg-card px-4 py-2 lg:hidden"
          : "mt-8 space-y-1"
      }
    >
      {NAV.map((item) => {
        const active =
          item.href === "/app"
            ? path === "/app" ||
              path === "/app/spaces" ||
              path === "/new" ||
              path.startsWith("/app/projects")
            : path.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              "block rounded-lg px-4 py-2.5 text-sm " +
              (active
                ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground"
                : "text-muted-foreground hover:bg-muted")
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
