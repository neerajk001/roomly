import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Studio projects" };

export default function StudioHomePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">Client projects and their renders.</p>
        </div>
        <Button disabled title="Project creation arrives with uploads (V2)">
          New project
        </Button>
      </div>
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>No projects yet</CardTitle>
          <CardDescription>
            Create a project for a client, upload room photos and generate concept visuals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Upload, estimates and proposals arrive in V2–V4.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
