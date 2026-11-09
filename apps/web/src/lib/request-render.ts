import { z } from "zod";
import { createRenderAction, type RenderFormState } from "../server/actions/renders";

const resultSchema = z
  .object({
    error: z.string().min(1).optional(),
    jobId: z.string().min(1).optional(),
    creditsCharged: z.number().int().nonnegative().optional(),
  })
  .refine((result) => Boolean(result.error || result.jobId));

/** Never retry a mutation: the server may have committed before a connection drops. */
export async function requestRender(formData: FormData): Promise<RenderFormState> {
  try {
    return resultSchema.parse(await createRenderAction({}, formData));
  } catch {
    return {
      error:
        "We couldn’t confirm this request. Your draft is still here. Check design history before trying again.",
    };
  }
}
