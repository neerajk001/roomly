import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Pricing</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Plans and credit packs arrive in a later release. For now every account runs on free
          credits.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <CardDescription>Included with every account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Concept renders with a visible watermark.</p>
            <p>Rough cost range and shopping list.</p>
            <p>Share links with votes.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Plus</CardTitle>
            <CardDescription>Coming soon</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>More credits every month.</p>
            <p>No watermark on previews and downloads.</p>
            <p>Priority rendering.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
