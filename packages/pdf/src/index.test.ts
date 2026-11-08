import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { renderProposalPdf } from "@roomdesigner/pdf";
import { proposalFixture } from "./proposal-fixture";

function extractedText(buffer: Buffer): string {
  const source = buffer.toString("latin1");
  let text = "";
  for (const match of source.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    try {
      const content = inflateSync(Buffer.from(match[1] ?? "", "latin1")).toString("latin1");
      for (const encoded of content.matchAll(/<([0-9a-f]+)>/gi))
        text += Buffer.from(encoded[1] ?? "", "hex").toString("latin1");
    } catch {
      /* Image streams need not be text/flate streams. */
    }
  }
  return text.replace(/\s+/g, "");
}

describe("proposal PDF", () => {
  it("includes branding, estimate text, totals and concept pages", async () => {
    const pdf = await renderProposalPdf(await proposalFixture());
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect((pdf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length).toBe(2);
    const text = extractedText(pdf);
    expect(text).toContain("LivingRoomProposal");
    expect(text).toContain("Wallpaint");
    expect(text).toContain("771.21");
    expect(text).toContain("Warmminimalconcept");
    expect(pdf.toString("latin1")).toContain("/Subtype /Image");
  });
});
