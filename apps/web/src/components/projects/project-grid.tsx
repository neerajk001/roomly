import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProjectListItem } from "@/server/services/projects";
import Link from "next/link";

export function ProjectGrid({
  projects,
  basePath,
  emptyTitle,
  emptyBody,
}: {
  projects: ProjectListItem[];
  basePath: "/app" | "/studio";
  emptyTitle: string;
  emptyBody: string;
}) {
  if (projects.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>{emptyTitle}</CardTitle>
          <CardDescription>{emptyBody}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <li key={project.id}>
          <Link
            href={`${basePath}/projects/${project.id}`}
            className="block h-full rounded-xl border border-border bg-background p-5 transition-colors hover:border-primary/40 hover:bg-muted/40"
          >
            <p className="truncate font-medium text-foreground">{project.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {project.roomCount === 1 ? "1 room" : `${project.roomCount} rooms`}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Updated {project.updatedAt.toLocaleDateString()}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function NewProjectButton({ basePath }: { basePath: "/app" | "/studio" }) {
  return (
    <Button asChild>
      <Link href={`${basePath}/projects/new`}>New project</Link>
    </Button>
  );
}
