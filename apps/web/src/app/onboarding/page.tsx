import { signOutAction } from "@/app/(auth)/actions";
import { requireSession } from "@/server/auth/session";
import { redirect } from "next/navigation";

export const metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const session = await requireSession();
  if (session.user.onboardedAt != null) {
    redirect(session.user.mode === "PRO" ? "/studio" : "/app");
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Welcome, {session.user.name}</h1>
        <p className="mt-2 text-sm text-slate-600">
          The setup wizard is being finished. Your workspace is ready —{" "}
          <a href="/sign-in" className="underline">
            check back shortly
          </a>
          .
        </p>
        <form action={signOutAction} className="mt-6">
          <button type="submit" className="text-sm text-slate-600 underline hover:text-slate-900">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
