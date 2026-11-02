import { EmailOtpForm } from "@/components/auth/email-otp-form";
import { GoogleButton } from "@/components/auth/google-button";
import { getServerEnv } from "@roomdesigner/config/env";
import Link from "next/link";

export const metadata = { title: "Create account" };

export default async function SignUpPage() {
  const env = getServerEnv();
  const googleEnabled = env.GOOGLE_CLIENT_ID !== undefined && env.GOOGLE_CLIENT_SECRET !== undefined;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-900">Create your account</h1>
        <p className="text-sm text-slate-600">
          Start designing in a few minutes. We&apos;ll verify your email with a one-time code.
        </p>
      </div>
      <EmailOtpForm mode="sign-up" callbackURL="/onboarding" />
      {googleEnabled && (
        <>
          <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            or
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <GoogleButton callbackURL="/onboarding" />
        </>
      )}
      <p className="text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-slate-900 underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
