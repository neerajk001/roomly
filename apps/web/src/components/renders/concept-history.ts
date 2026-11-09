import type { RenderJobView, RenderOutputView } from "./types";

export function conceptFamily(
  history: RenderJobView[],
  outputId: string,
): { job: RenderJobView; output: RenderOutputView }[] {
  const all = history.flatMap((job) => job.outputs.map((output) => ({ job, output })));
  const byId = new Map(all.map((item) => [item.output.id, item]));
  const root = (id: string) => {
    const seen = new Set<string>();
    while (!seen.has(id)) {
      seen.add(id);
      const source = byId.get(id)?.job.sourceOutputId;
      if (!source || !byId.has(source)) break;
      id = source;
    }
    return id;
  };
  if (!byId.has(outputId)) return [];
  const familyRoot = root(outputId);
  return all.filter((item) => root(item.output.id) === familyRoot);
}
