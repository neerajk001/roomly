import { RateCardEditor } from "@/components/studio/rate-card-editor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@roomdesigner/db";
import { requireWorkspace } from "@/server/auth/session";
import { getRateCard } from "@/server/services/rate-cards";
import Link from "next/link";

export const metadata = { title: "Rate card" };

export default async function StudioRateCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, workspace } = await requireWorkspace();
  const card = await getRateCard(prisma, { userId: user.id, workspaceId: workspace.id }, id);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/studio/rate-cards" className="text-xs text-muted-foreground underline">
          Back to rate cards
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{card.name}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
          <CardDescription>
            Prices in {card.currency}, stored per m² / m / unit. Markup and tax apply to estimates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RateCardEditor
            rateCardId={card.id}
            name={card.name}
            markupBps={card.markupBps}
            taxBps={card.taxBps}
            currency={card.currency}
            items={card.items.map((item) => ({
              key: item.key,
              label: item.label,
              category: item.category,
              unit: item.unit,
              unitPriceMinor: item.unitPriceMinor,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
