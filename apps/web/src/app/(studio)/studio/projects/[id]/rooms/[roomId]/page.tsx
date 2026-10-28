import { RoomDetailView } from "@/components/rooms/room-detail-view";

export const metadata = { title: "Room" };

export default async function StudioRoomPage({
  params,
}: {
  params: Promise<{ id: string; roomId: string }>;
}) {
  const { id, roomId } = await params;
  return <RoomDetailView projectId={id} roomId={roomId} basePath="/studio" />;
}
