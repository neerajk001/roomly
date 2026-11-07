import Link from "next/link";

export function WorkspaceSwitcher({ current }: { current: "HOME" | "PRO" }) {
  return (
    <nav
      aria-label="Design experience"
      className="flex flex-wrap gap-1 rounded-lg border border-current/20 p-1 text-xs"
    >
      <Link
        href="/app"
        aria-current={current === "HOME" ? "page" : undefined}
        className={`rounded-md px-3 py-2 ${current === "HOME" ? "bg-black text-white" : "hover:bg-black/5"}`}
      >
        Homeowner
      </Link>
      <Link
        href="/studio"
        aria-current={current === "PRO" ? "page" : undefined}
        className={`rounded-md px-3 py-2 ${current === "PRO" ? "bg-black text-white" : "hover:bg-black/5"}`}
      >
        Interior designer
      </Link>
    </nav>
  );
}
