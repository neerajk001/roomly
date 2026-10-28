import { RoomPhotos } from "@/components/projects/room-photos";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@roomdesigner/db";
import { presignGet } from "@roomdesigner/storage";
import { requireWorkspace } from "@/server/auth/session";
import { getRoom } from "@/server/services/rooms";
import Link from "next/link";

function formatLength(mm: number, unitSystem: string): string {
  return unitSystem === "IMPERIAL" ? `${(mm / 304.8).toFixed(1)} ft` : `${(mm / 1000).toFixed(2)} m`;
}

export async function RoomDetailView({
  projectId,
  roomId,
  basePath,
}: {
  projectId: string;
  roomId: string;
  basePath: "/app" | "/studio";
}) {
  const { user, workspace } = await requireWorkspace();
  const detail = await getRoom(prisma, { userId: user.id, workspaceId: workspace.id }, roomId);
  const photos = await Promise.all(
    detail.photos.map(async (photo) => ({
      id: photo.id,
      url: await presignGet(photo.storageKey),
    })),
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`${basePath}/projects/${projectId}`}
          className="text-xs text-muted-foreground underline"
        >
          Back to {detail.project.name}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          {detail.room.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatLength(detail.room.widthMm, workspace.unitSystem)} ×{" "}
          {formatLength(detail.room.lengthMm, workspace.unitSystem)} · ceiling{" "}
          {formatLength(detail.room.heightMm, workspace.unitSystem)}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Room photos</CardTitle>
          <CardDescription>
            The first photo is used as the source for renders. Photos are stored without EXIF data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RoomPhotos roomId={detail.room.id} photos={photos} />
        </CardContent>
      </Card>
    </div>
  );
}
