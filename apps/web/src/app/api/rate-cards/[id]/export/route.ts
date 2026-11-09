import { prisma } from "@roomdesigner/db";
import { presignGet } from "@roomdesigner/storage";
import { requireApiWorkspace } from "@/server/auth/session";
import { errorResponse } from "@/server/http";
import { toCsv } from "@/server/csv";
import { getRateCard } from "@/server/services/rate-cards";
import { formatMoneyInput } from "@roomdesigner/estimate";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const ctx = await requireApiWorkspace();
    const { id } = await params;
    const card = await getRateCard(
      prisma,
      { userId: ctx.user.id, workspaceId: ctx.workspace.id },
      id,
    );
    const rows: (string | number)[][] = [
      ["key", "label", "category", "unit", "price"],
      ...card.items.map((item) => [
        item.key,
        item.label,
        item.category,
        item.unit,
        formatMoneyInput(item.unitPriceMinor, card.currency),
      ]),
    ];
    void presignGet; // keep storage import tree-shaken out of this route's type surface
    return new Response(toCsv(rows), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="rate-card-${card.id}.csv"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
