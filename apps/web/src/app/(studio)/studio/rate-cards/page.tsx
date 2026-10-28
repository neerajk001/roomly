import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Rate cards" };

export default function StudioRateCardsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Rate cards</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Unit prices used to build estimates and proposals.
        </p>
      </div>
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>No rate cards yet</CardTitle>
          <CardDescription>
            Rate cards arrive with Pro mode in V4. A starter card with placeholder prices will be
            created for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Estimates and proposals are out of scope for V1.</p>
        </CardContent>
      </Card>
    </div>
  );
}
