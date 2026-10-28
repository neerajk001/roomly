import { ShoppingList } from "@/components/estimates/shopping-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@roomdesigner/db";
import { formatMoney, roomNeeds, typicalSizeFor } from "@roomdesigner/shared";
import { requireWorkspace } from "@/server/auth/session";
import { getRoom } from "@/server/services/rooms";
import Link from "next/link";

export const metadata = { title: "Shopping list" };

export default async function ShoppingListPage({
  params,
}: {
  params: Promise<{ id: string; roomId: string }>;
}) {
  const { id, roomId } = await params;
  const { user, workspace } = await requireWorkspace();
  const detail = await getRoom(prisma, { userId: user.id, workspaceId: workspace.id }, roomId);
  const project = await prisma.project.findFirst({
    where: { id, workspaceId: workspace.id },
    select: { budgetMinor: true },
  });

  const typical = typicalSizeFor(detail.room.type);
  const widthMm = detail.room.widthMm ?? typical.widthMm;
  const lengthMm = detail.room.lengthMm ?? typical.lengthMm;
  const needs = roomNeeds({ roomType: detail.room.type, widthMm, lengthMm });
  const budget = project?.budgetMinor ?? null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 print:max-w-none">
      <div>
        <Link
          href={`/app/projects/${id}/rooms/${roomId}`}
          className="text-xs text-muted-foreground underline print:hidden"
        >
          Back to the room
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Shopping list</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {detail.room.name} · item types and sizes, no product links.
          {detail.room.widthMm === null ? " Sizes assume a typical room." : ""}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What to buy</CardTitle>
          <CardDescription>
            {budget !== null
              ? `Suggested split of your ${formatMoney(budget, workspace.currency)} budget.`
              : "Set a budget in the wizard to see suggested amounts."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ShoppingList
            currency={workspace.currency}
            budgetMinor={budget}
            items={needs.map((need) => ({
              key: need.key,
              label: need.label,
              sizeGuide: need.sizeGuide,
              amountMinor:
                budget !== null ? Math.round((budget * need.budgetShareBps) / 10_000) : null,
              sharePercent: Math.round(need.budgetShareBps / 100),
            }))}
          />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Sizes are guidance only. Rough range, actual prices vary by location and provider. This list
        contains no retailer links.
      </p>
    </div>
  );
}
