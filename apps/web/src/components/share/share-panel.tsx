import { ShareControls } from "@/components/share/share-controls";
import { prisma } from "@roomdesigner/db";
import { requireWorkspace } from "@/server/auth/session";

export async function SharePanel({ projectId }: { projectId: string }) {
  const { workspace } = await requireWorkspace();
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId: workspace.id, deletedAt: null },
    select: { shareToken: true, shareShowFavorites: true },
  });
  if (project === null) return null;

  const favorites = await prisma.renderOutput.findMany({
    where: {
      isFavorite: true,
      job: { workspaceId: workspace.id, room: { projectId } },
    },
    orderBy: { votes: "desc" },
    take: 10,
    select: {
      id: true,
      votes: true,
      index: true,
      job: { select: { room: { select: { name: true } } } },
    },
  });

  return (
    <ShareControls
      projectId={projectId}
      token={project.shareToken}
      onlyFavorites={project.shareShowFavorites}
      voteCounts={favorites.map((output) => ({
        label: `${output.job.room.name} · option ${String(output.index + 1)}`,
        votes: output.votes,
      }))}
    />
  );
}
