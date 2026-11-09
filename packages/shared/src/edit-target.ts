import { z } from "zod";

/** Integer thousandths of the displayed, orientation-normalized image. */
export const editRegionSchema = z
  .object({
    left: z.number().int().min(0).max(990),
    top: z.number().int().min(0).max(990),
    right: z.number().int().min(10).max(1000),
    bottom: z.number().int().min(10).max(1000),
  })
  .refine(
    (r) =>
      r.right - r.left >= 10 &&
      r.bottom - r.top >= 10 &&
      (r.right - r.left) * (r.bottom - r.top) <= 800_000,
    "Choose an area at least 1% wide and high, covering at most 80% of the image.",
  );

export const editTargetSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[^\u0000-\u001f<>]+$/),
  region: editRegionSchema,
});
export type EditRegion = z.infer<typeof editRegionSchema>;
export type EditTarget = z.infer<typeof editTargetSchema>;
export function savedEditTarget(params: unknown): EditTarget | undefined {
  const result = z.object({ editTarget: editTargetSchema }).safeParse(params);
  return result.success ? result.data.editTarget : undefined;
}
