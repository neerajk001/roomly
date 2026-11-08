import { parseCsv } from "./csv";
import { parseDecimalHundredths } from "@roomdesigner/estimate";
import { rateItemSchema, type RateCardInput } from "./services/rate-cards";
import { AppError } from "./app-error";

export function parseRateCardCsv(csv: string): RateCardInput["items"] {
  const rows = parseCsv(csv);
  if (
    rows.length < 2 ||
    rows[0]?.map((cell) => cell.trim().toLowerCase()).join(",") !== "key,label,category,unit,price"
  ) {
    throw new AppError(
      "INVALID_INPUT",
      "Use header key,label,category,unit,price and at least one item.",
      400,
    );
  }
  const items = rows.slice(1).map((row, index) => {
    const [key, label, category, unit, price = ""] = row.map((cell) => cell.trim());
    const parsed = rateItemSchema.safeParse({
      key,
      label,
      category,
      unit,
      unitPriceMinor: parseDecimalHundredths(price),
    });
    if (row.length !== 5 || !parsed.success)
      throw new AppError(
        "INVALID_INPUT",
        `Row ${index + 2}: check required fields, unit and price (at most two decimals).`,
        400,
      );
    return parsed.data;
  });
  if (new Set(items.map((item) => item.key)).size !== items.length)
    throw new AppError("INVALID_INPUT", "CSV item keys must be unique.", 400);
  return items;
}
