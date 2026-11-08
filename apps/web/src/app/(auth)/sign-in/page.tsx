import { EmailOtpForm } from "@/components/auth/email-otp-form";
import { GoogleButton } from "@/components/auth/google-button";
import { getServerEnv } from "@roomdesigner/config/env";
import Link from "next/link";

export const metadata = { title: "Sign in" };

export default async function SignInPage() {
  const env = getServerEnv();
  const googleEnabled =
    env.GOOGLE_CLIENT_ID !== undefined && env.GOOGLE_CLIENT_SECRET !== undefined;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in with a one-time code sent to your email.
        </p>
      </div>
      <EmailOtpForm mode="sign-in" callbackURL="/app" />
      {googleEnabled && (
        <>
          <div className="flex items-center gap-3 text-xs tracking-normal text-slate-400">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
          <GoogleButton callbackURL="/app" />
        </>
      )}
      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/sign-up" className="font-medium text-foreground underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
