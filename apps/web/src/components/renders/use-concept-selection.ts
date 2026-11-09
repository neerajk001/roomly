"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import type { RenderJobView } from "./types";

export const conceptSelectionSchema = z.object({
  version: z.literal(1),
  jobId: z.string().max(128).nullable(),
  outputs: z
    .record(z.string().max(128), z.string().max(128))
    .refine((value) => Object.keys(value).length <= 200),
});

export function useConceptSelection(
  roomId: string,
  jobs: RenderJobView[],
  currentId: string | null,
  setCurrentId: (id: string) => void,
) {
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);
  const loadedRoom = useRef<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  useEffect(() => {
    if (loadedRoom.current === roomId) return;
    loadedRoom.current = roomId;
    try {
      const raw = localStorage.getItem(`roomly:concept-selection:${roomId}`);
      const restored = raw ? conceptSelectionSchema.safeParse(JSON.parse(raw) as unknown) : null;
      if (restored?.success) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- restore a validated browser preference once per room
        setChoices(restored.data.outputs);
        if (restored.data.jobId && jobs.some((job) => job.id === restored.data.jobId))
          setCurrentId(restored.data.jobId);
      }
    } catch {
      /* Selection still works when browser storage is unavailable. */
    }
    setHydrated(true);
  }, [roomId, jobs, setCurrentId]);
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        `roomly:concept-selection:${roomId}`,
        JSON.stringify({
          version: 1,
          jobId: currentId,
          outputs: Object.fromEntries(Object.entries(choices).slice(-200)),
        }),
      );
    } catch {
      /* Optional persistence. */
    }
  }, [roomId, currentId, choices, hydrated]);
  const current = jobs.find((job) => job.id === currentId);
  const selected =
    current?.outputs.find((output) => output.id === choices[current.id]) ??
    current?.outputs[0] ??
    null;
  const choose = (outputId: string, jobId = currentId) => {
    if (
      !jobId ||
      !jobs.some((job) => job.id === jobId && job.outputs.some((output) => output.id === outputId))
    )
      return;
    setChoices((previous) => ({ ...previous, [jobId]: outputId }));
    setCurrentId(jobId);
  };
  const setDraft = (id: string, text: string) =>
    setDrafts((previous) => ({ ...previous, [id]: text.slice(0, 300) }));
  return { selected, choose, drafts, setDraft };
}
