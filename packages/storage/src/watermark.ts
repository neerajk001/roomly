import sharp from "sharp";

/**
 * Applies a visible "AI concept" watermark at delivery time for free
 * workspaces. Never modifies the stored original.
 */
export async function applyWatermark(buffer: Buffer): Promise<Buffer> {
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width ?? 1024;
  const height = metadata.height ?? 1024;
  const barHeight = Math.max(36, Math.round(height * 0.06));
  const fontSize = Math.max(16, Math.round(barHeight * 0.42));
  const padding = Math.round(barHeight * 0.3);

  const svg = Buffer.from(
    `<svg width="${String(width)}" height="${String(barHeight)}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="rgba(17,17,17,0.55)"/>
      <text x="${String(padding)}" y="${String(barHeight * 0.68)}" font-family="Arial, sans-serif" font-size="${String(fontSize)}" fill="#ffffff">
        AI-generated concept · RoomDesigner
      </text>
    </svg>`,
  );

  return sharp(buffer)
    .composite([{ input: svg, gravity: "south" }])
    .jpeg({ quality: 90 })
    .toBuffer();
}
