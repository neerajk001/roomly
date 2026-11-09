export type ImageSize = "1024x1024" | "1536x1024" | "1024x1536" | "auto";
export type ImageQuality = "low" | "medium" | "high";

export interface EditInput {
  /** PNG, same oriented dimensions as image; transparent pixels are editable. */
  mask?: Buffer;
  image: Buffer;
  mime: string;
  prompt: string;
  n: number;
  size: ImageSize;
  quality: ImageQuality;
  signal?: AbortSignal;
}

export interface EditResult {
  images: { data: Buffer; mime: string }[];
  /** Computed from provider usage data and pricing.ts (USD × 1,000,000). */
  costMicros: number;
  model: string;
}

export interface ImageProvider {
  readonly name: "fake" | "openai" | string;
  edit(input: EditInput): Promise<EditResult>;
}

export type ErrorClass = "transient" | "permanent";

export class ProviderError extends Error {
  readonly errorClass: ErrorClass;
  readonly code: string;

  constructor(code: string, message: string, errorClass: ErrorClass) {
    super(message);
    this.name = "ProviderError";
    this.code = code;
    this.errorClass = errorClass;
  }
}
