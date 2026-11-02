"use client";

import { Field } from "@/components/auth/field";
import { authClient } from "@roomdesigner/auth/client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Step = "email" | "code";

function errorMessage(
  error: { message?: string; status?: number } | null | undefined,
  fallback: string,
): string {
  if (error === null || error === undefined) return fallback;
  if (error.status === 429) return "Too many attempts. Wait a minute and try again.";
  return error.message ?? fallback;
}

export function EmailOtpForm({
  mode,
  callbackURL,
}: {
  mode: "sign-in" | "sign-up";
  callbackURL: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const sendCode = async (nextEmail: string): Promise<boolean> => {
    const { error: sendError } = await authClient.emailOtp.sendVerificationOtp({
      email: nextEmail,
      type: "sign-in",
    });
    if (sendError !== null) {
      setError(errorMessage(sendError, "Could not send the code. Try again."));
      return false;
    }
    setNotice(`We sent a 6-digit code to ${nextEmail}.`);
    return true;
  };

  const onEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const data = new FormData(event.currentTarget);
    const nextEmail = String(data.get("email") ?? "").trim();
    const nextName = String(data.get("name") ?? "").trim();
    if (nextEmail === "") {
      setError("Enter your email address.");
      return;
    }
    setPending(true);
    try {
      const sent = await sendCode(nextEmail);
      if (sent) {
        setEmail(nextEmail);
        setName(nextName);
        setStep("code");
      }
    } catch {
      setError("Could not send the code. Try again.");
    } finally {
      setPending(false);
    }
  };

  const onCodeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const data = new FormData(event.currentTarget);
    const otp = String(data.get("otp") ?? "").trim();
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setPending(true);
    try {
      const { error: verifyError } = await authClient.signIn.emailOtp({
        email,
        otp,
        ...(name === "" ? {} : { name }),
      });
      if (verifyError !== null) {
        setError(errorMessage(verifyError, "That code is invalid or expired."));
        return;
      }
      router.push(callbackURL);
      router.refresh();
    } catch {
      setError("Could not verify the code. Try again.");
    } finally {
      setPending(false);
    }
  };

  if (step === "code") {
    return (
      <form onSubmit={onCodeSubmit} className="space-y-4" noValidate>
        {error !== null && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {notice !== null && (
          <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {notice}
          </p>
        )}
        <Field
          label="Verification code"
          name="otp"
          autoComplete="one-time-code"
          inputMode="numeric"
          maxLength={6}
          pattern="[0-9]{6}"
          required
          hint="Check your inbox and spam folder."
        />
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Verifying..." : mode === "sign-up" ? "Create account" : "Sign in"}
        </button>
        <div className="flex items-center justify-between gap-3 text-sm">
          <button
            type="button"
            className="text-slate-600 underline hover:text-slate-900"
            onClick={() => {
              setStep("email");
              setError(null);
              setNotice(null);
            }}
          >
            Use a different email
          </button>
          <button
            type="button"
            disabled={pending}
            className="text-slate-600 underline hover:text-slate-900 disabled:opacity-60"
            onClick={() => {
              setPending(true);
              setError(null);
              setNotice(null);
              void sendCode(email)
                .catch(() => {
                  setError("Could not send the code. Try again.");
                })
                .finally(() => {
                  setPending(false);
                });
            }}
          >
            Resend code
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={onEmailSubmit} className="space-y-4" noValidate>
      {error !== null && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {mode === "sign-up" && (
        <Field label="Name" name="name" autoComplete="name" required />
      )}
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Sending code..." : "Continue with email"}
      </button>
      <p className="text-xs text-slate-500">
        We&apos;ll email you a one-time code. No password needed.
      </p>
    </form>
  );
}
