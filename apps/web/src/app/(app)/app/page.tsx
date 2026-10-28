import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "My rooms" };

export default function AppHomePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">My rooms</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Concept visuals and rough budgets for your home.
          </p>
        </div>
        <Button disabled title="Project creation arrives with uploads (V2)">
          New project
        </Button>
      </div>
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>No projects yet</CardTitle>
          <CardDescription>
            Start with a photo of the room you want to redesign. You will get concept visuals and a
            rough budget.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Upload and render arrive in V2. Nothing you add here will be a binding quote.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
