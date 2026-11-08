import { mkdir, writeFile } from "node:fs/promises";
import { renderProposalPdf } from "@roomdesigner/pdf";
import { proposalFixture } from "../src/proposal-fixture";

const directory = new URL("../../../tmp/pdfs/", import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(
  new URL("proposal-preview.pdf", directory),
  await renderProposalPdf(await proposalFixture()),
);
process.stdout.write("Created tmp/pdfs/proposal-preview.pdf\n");
