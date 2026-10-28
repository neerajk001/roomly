import sharp from "sharp";
import type { EditInput, EditResult, ImageProvider } from "./types";

const FAKE_DELAY_MS = 900;

function tintForPrompt(prompt: string, variation: number): { r: number; g: number; b: number } {
  let hash = variation * 37;
  for (const char of prompt) {
    const code = char.codePointAt(0);
    if (code === undefined) continue;
    hash = (hash * 31 + code) % 360;
  }
  const hue = hash % 360;
  // Simple deterministic hue → RGB (soft tint).
  const c = 0.35;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = 0.65;
  const table: [number, number, number][] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ];
  const [r = 0, g = 0, b = 0] = table[Math.floor(hue / 60) % 6] ?? [c, c, c];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function labelSvg(width: number, height: number, text: string): Buffer {
  return Buffer.from(
    `<svg width="${String(width)}" height="${String(height)}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="${String(height - 64)}" width="${String(width)}" height="64" fill="rgba(0,0,0,0.55)"/>
      <text x="24" y="${String(height - 24)}" font-family="Arial, sans-serif" font-size="24" fill="#ffffff">${escapeXml(text)}</text>
    </svg>`,
  );
}

/**
 * Dev/test provider: tints the source photo and overlays the prompt style.
 * Deterministic per prompt+variation, costs nothing, takes ~1s.
 */
export function createFakeProvider(): ImageProvider {
  return {
    name: "fake",
    async edit(input: EditInput): Promise<EditResult> {
      const started = Date.now();
      const base = await sharp(input.image)
        .rotate()
        .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: false })
        .toBuffer();

      const metadata = await sharp(base).metadata();
      const width = metadata.width ?? 1024;
      const height = metadata.height ?? 1024;
      const label = input.prompt.split("\n")[0]?.slice(0, 72) ?? "Concept";

      const images: { data: Buffer; mime: string }[] = [];
      for (let index = 0; index < input.n; index++) {
        const tint = tintForPrompt(input.prompt, index);
        const tinted = await sharp(base)
          .modulate({ saturation: 0.9 })
          .tint(tint)
          .composite([{ input: labelSvg(width, height, `Concept ${String(index + 1)} · ${label}`), top: 0, left: 0 }])
          .jpeg({ quality: 84 })
          .toBuffer();
        images.push({ data: tinted, mime: "image/jpeg" });
      }

      const elapsed = Date.now() - started;
      if (elapsed < FAKE_DELAY_MS) {
        await new Promise((resolve) => setTimeout(resolve, FAKE_DELAY_MS - elapsed));
      }

      return { images, costMicros: 0, model: "fake" };
    },
  };
}
