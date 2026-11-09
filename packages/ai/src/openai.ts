import OpenAI, { toFile } from "openai";
import { computeCostMicros, type TokenUsage } from "./pricing";
import { ProviderError, type EditInput, type EditResult, type ImageProvider } from "./types";

export interface OpenAIProviderOptions {
  apiKey: string;
  model: string;
  timeoutMs?: number;
}

interface ImagesUsageShape {
  input_tokens?: number;
  output_tokens?: number;
  input_tokens_details?: { text_tokens?: number; image_tokens?: number };
}

function usageFromResponse(usage: unknown): TokenUsage | undefined {
  if (typeof usage !== "object" || usage === null) return undefined;
  const shape = usage as ImagesUsageShape;
  const details = shape.input_tokens_details;
  return {
    outputTokens: shape.output_tokens,
    inputTextTokens: details?.text_tokens,
    inputImageTokens: details?.image_tokens,
  };
}

function mimeExtension(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

function statusOf(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

/** 429 and 5xx/network failures are worth retrying; the rest is permanent. */
export function classifyProviderError(error: unknown): "transient" | "permanent" {
  if (error instanceof ProviderError) return error.errorClass;
  if (error instanceof OpenAI.APIUserAbortError) return "permanent";
  if (error instanceof OpenAI.APIConnectionTimeoutError) return "transient";
  if (error instanceof OpenAI.APIConnectionError) return "transient";
  const status = statusOf(error);
  if (status === undefined) return "permanent";
  if (status === 429) return "transient";
  if (status >= 500) return "transient";
  return "permanent";
}

export function createOpenAIProvider(options: OpenAIProviderOptions): ImageProvider {
  const client = new OpenAI({ apiKey: options.apiKey, timeout: options.timeoutMs ?? 120_000 });

  return {
    name: "openai",
    async edit(input: EditInput): Promise<EditResult> {
      const extension = mimeExtension(input.mime);
      const file = await toFile(input.image, `room.${extension}`, { type: input.mime });

      let response;
      try {
        response = await client.images.edit(
          {
            model: options.model,
            image: file,
            ...(input.mask
              ? { mask: await toFile(input.mask, "selection.png", { type: "image/png" }) }
              : {}),
            prompt: input.prompt,
            n: input.n,
            size: input.size,
            quality: input.quality,
            // NOTE: gpt-image-2.5 rejects `input_fidelity` (400). Structure is
            // enforced through the prompt instead.
          },
          input.signal !== undefined ? { signal: input.signal } : undefined,
        );
      } catch (error) {
        const transient = classifyProviderError(error);
        throw new ProviderError(
          transient === "transient" ? "PROVIDER_UNAVAILABLE" : "PROVIDER_REJECTED",
          transient === "transient"
            ? "The image service is busy. Retrying."
            : "The image service rejected this request.",
          transient,
        );
      }

      const images: { data: Buffer; mime: string }[] = [];
      for (const item of response.data ?? []) {
        if (item.b64_json === undefined || item.b64_json === null) {
          continue;
        }
        images.push({ data: Buffer.from(item.b64_json, "base64"), mime: "image/png" });
      }
      if (images.length === 0) {
        throw new ProviderError(
          "PROVIDER_EMPTY",
          "The image service returned no images.",
          "transient",
        );
      }

      const usage = usageFromResponse((response as { usage?: unknown }).usage);
      const { costMicros, usedFallback } = computeCostMicros(options.model, usage, images.length);
      if (usedFallback) {
        // eslint-disable-next-line no-console -- pricing fallback warning
        console.warn(
          JSON.stringify({ channel: "ai", event: "pricing_fallback", model: options.model }),
        );
      }

      return { images, costMicros, model: options.model };
    },
  };
}
