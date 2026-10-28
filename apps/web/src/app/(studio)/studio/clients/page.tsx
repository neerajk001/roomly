import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Clients" };

export default function StudioClientsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Clients</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Client records are created together with projects.
        </p>
      </div>
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>No clients yet</CardTitle>
          <CardDescription>
            Add a client when you create your first project. Contact details stay private to your
            studio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Client management arrives in V3.</p>
        </CardContent>
      </Card>
    </div>
  );
}
