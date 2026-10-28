import { deleteProjectAction, deleteRoomAction } from "@/server/actions/projects";
import { RoomForm } from "@/components/projects/room-form";
import { RoomPhotos } from "@/components/projects/room-photos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@roomdesigner/db";
import { presignGet } from "@roomdesigner/storage";
import { requireWorkspace } from "@/server/auth/session";
import { getProject } from "@/server/services/projects";
import Link from "next/link";

const ROOM_TYPE_LABELS: Record<string, string> = {
  LIVING_ROOM: "Living room",
  BEDROOM: "Bedroom",
  KITCHEN: "Kitchen",
  BATHROOM: "Bathroom",
  DINING_ROOM: "Dining room",
  HOME_OFFICE: "Home office",
  KIDS_ROOM: "Kids room",
  BALCONY: "Balcony",
  HALLWAY: "Hallway",
  OTHER: "Other",
};

function formatLength(mm: number, unitSystem: string): string {
  if (unitSystem === "IMPERIAL") {
    return `${(mm / 304.8).toFixed(1)} ft`;
  }
  return `${(mm / 1000).toFixed(2)} m`;
}

export async function ProjectDetailView({
  projectId,
  basePath,
}: {
  projectId: string;
  basePath: "/app" | "/studio";
}) {
  const { user, workspace } = await requireWorkspace();
  const detail = await getProject(
    prisma,
    { userId: user.id, workspaceId: workspace.id },
    projectId,
  );

  const rooms = await Promise.all(
    detail.rooms.map(async (room) => ({
      ...room,
      photoUrls: await Promise.all(
        room.photos.map(async (photo) => ({
          id: photo.id,
          url: await presignGet(photo.storageKey),
        })),
      ),
    })),
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={basePath} className="text-xs text-muted-foreground underline">
            Back to projects
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {detail.project.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rooms.length === 0
              ? "Add a room to get started."
              : `${String(rooms.length)} ${rooms.length === 1 ? "room" : "rooms"}`}
          </p>
        </div>
        <form action={deleteProjectAction}>
          <input type="hidden" name="projectId" value={detail.project.id} />
          <input type="hidden" name="basePath" value={basePath} />
          <Button type="submit" variant="outline" size="sm">
            Delete project
          </Button>
        </form>
      </div>

      {rooms.length > 0 && (
        <ul className="space-y-4">
          {rooms.map((room) => (
            <li key={room.id}>
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle>{room.name}</CardTitle>
                      <CardDescription>
                        {ROOM_TYPE_LABELS[room.type] ?? room.type} ·{" "}
                        {formatLength(room.widthMm, workspace.unitSystem)} ×{" "}
                        {formatLength(room.lengthMm, workspace.unitSystem)} · ceiling{" "}
                        {formatLength(room.heightMm, workspace.unitSystem)}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button asChild size="sm">
                        <Link href={`${basePath}/projects/${projectId}/rooms/${room.id}`}>
                          Open room
                        </Link>
                      </Button>
                      <form action={deleteRoomAction}>
                        <input type="hidden" name="roomId" value={room.id} />
                        <input type="hidden" name="projectId" value={projectId} />
                        <input type="hidden" name="basePath" value={basePath} />
                        <Button type="submit" variant="ghost" size="sm">
                          Remove
                        </Button>
                      </form>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <RoomPhotos roomId={room.id} photos={room.photoUrls} />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Add a room</CardTitle>
          <CardDescription>
            Enter the measurements and add 1–3 photos. We never send dimensions to the AI model.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RoomForm projectId={projectId} basePath={basePath} />
        </CardContent>
      </Card>
    </div>
  );
}
