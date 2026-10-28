import { getSession } from "@/server/auth/session";
import { redirect } from "next/navigation";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (session !== null) {
    redirect(session.user.mode === "PRO" ? "/studio" : "/app");
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="mb-8 text-center text-lg font-semibold tracking-tight text-slate-900">
          RoomDesigner
        </p>
        <main className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">{children}</main>
      </div>
    </div>
  );
}
