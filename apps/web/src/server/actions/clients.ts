"use server";

import { prisma } from "@roomdesigner/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireWorkspace } from "../auth/session";
import { AppError } from "../app-error";
import { createClient, softDeleteClient, updateClient } from "../services/clients";

export interface ClientFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

function parseClient(formData: FormData) {
  return {
    name: formData.get("name"),
    email: formData.get("email") ?? undefined,
    phone: formData.get("phone") ?? undefined,
    notes: formData.get("notes") ?? undefined,
  };
}

export async function createClientAction(
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const { user, workspace } = await requireWorkspace();
  try {
    const client = await createClient(
      prisma,
      { userId: user.id, workspaceId: workspace.id },
      parseClient(formData) as never,
    );
    revalidatePath("/studio/clients");
    redirect(`/studio/clients/${client.id}`);
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function updateClientAction(
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const clientId = z.string().min(1).safeParse(formData.get("clientId"));
  if (!clientId.success) return { error: "Invalid request." };
  const { user, workspace } = await requireWorkspace();
  try {
    await updateClient(
      prisma,
      { userId: user.id, workspaceId: workspace.id },
      clientId.data,
      parseClient(formData) as never,
    );
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
  revalidatePath("/studio/clients");
  revalidatePath(`/studio/clients/${clientId.data}`);
  return {};
}

export async function deleteClientAction(formData: FormData): Promise<void> {
  const clientId = z.string().min(1).parse(formData.get("clientId"));
  const { user, workspace } = await requireWorkspace();
  await softDeleteClient(prisma, { userId: user.id, workspaceId: workspace.id }, clientId);
  revalidatePath("/studio/clients");
  redirect("/studio/clients");
}
