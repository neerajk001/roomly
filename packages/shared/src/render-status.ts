import { z } from "zod";
import { conceptAdviceSchema } from "./concept-advice";

export const renderOutputViewSchema = z.object({
  id: z.string(),
  index: z.number().int().nonnegative(),
  isFavorite: z.boolean(),
  url: z.string().min(1),
  thumbUrl: z.string().min(1),
  styleKey: z.string().nullable().optional(),
  directionLabel: z.string().optional(),
  advice: conceptAdviceSchema.optional(),
});
export const renderJobStatusSchema = z.object({
  id: z.string(),
  kind: z.enum(["RESTYLE", "EDIT"]),
  status: z.enum(["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELED"]),
  errorMessage: z.string().nullable(),
  creditsCharged: z.number().int().nonnegative(),
  outputs: z.array(renderOutputViewSchema),
  styleKey: z.string().nullable(),
  sourceOutputId: z.string().nullable().optional(),
  label: z.string().optional(),
  similarConcepts: z.boolean().optional(),
});
