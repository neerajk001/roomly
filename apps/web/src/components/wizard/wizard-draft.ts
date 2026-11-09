import { z } from "zod";
import { budgetTierSchema, styleKeySchema, traditionKeySchema } from "@roomdesigner/shared";

export const wizardDraftSchema = z.object({
  version: z.literal(3).default(3),
  step: z.number().int().min(0).max(6),
  roomType: z.enum([
    "LIVING_ROOM",
    "BEDROOM",
    "KITCHEN",
    "BATHROOM",
    "DINING_ROOM",
    "HOME_OFFICE",
    "KIDS_ROOM",
    "BALCONY",
    "HALLWAY",
    "OTHER",
  ]),
  width: z.string().max(30),
  length: z.string().max(30),
  height: z.string().max(30),
  useTypical: z.boolean(),
  keepList: z.array(z.string().max(80)).max(10),
  customKeep: z.string().max(80),
  renterMode: z.boolean(),
  budget: z.string().max(30),
  styles: z.array(styleKeySchema).max(3),
  traditionKey: z.union([z.literal(""), traditionKeySchema]).default(""),
  budgetTier: budgetTierSchema.nullable().default(null),
  variations: z.enum(["1", "2", "3", "4"]),
  quality: z.enum(["draft", "final"]),
  notes: z.string().max(600),
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
    .max(9),
});
export type WizardDraft = z.infer<typeof wizardDraftSchema>;

/** Accept v2 drafts without treating their old budget step as the new style step. */
export function restoreWizardDraft(raw: unknown): WizardDraft | null {
  const parsed = wizardDraftSchema.safeParse(raw);
  if (!parsed.success) return null;
  const isOld = typeof raw === "object" && raw !== null && !("version" in raw);
  return {
    ...parsed.data,
    step: isOld && (parsed.data.step === 4 || parsed.data.step === 5) ? 4 : parsed.data.step,
    traditionKey: parsed.data.traditionKey || (parsed.data.styles.length > 0 ? "global" : ""),
  };
}
