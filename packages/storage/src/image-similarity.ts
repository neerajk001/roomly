import sharp from "sharp";

const SIDE = 32;
export interface ImageFingerprint {
  pixels: Buffer;
  edges: readonly number[];
  aspect: number;
}

/** CPU-only near-copy detection. No embeddings, paid vision calls or stored image bytes. */
export async function fingerprintImage(image: Buffer): Promise<ImageFingerprint> {
  const metadata = await sharp(image, { failOn: "error" }).metadata();
  const pixels = await sharp(image, { failOn: "error" })
    .rotate()
    .flatten({ background: "#ffffff" })
    .toColourspace("srgb")
    .removeAlpha()
    .resize(SIDE, SIDE, { fit: "fill" })
    .raw()
    .toBuffer();
  const edges: number[] = [];
  const luminance = (x: number, y: number) => {
    const offset = (y * SIDE + x) * 3;
    return (
      (pixels[offset] ?? 0) * 0.299 +
      (pixels[offset + 1] ?? 0) * 0.587 +
      (pixels[offset + 2] ?? 0) * 0.114
    );
  };
  for (let y = 8; y < 28; y++) {
    for (let x = 3; x < 28; x++) {
      const delta = luminance(x + 1, y) - luminance(x, y);
      edges.push(Math.abs(delta) < 4 ? 0 : Math.sign(delta));
    }
  }
  return { pixels, edges, aspect: (metadata.width ?? 1) / (metadata.height ?? 1) };
}

export function compareFingerprints(a: ImageFingerprint, b: ImageFingerprint) {
  let whole = 0;
  let centre = 0;
  let count = 0;
  for (let index = 0; index < a.pixels.length; index++) {
    const difference = Math.abs((a.pixels[index] ?? 0) - (b.pixels[index] ?? 0)) / 255;
    whole += difference;
    const pixel = Math.floor(index / 3);
    const x = pixel % SIDE;
    const y = Math.floor(pixel / SIDE);
    if (x >= 3 && x < 29 && y >= 8 && y < 28) {
      centre += difference;
      count++;
    }
  }
  const pixelDifference = whole / a.pixels.length;
  const centreDifference = centre / count;
  const edgeDifference =
    a.edges.filter((edge, index) => edge !== b.edges[index]).length / a.edges.length;
  const sameAspect = Math.abs(a.aspect - b.aspect) / Math.max(a.aspect, b.aspect) < 0.02;
  return {
    pixelDifference,
    centreDifference,
    edgeDifference,
    nearDuplicate:
      sameAspect && pixelDifference < 0.04 && centreDifference < 0.035 && edgeDifference < 0.06,
    distance: centreDifference + edgeDifference,
  };
}

export function duplicatePairs(fingerprints: readonly ImageFingerprint[]): [number, number][] {
  const pairs: [number, number][] = [];
  for (const [index, first] of fingerprints.entries()) {
    for (let second = index + 1; second < fingerprints.length; second++) {
      const other = fingerprints[second];
      if (other && compareFingerprints(first, other).nearDuplicate) pairs.push([index, second]);
    }
  }
  return pairs;
}
