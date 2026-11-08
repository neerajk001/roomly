import { randomBytes } from "node:crypto";
import type { Prisma } from "@roomdesigner/db";
import { AppError } from "../app-error";
import type { ServiceContext } from "./context";

/** 192-bit URL-safe token. */
function newShareToken(): string {
  return randomBytes(24).toString("base64url");
}

export interface ShareLink {
  token: string;
  onlyFavorites: boolean;
}

export async function createShareLink(
  db: Prisma,
  ctx: ServiceContext,
  projectId: string,
  options: { onlyFavorites: boolean; regenerate?: boolean },
): Promise<ShareLink> {
  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId: ctx.workspaceId, deletedAt: null },
    select: { id: true, shareToken: true },
  });
  if (project === null) throw new AppError("NOT_FOUND", "Project not found.", 404);

  const token =
    project.shareToken !== null && options.regenerate !== true
      ? project.shareToken
      : newShareToken();

  await db.project.update({
    where: { id: project.id },
    data: { shareToken: token, shareShowFavorites: options.onlyFavorites },
  });
  return { token, onlyFavorites: options.onlyFavorites };
}

export async function revokeShareLink(
  db: Prisma,
  ctx: ServiceContext,
  projectId: string,
): Promise<void> {
  const updated = await db.project.updateMany({
    where: { id: projectId, workspaceId: ctx.workspaceId, deletedAt: null },
    data: { shareToken: null },
  });
  if (updated.count === 0) throw new AppError("NOT_FOUND", "Project not found.", 404);
}

export interface SharedOutput {
  id: string;
  index: number;
  votes: number;
  isFavorite: boolean;
  url: string;
  thumbUrl: string;
}

export interface SharedGallery {
  projectId: string;
  projectName: string;
  roomId: string | null;
  roomName: string | null;
  beforeUrl: string | null;
  outputs: SharedOutput[];
}

/** Public lookup: token only, no workspace details leak into the result. */
export async function getSharedGallery(
  db: Prisma,
  token: string,
  signUrl: (key: string) => Promise<string>,
): Promise<SharedGallery> {
  const project = await db.project.findFirst({
    where: { shareToken: token, deletedAt: null },
    select: {
      id: true,
      name: true,
      shareShowFavorites: true,
      rooms: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: {
          id: true,
          name: true,
          assets: {
            where: { kind: { in: ["ORIGINAL_PHOTO", "BRIEF_UPLOAD"] }, confirmedAt: { not: null } },
            orderBy: { createdAt: "asc" },
            take: 1,
            select: { storageKey: true },
          },
          renderJobs: {
            where: { status: "SUCCEEDED" },
            orderBy: { createdAt: "asc" },
            include: {
              outputs: {
                orderBy: { index: "asc" },
                include: {
                  asset: { select: { storageKey: true } },
                  thumbAsset: { select: { storageKey: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (project === null) throw new AppError("NOT_FOUND", "This link is no longer available.", 404);

  const room = project.rooms[0] ?? null;
  const allOutputs = project.rooms.flatMap((room) => room.renderJobs.flatMap((job) => job.outputs));
  const selected = project.shareShowFavorites
    ? allOutputs.filter((output) => output.isFavorite)
    : allOutputs;

  return {
    projectId: project.id,
    projectName: project.name,
    roomId: room?.id ?? null,
    roomName: room?.name ?? null,
    beforeUrl: room?.assets[0] !== undefined ? await signUrl(room.assets[0].storageKey) : null,
    outputs: await Promise.all(
      selected.map(async (output) => ({
        id: output.id,
        index: output.index,
        votes: output.votes,
        isFavorite: output.isFavorite,
        url: await signUrl(output.asset.storageKey),
        thumbUrl: await signUrl(output.thumbAsset?.storageKey ?? output.asset.storageKey),
      })),
    ),
  };
}

/** Increments a vote once per output; scoped by the public token. */
export async function castVote(
  db: Prisma,
  token: string,
  outputId: string,
): Promise<{ votes: number } | null> {
  const project = await db.project.findFirst({
    where: { shareToken: token, deletedAt: null },
    select: { id: true, shareShowFavorites: true },
  });
  if (project === null) return null;

  const output = await db.renderOutput.findFirst({
    where: { id: outputId, job: { room: { projectId: project.id } } },
    select: { id: true, isFavorite: true },
  });
  if (output === null) return null;
  if (project.shareShowFavorites && !output.isFavorite) return null;

  const updated = await db.renderOutput.update({
    where: { id: output.id },
    data: { votes: { increment: 1 } },
    select: { votes: true },
  });
  return { votes: updated.votes };
}
