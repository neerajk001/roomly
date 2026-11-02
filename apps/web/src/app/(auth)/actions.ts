"use server";

import { auth } from "@roomdesigner/auth/server";
import { isDevAuthBypassEnabled } from "@/server/auth/session";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function signOutAction(): Promise<void> {
  if (!isDevAuthBypassEnabled()) {
    await auth.api.signOut({ headers: await headers() });
  }
  redirect("/");
}
