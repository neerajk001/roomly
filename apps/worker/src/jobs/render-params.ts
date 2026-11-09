import { z } from "zod";
import { designPreferencesSchema, diversityReportSchema } from "@roomdesigner/shared";

export const renderParamsSchema = z
  .object({
    ...designPreferencesSchema.shape,
    sourceOutputId: z.string().optional(),
    sourceDirectionLabel: z.string().optional(),
    conceptPlanVersion: z.literal(1).optional(),
    diversityRetryUsed: z.boolean().optional(),
    diversityReport: diversityReportSchema.optional(),
    providerQuality: z.enum(["low", "medium", "high"]),
    size: z.enum(["1024x1024", "1536x1024", "1024x1536", "auto"]),
    notes: z.string().max(300).optional(),
    stagingItems: z
      .array(
        z.enum([
          "sofa",
          "dining-table",
          "rug",
          "flooring",
          "curtains",
          "plants",
          "art",
          "lighting",
          "storage",
        ]),
      )
      .max(9)
      .optional(),
  })
  .refine(
    (value) => designPreferencesSchema.safeParse(value).success,
    "Invalid design preferences.",
  );

export type RenderParams = z.infer<typeof renderParamsSchema>;
