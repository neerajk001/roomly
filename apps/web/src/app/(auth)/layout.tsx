import { getSession } from "@/server/auth/session";
import { redirect } from "next/navigation";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (session !== null) {
    redirect(session.user.mode === "PRO" ? "/studio" : "/app");
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-5 py-16">
      <div className="w-full max-w-sm">
        <p className="mb-8 text-center text-lg font-semibold tracking-tight text-foreground">
          RoomDesigner
        </p>
        <main className="rounded-2xl border border-border bg-card p-8 shadow-sm">{children}</main>
      </div>
    </div>
  );
}
