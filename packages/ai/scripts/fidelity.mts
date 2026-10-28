/**
 * Fidelity check for decision gate G2 (docs/spec/04-ai-pipeline.md).
 *
 * Runs every image in fixtures/rooms/ through the real provider at low, medium
 * and high quality, saves outputs to tmp/fidelity/, and prints cost per call
 * (from response usage × pricing.ts).
 *
 * Refuses to run unless IMAGE_PROVIDER=openai and --budget-usd is passed. Stops
 * as soon as the accumulated cost would exceed the budget.
 *
 * Usage:
 *   pnpm ai:fidelity --budget-usd 3
 */
import { createOpenAIProvider } from "../src/openai";
import { buildRestylePrompt } from "../src/prompts";
import type { ImageQuality } from "../src/types";
import fs from "node:fs";
import path from "node:path";

const QUALITIES: ImageQuality[] = ["low", "medium", "high"];
const SIZES = { low: "1024x1024", medium: "1024x1024", high: "1536x1024" } as const;

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function microsToUsd(micros: number): string {
  return (micros / 1_000_000).toFixed(4);
}

async function main(): Promise<void> {
  if (process.env.IMAGE_PROVIDER !== "openai") {
    throw new Error("Refusing to run: set IMAGE_PROVIDER=openai (real provider) first.");
  }
  const budgetArg = argValue("--budget-usd");
  if (budgetArg === undefined) {
    throw new Error("Refusing to run without --budget-usd <amount>.");
  }
  const budgetMicros = Math.round(Number.parseFloat(budgetArg) * 1_000_000);
  if (!Number.isFinite(budgetMicros) || budgetMicros <= 0) {
    throw new Error("--budget-usd must be a positive number.");
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey === undefined || apiKey === "") {
    throw new Error("OPENAI_API_KEY is not set.");
  }
  const model = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2.5-sunburst";

  const root = path.resolve(process.cwd(), "../..");
  const fixturesDir = path.join(root, "fixtures", "rooms");
  const outDir = path.join(root, "tmp", "fidelity");
  fs.mkdirSync(outDir, { recursive: true });

  const fixtures = fs
    .readdirSync(fixturesDir)
    .filter((file) => /\.(jpe?g|png|webp)$/i.test(file))
    .sort();
  if (fixtures.length < 5) {
    throw new Error(
      `Need at least 5 room photos in fixtures/rooms/ (found ${String(fixtures.length)}).`,
    );
  }

  const provider = createOpenAIProvider({ apiKey, model });
  const prompt = buildRestylePrompt({
    roomTypeLabel: "living room",
    styleLabel: "Scandinavian",
    keepList: [],
    renterMode: false,
  });

  let spentMicros = 0;
  const rows: string[] = [];
  rows.push("fixture,quality,model,elapsed_ms,cost_micros,cost_usd,output");

  outer: for (const fixture of fixtures) {
    const source = fs.readFileSync(path.join(fixturesDir, fixture));
    for (const quality of QUALITIES) {
      if (spentMicros >= budgetMicros) {
        process.stdout.write("Budget reached — stopping early.\n");
        break outer;
      }
      const started = Date.now();
      const result = await provider.edit({
        image: source,
        mime: fixture.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg",
        prompt,
        n: 1,
        size: SIZES[quality],
        quality,
      });
      spentMicros += result.costMicros;
      const image = result.images[0];
      if (image === undefined) continue;
      const outName = `${path.parse(fixture).name}-${quality}.${image.mime === "image/png" ? "png" : "jpg"}`;
      fs.writeFileSync(path.join(outDir, outName), image.data);
      rows.push(
        [
          fixture,
          quality,
          result.model,
          String(Date.now() - started),
          String(result.costMicros),
          microsToUsd(result.costMicros),
          path.join("tmp/fidelity", outName),
        ].join(","),
      );
      process.stdout.write(`${rows[rows.length - 1] ?? ""}\n`);
    }
  }

  fs.writeFileSync(path.join(outDir, "report.csv"), rows.join("\n") + "\n");
  process.stdout.write(
    `\nTotal spend: ${microsToUsd(spentMicros)} USD (budget ${budgetArg} USD). Report: tmp/fidelity/report.csv\n`,
  );
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
