import { EmailOtpForm } from "@/components/auth/email-otp-form";
import { GoogleButton } from "@/components/auth/google-button";
import { getServerEnv } from "@roomdesigner/config/env";
import Link from "next/link";

export const metadata = { title: "Sign in" };

export default async function SignInPage() {
  const env = getServerEnv();
  const googleEnabled = env.GOOGLE_CLIENT_ID !== undefined && env.GOOGLE_CLIENT_SECRET !== undefined;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-900">Welcome back</h1>
        <p className="text-sm text-slate-600">
          Sign in with a one-time code sent to your email.
        </p>
      </div>
      <EmailOtpForm mode="sign-in" callbackURL="/app" />
      {googleEnabled && (
        <>
          <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            or
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <GoogleButton callbackURL="/app" />
        </>
      )}
      <p className="text-center text-sm text-slate-600">
        New here?{" "}
        <Link href="/sign-up" className="font-medium text-slate-900 underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
