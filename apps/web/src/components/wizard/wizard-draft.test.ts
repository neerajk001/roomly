import { describe, expect, it } from "vitest";
import { restoreWizardDraft } from "./wizard-draft";

const legacy = {
  step: 5,
  roomType: "BEDROOM",
  width: "4",
  length: "5",
  height: "2.7",
  useTypical: true,
  keepList: ["Bed"],
  customKeep: "",
  renterMode: true,
  budget: "",
  styles: ["scandinavian"],
  variations: "3",
  quality: "draft",
  notes: "Keep the window clear",
  stagingItems: [],
};

describe("wizard draft restoration", () => {
  it("migrates legacy style/budget steps without losing room constraints", () => {
    expect(restoreWizardDraft(legacy)).toMatchObject({
      version: 3,
      step: 4,
      traditionKey: "global",
      styles: ["scandinavian"],
      keepList: ["Bed"],
      renterMode: true,
      budgetTier: null,
    });
  });
  it("restores new preferences and review position", () => {
    expect(
      restoreWizardDraft({
        ...legacy,
        version: 3,
        step: 6,
        traditionKey: "europe",
        budgetTier: "mid",
      }),
    ).toMatchObject({ step: 6, traditionKey: "europe", budgetTier: "mid" });
  });
  it("rejects malformed and unsupported drafts", () => {
    for (const input of [
      null,
      {},
      { ...legacy, step: 99 },
      { ...legacy, styles: ["unknown"] },
      { ...legacy, quality: "invalid" },
    ])
      expect(restoreWizardDraft(input)).toBeNull();
  });
});
