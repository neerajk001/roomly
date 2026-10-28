import { ProjectDetailView } from "@/components/projects/project-detail-view";

export const metadata = { title: "Project" };

export default async function AppProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectDetailView projectId={id} basePath="/app" />;
}
