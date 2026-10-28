import { ResendVerificationForm } from "@/components/auth/resend-verification-form";
import Link from "next/link";

export const metadata = { title: "Verify your email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-900">Check your inbox</h1>
        <p className="text-sm text-slate-600">
          We sent you a verification link. Open it to activate your account.
        </p>
      </div>
      {sent === "1" && (
        <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Verification email sent.
        </p>
      )}
      <ResendVerificationForm />
      <p className="text-center text-sm text-slate-600">
        Already verified?{" "}
        <Link href="/sign-in" className="font-medium text-slate-900 underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
