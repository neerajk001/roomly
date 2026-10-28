"use server";

import { auth } from "@roomdesigner/auth/server";
import { isDevAuthBypassEnabled } from "@/server/auth/session";
import { getServerEnv } from "@roomdesigner/config/env";
import { isDisposableEmail } from "@roomdesigner/shared";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

export interface AuthFormState {
  error?: string;
  notice?: string;
  fieldErrors?: Record<string, string[]>;
}

const emailField = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .max(254)
  .pipe(z.email("Enter a valid email address."));

const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be at most 128 characters.");

const signUpSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80, "Name is too long."),
  email: emailField,
  password: passwordField,
});

const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required."),
});

const emailOnlySchema = z.object({ email: emailField });

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is missing."),
  password: passwordField,
});

function fieldErrorsOf(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] = [...(out[key] ?? []), issue.message];
  }
  return out;
}

/** Maps Better Auth errors to safe, non-enumerating messages. */
function authErrorMessage(error: unknown, fallback: string): string {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? (error as { status?: unknown }).status
      : undefined;
  if (status === 429) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  if (status === 403) {
    return "Verify your email before signing in. Check your inbox.";
  }
  return fallback;
}

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error) };
  }
  if (isDisposableEmail(parsed.data.email)) {
    return { error: "Please use a permanent email address." };
  }

  const env = getServerEnv();
  try {
    await auth.api.signUpEmail({
      body: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        callbackURL: "/onboarding",
      },
      headers: await headers(),
    });
  } catch (error) {
    return { error: authErrorMessage(error, "Could not create your account. Try again.") };
  }

  redirect(env.AUTH_REQUIRE_EMAIL_VERIFICATION ? "/verify-email?sent=1" : "/onboarding");
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error) };
  }

  try {
    await auth.api.signInEmail({
      body: { email: parsed.data.email, password: parsed.data.password },
      headers: await headers(),
    });
  } catch (error) {
    return { error: authErrorMessage(error, "Invalid email or password.") };
  }

  redirect("/app");
}

export async function requestPasswordResetAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = emailOnlySchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const env = getServerEnv();
  try {
    await auth.api.requestPasswordReset({
      body: {
        email: parsed.data.email,
        redirectTo: `${env.APP_URL}/reset-password`,
      },
      headers: await headers(),
    });
  } catch {
    // Never reveal whether the account exists.
  }
  return { notice: "If an account exists for that email, a reset link is on its way." };
}

export async function resetPasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error) };
  }

  try {
    await auth.api.resetPassword({
      body: { newPassword: parsed.data.password, token: parsed.data.token },
      headers: await headers(),
    });
  } catch (error) {
    return { error: authErrorMessage(error, "This reset link is invalid or has expired.") };
  }

  redirect("/sign-in?reset=1");
}

export async function resendVerificationAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = emailOnlySchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error) };
  }

  try {
    await auth.api.sendVerificationEmail({
      body: { email: parsed.data.email, callbackURL: "/onboarding" },
      headers: await headers(),
    });
  } catch {
    // Do not reveal account state.
  }
  return { notice: "If that email needs verification, a new link has been sent." };
}

export async function signOutAction(): Promise<void> {
  if (!isDevAuthBypassEnabled()) {
    await auth.api.signOut({ headers: await headers() });
  }
  redirect("/");
}
