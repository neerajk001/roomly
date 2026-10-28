import { NewProjectForm } from "@/components/projects/new-project-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "New project" };

export default function NewProjectPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">New project</h1>
      <Card>
        <CardHeader>
          <CardTitle>Name the project</CardTitle>
          <CardDescription>You can add rooms and photos next.</CardDescription>
        </CardHeader>
        <CardContent>
          <NewProjectForm basePath="/app" />
        </CardContent>
      </Card>
    </div>
  );
}
