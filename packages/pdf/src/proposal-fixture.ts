import { readFile } from "node:fs/promises";
import type { ProposalPdfData } from "@roomdesigner/pdf";

export async function proposalFixture(): Promise<ProposalPdfData> {
  const image = await readFile(new URL("../../../tests/e2e/fixtures/room.jpg", import.meta.url));
  return {
    brandName: "Northlight Interiors",
    brandColor: "#b95308",
    title: "Living Room Proposal",
    projectName: "Home redesign",
    clientName: "Sample Client",
    intro: "A calm, warm room with practical furniture and soft lighting.",
    terms: "Valid for 14 days. Final scope is subject to site verification.",
    currency: "USD",
    estimateVersion: 2,
    lines: [
      { label: "Wall paint", quantity: 34.11, totalMinor: 34110 },
      { label: "Flooring", quantity: 12, totalMinor: 36000 },
    ],
    subtotalMinor: 70110,
    markupMinor: 7011,
    taxMinor: 0,
    totalMinor: 77121,
    options: [{ caption: "Warm minimal concept", image, beforeImage: image }],
  };
}
