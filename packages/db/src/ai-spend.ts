import type { Prisma } from "./index";

/** Administrative provider spend only; never returned to a workspace user. */
export async function dailyAiSpendMicros(
  db: Pick<Prisma, "$queryRaw">,
  now = new Date(),
): Promise<number> {
  const day = now.toISOString().slice(0, 10);
  const start = new Date(`${day}T00:00:00.000Z`);
  const rows = await db.$queryRaw<{ total: bigint }[]>`
    SELECT COALESCE(SUM(CASE WHEN "createdAt" >= ${start} THEN "costMicros" ELSE 0 END), 0)::bigint
      + COALESCE(SUM(CASE WHEN jsonb_typeof("params" -> 'adviceSpendByDay' -> ${day}) = 'number'
          THEN ("params" -> 'adviceSpendByDay' ->> ${day})::bigint ELSE 0 END), 0)::bigint AS total
    FROM "RenderJob"
    WHERE "createdAt" >= ${start} OR ("params" -> 'adviceSpendByDay') ? ${day}
  `;
  const total = Number(rows[0]?.total ?? 0);
  if (!Number.isSafeInteger(total) || total < 0) throw new Error("Invalid provider spend total.");
  return total;
}
