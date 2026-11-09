import {
  ProviderError,
  type EditInput,
  type EditResult,
  type ImageProvider,
} from "@roomdesigner/ai";
import { compareFingerprints, duplicatePairs, fingerprintImage } from "@roomdesigner/storage";

interface DiversityInput {
  result: EditResult;
  provider: ImageProvider;
  /** Atomically persists the allowance before a provider call; checks spend headroom. */
  claimRetry(initialCostMicros: number): Promise<boolean>;
  replacementInput(index: number): EditInput;
  failedCallCostMicros: number;
}

/** At most ONE extra call, never throws away a valid set because its optional retry failed. */
export async function improveConceptDiversity(input: DiversityInput) {
  const fingerprints = await Promise.all(
    input.result.images.map((image) => fingerprintImage(image.data)),
  );
  const before = duplicatePairs(fingerprints);
  const target = before[0]?.[1];
  const images = [...input.result.images];
  let costMicros = input.result.costMicros;
  let retryUsed = false;
  if (target !== undefined) {
    let allowed = false;
    try {
      allowed = await input.claimRetry(costMicros);
    } catch {
      /* Keep valid originals if optional retry cannot start. */
    }
    if (allowed) {
      retryUsed = true;
      let receivedCost = false;
      try {
        const replacement = await input.provider.edit(input.replacementInput(target));
        costMicros += replacement.costMicros;
        receivedCost = true;
        const image = replacement.images[0];
        if (replacement.images.length !== 1 || !image)
          throw new ProviderError("PROVIDER_EMPTY", "No replacement image.", "permanent");
        const fingerprint = await fingerprintImage(image.data);
        const original = fingerprints[target];
        const peers = fingerprints.filter((_, index) => index !== target);
        const originalDistance = Math.min(
          ...peers.map((peer) => (original ? compareFingerprints(original, peer).distance : 0)),
        );
        const newDistance = Math.min(
          ...peers.map((peer) => compareFingerprints(fingerprint, peer).distance),
        );
        const oldDuplicates = peers.filter(
          (peer) => original && compareFingerprints(original, peer).nearDuplicate,
        ).length;
        const newDuplicates = peers.filter(
          (peer) => compareFingerprints(fingerprint, peer).nearDuplicate,
        ).length;
        if (
          newDuplicates < oldDuplicates ||
          (newDuplicates === oldDuplicates && newDistance > originalDistance)
        ) {
          images[target] = image;
          fingerprints[target] = fingerprint;
        }
      } catch {
        // Missing usage after a failed paid call is conservatively accounted, not treated as free.
        if (!receivedCost) costMicros += input.failedCallCostMicros;
      }
    }
  }
  return {
    result: { ...input.result, images, costMicros },
    report: { similarConcepts: duplicatePairs(fingerprints).length > 0, retryUsed },
  };
}
