import type { Prisma, Client } from "@roomdesigner/db";
import { z } from "zod";
import { AppError } from "../app-error";
import type { ServiceContext } from "./context";

export const clientInputSchema = z.object({
  name: z.string().trim().min(1, "Client name is required.").max(120),
  email: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.email("Enter a valid email.").optional(),
  ),
  phone: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(40).optional(),
  ),
  notes: z.string().trim().max(2000).optional(),
});

export type ClientInput = z.infer<typeof clientInputSchema>;

function validate(input: ClientInput): ClientInput {
  const parsed = clientInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(
      "INVALID_INPUT",
      parsed.error.issues[0]?.message ?? "Check the client details.",
      400,
    );
  }
  return parsed.data;
}

export async function createClient(
  db: Prisma,
  ctx: ServiceContext,
  input: ClientInput,
): Promise<Client> {
  const valid = validate(input);
  return db.client.create({
    data: {
      workspaceId: ctx.workspaceId,
      name: valid.name,
      email: valid.email ?? null,
      phone: valid.phone ?? null,
      notes: valid.notes ?? null,
    },
  });
}

export interface ClientListItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  projectCount: number;
  updatedAt: Date;
}

export async function listClients(
  db: Prisma,
  ctx: ServiceContext,
  options: { search?: string } = {},
): Promise<ClientListItem[]> {
  const search = options.search?.trim() ?? "";
  const clients = await db.client.findMany({
    where: {
      workspaceId: ctx.workspaceId,
      deletedAt: null,
      ...(search === ""
        ? {}
        : {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      updatedAt: true,
      _count: { select: { projects: true } },
    },
  });
  return clients.map((client) => ({
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    projectCount: client._count.projects,
    updatedAt: client.updatedAt,
  }));
}

export interface ClientDetail {
  client: Client;
  projects: { id: string; name: string; updatedAt: Date }[];
  briefLinkCount: number;
}

export async function getClient(
  db: Prisma,
  ctx: ServiceContext,
  clientId: string,
): Promise<ClientDetail> {
  const client = await db.client.findFirst({
    where: { id: clientId, workspaceId: ctx.workspaceId, deletedAt: null },
    include: {
      projects: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, updatedAt: true },
      },
      _count: { select: { briefLinks: true } },
    },
  });
  if (client === null) throw new AppError("NOT_FOUND", "Client not found.", 404);
  const { _count, projects, ...rest } = client;
  return {
    client: rest,
    projects,
    briefLinkCount: _count.briefLinks,
  };
}

export async function updateClient(
  db: Prisma,
  ctx: ServiceContext,
  clientId: string,
  input: ClientInput,
): Promise<Client> {
  const valid = validate(input);
  const updated = await db.client.updateMany({
    where: { id: clientId, workspaceId: ctx.workspaceId, deletedAt: null },
    data: {
      name: valid.name,
      email: valid.email ?? null,
      phone: valid.phone ?? null,
      notes: valid.notes ?? null,
    },
  });
  if (updated.count === 0) throw new AppError("NOT_FOUND", "Client not found.", 404);
  const client = await db.client.findFirst({
    where: { id: clientId, workspaceId: ctx.workspaceId },
  });
  if (client === null) throw new AppError("NOT_FOUND", "Client not found.", 404);
  return client;
}

/** Soft delete: projects stay but the client disappears from lists. */
export async function softDeleteClient(
  db: Prisma,
  ctx: ServiceContext,
  clientId: string,
): Promise<void> {
  const deleted = await db.client.updateMany({
    where: { id: clientId, workspaceId: ctx.workspaceId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (deleted.count === 0) throw new AppError("NOT_FOUND", "Client not found.", 404);
}
