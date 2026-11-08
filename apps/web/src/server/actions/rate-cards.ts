"use server";

import { prisma } from "@roomdesigner/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkspace } from "../auth/session";
import { AppError } from "../app-error";
import { rateCardInputSchema, updateRateCard } from "../services/rate-cards";
import { parseCsv } from "../csv";
import { RATE_UNITS } from "../services/rate-cards";
import { parseDecimalHundredths } from "@roomdesigner/estimate";

export interface RateCardState {
  error?: string;
  notice?: string;
}

export async function saveRateCardAction(
  _prev: RateCardState,
  formData: FormData,
): Promise<RateCardState> {
  const id = z.string().min(1).safeParse(formData.get("rateCardId"));
  if (!id.success) return { error: "Invalid rate card." };

  let items: unknown;
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { error: "The item list could not be read." };
  }
  const parsed = rateCardInputSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    markupBps: parseDecimalHundredths(String(formData.get("markupPercent") ?? "0")),
    taxBps: parseDecimalHundredths(String(formData.get("taxPercent") ?? "0")),
    items,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the rate card." };
  }

  const { user, workspace } = await requireWorkspace();
  try {
    await updateRateCard(
      prisma,
      { userId: user.id, workspaceId: workspace.id },
      id.data,
      parsed.data,
    );
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
  revalidatePath(`/studio/rate-cards/${id.data}`);
  revalidatePath("/studio/rate-cards");
  return { notice: "Rate card saved." };
}
const HEADER = ["key", "label", "category", "unit", "price"];

/** All-or-nothing CSV import: any invalid row rejects the whole file. */
export async function importRateCardCsvAction(
  _prev: RateCardState,
  formData: FormData,
): Promise<RateCardState> {
  const id = z.string().min(1).safeParse(formData.get("rateCardId"));
  if (!id.success) return { error: "Invalid rate card." };

  const csv = String(formData.get("csv") ?? "");
  const rows = parseCsv(csv);
  if (rows.length < 2) return { error: "The CSV needs a header and at least one row." };
  const header = rows[0]?.map((value) => value.trim().toLowerCase()) ?? [];
  const expected = HEADER.join(",");
  if (header.join(",") !== expected) {
    return { error: `Header must be exactly: ${expected}` };
  }

  const items: {
    key: string;
    label: string;
    category: string;
    unit: (typeof RATE_UNITS)[number];
    unitPriceMinor: number;
  }[] = [];
  for (let index = 1; index < rows.length; index++) {
    const row = rows[index] ?? [];
    const [key = "", label = "", category = "", unit = "", price = ""] = row.map((value) =>
      value.trim(),
    );
    const rowLabel = `Row ${String(index + 1)}`;
    if (key === "" || label === "" || category === "") {
      return { error: `${rowLabel}: key, label and category are required.` };
    }
    if (!RATE_UNITS.includes(unit as never)) {
      return { error: `${rowLabel}: unknown unit "${unit}".` };
    }
    const priceValue = parseDecimalHundredths(price);
    if (priceValue === null) {
      return { error: `${rowLabel}: price must be non-negative with at most two decimal places.` };
    }
    items.push({
      key,
      label,
      category,
      unit: unit as (typeof RATE_UNITS)[number],
      unitPriceMinor: priceValue,
    });
  }

  const { user, workspace } = await requireWorkspace();
  try {
    await updateRateCard(prisma, { userId: user.id, workspaceId: workspace.id }, id.data, {
      name: String(formData.get("name") ?? ""),
      markupBps: parseDecimalHundredths(String(formData.get("markupPercent") ?? "0")) ?? -1,
      taxBps: parseDecimalHundredths(String(formData.get("taxPercent") ?? "0")) ?? -1,
      items,
    });
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
  revalidatePath(`/studio/rate-cards/${id.data}`);
  return { notice: `Imported ${String(items.length)} items.` };
}
