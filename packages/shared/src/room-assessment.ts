import { z } from "zod";

const text = (max: number) => z.string().trim().min(1).max(max);
export const roomAssessmentContentSchema = z.object({
  decision: z.enum(["ready", "needs-photo", "review-items"]),
  confidence: z.enum(["high", "medium", "low"]),
  boundariesVisible: z.boolean(),
  floorVisible: z.boolean(),
  summary: text(300),
  nextStep: z.string().trim().max(240),
  fixedFeatures: z.array(text(140)).max(10),
  accessConstraints: z.array(text(140)).max(8),
  layoutGuidance: z.array(text(180)).max(8),
  limitations: z.array(text(160)).max(6),
  items: z
    .array(
      z.object({
        key: text(80),
        fit: z.enum(["fits", "compact", "cannot-fit", "uncertain"]),
        footprint: text(180),
        placement: text(180),
      }),
    )
    .max(20),
});
export type RoomAssessmentContent = z.infer<typeof roomAssessmentContentSchema>;
export const roomAssessmentSchema = roomAssessmentContentSchema.extend({
  source: z.enum(["ai", "demo"]),
});
export type RoomAssessment = z.infer<typeof roomAssessmentSchema>;
export const roomAssessmentRecordSchema = z.object({
  fingerprint: text(64),
  providerKey: text(180),
  status: z.enum(["checking", "ready", "failed"]),
  result: roomAssessmentSchema.optional(),
});
export type RoomAssessmentRecord = z.infer<typeof roomAssessmentRecordSchema>;
export function validateRoomAssessment(
  raw: unknown,
  requestedKeys: readonly string[],
): RoomAssessmentContent {
  const result = roomAssessmentContentSchema.parse(raw);
  const keys = result.items.map((item) => item.key);
  if (
    new Set(keys).size !== keys.length ||
    keys.length !== requestedKeys.length ||
    keys.some((key) => !requestedKeys.includes(key))
  )
    throw new Error("Assessment item coverage is invalid.");
  // Partial room views and uncertain scale are normal inputs for concept visuals.
  // Keep those observations as guidance; only an explicit unusable-photo decision blocks.
  if (result.items.some((item) => item.fit === "cannot-fit"))
    return {
      ...result,
      decision: "review-items",
      nextStep:
        "Remove the items that cannot fit, or revise your request. We will keep the room the same size.",
    };
  if (result.decision !== "ready" && !result.nextStep)
    throw new Error("Blocked assessment needs an actionable next step.");
  return result;
}
export function savedRoomAssessment(params: unknown): RoomAssessment | undefined {
  const record = z.object({ roomAssessment: roomAssessmentRecordSchema }).safeParse(params);
  return record.success ? record.data.roomAssessment.result : undefined;
}
export function savedRenderStage(params: unknown): "checking-room" | "generating" | undefined {
  const result = z
    .object({ renderStage: z.enum(["checking-room", "generating"]) })
    .safeParse(params);
  return result.success ? result.data.renderStage : undefined;
}
export function savedRoomRequest(params: unknown): string | undefined {
  const result = z.object({ notes: z.string().max(300).optional() }).safeParse(params);
  return result.success ? result.data.notes : undefined;
}
