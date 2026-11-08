import { z } from "zod";

const favoriteResponse = z.object({ ok: z.literal(true), isFavorite: z.boolean() });

export async function saveFavorite(outputId: string, isFavorite: boolean): Promise<void> {
  const response = await fetch(`/api/render-outputs/${encodeURIComponent(outputId)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ isFavorite }),
  });
  if (!response.ok) throw new Error("Your favorite could not be saved. Please try again.");
  const parsed = favoriteResponse.safeParse(await response.json());
  if (!parsed.success || parsed.data.isFavorite !== isFavorite)
    throw new Error("Your favorite could not be confirmed. Please try again.");
}
