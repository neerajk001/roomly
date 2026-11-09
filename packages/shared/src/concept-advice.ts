import { z } from "zod";
import { editTargetSchema } from "./edit-target";

export const conceptAdviceContentSchema = z.object({
  objects: z.array(editTargetSchema).max(8).optional(),
  summary: z.string().min(1).max(400),
  suggestions: z
    .array(
      z.object({
        title: z.string().min(1).max(80),
        observation: z.string().min(1).max(240),
        reason: z.string().min(1).max(240),
        instruction: z.string().min(3).max(300),
      }),
    )
    .max(3),
});
/** Required object list for new structured vision calls; legacy caches may omit it. */
export const conceptAnalysisSchema = conceptAdviceContentSchema.extend({
  objects: z.array(editTargetSchema).max(8),
});
export const conceptAdviceSchema = conceptAdviceContentSchema.extend({
  source: z.enum(["demo", "ai"]),
  preparedAt: z.iso.datetime(),
});
export type ConceptAdvice = z.infer<typeof conceptAdviceSchema>;
export type ConceptAdviceContent = z.infer<typeof conceptAdviceContentSchema>;

const baseEntry = z.object({
  requestId: z.string(),
  attempts: z.number().int().min(1).max(2),
  startedAt: z.iso.datetime(),
  provider: z.enum(["demo", "ai"]),
});
export const adviceEntrySchema = z.discriminatedUnion("status", [
  baseEntry.extend({ status: z.literal("running") }),
  baseEntry.extend({ status: z.literal("failed") }),
  baseEntry.extend({ status: z.literal("ready"), advice: conceptAdviceSchema }),
]);
export const adviceMapSchema = z.record(z.string(), adviceEntrySchema);
export function savedConceptAdvice(params: unknown, outputId: string): ConceptAdvice | undefined {
  const parsed = z.object({ conceptAdvice: adviceMapSchema }).safeParse(params);
  const entry = parsed.success ? parsed.data.conceptAdvice[outputId] : undefined;
  return entry?.status === "ready" ? entry.advice : undefined;
}
export function renderSourceOutputId(params: unknown): string | null {
  const parsed = z.object({ sourceOutputId: z.string().min(1) }).safeParse(params);
  return parsed.success ? parsed.data.sourceOutputId : null;
}
