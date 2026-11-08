import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@roomdesigner/db";
import { formatMoney } from "@roomdesigner/shared";
import { requireWorkspace } from "@/server/auth/session";
import { ensureStarterRateCard, listRateCards } from "@/server/services/rate-cards";
import Link from "next/link";

export const metadata = { title: "Rate cards" };

export default async function StudioRateCardsPage() {
  const { user, workspace } = await requireWorkspace();
  const ctx = { userId: user.id, workspaceId: workspace.id };
  await ensureStarterRateCard(prisma, ctx);
  const cards = await listRateCards(prisma, ctx);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Rate cards</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Unit prices used to build estimates. Starter values are placeholders — edit them.
        </p>
      </div>

      <RateCardControls cards={cards} />
      {cards.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No rate cards yet</CardTitle>
            <CardDescription>A starter card is created automatically.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="divide-y divide-border rounded-xl rounded-xl border border-border bg-background">
          {cards.map((card) => (
            <li key={card.id}>
              <Link
                href={`/studio/rate-cards/${card.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/40"
              >
                <span>
                  <span className="block text-sm font-medium text-foreground">{card.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {card._count.items} items · {card.currency} ·{" "}
                    {card.isDefault ? "default" : "secondary"}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  markup {card.markupBps / 100}% · tax {card.taxBps / 100}%
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        Illustrative defaults: {formatMoney(0, workspace.currency)} is not a quote. Edit prices to
        match your own rates.
      </p>
    </div>
  );
}
import { RateCardControls } from "@/components/studio/rate-card-controls";
