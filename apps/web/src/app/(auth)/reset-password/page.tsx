import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import Link from "next/link";

export const metadata = { title: "Set a new password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  if (token === undefined || token === "") {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-slate-900">Reset link is invalid</h1>
        <p className="text-sm text-slate-600">
          {error !== undefined
            ? "This reset link has expired or was already used."
            : "This page needs a valid reset link."}
        </p>
        <Link
          href="/forgot-password"
          className="inline-block text-sm font-medium text-slate-900 underline"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-900">Set a new password</h1>
        <p className="text-sm text-slate-600">Choose a new password for your account.</p>
      </div>
      <ResetPasswordForm token={token} />
    </div>
  );
}
