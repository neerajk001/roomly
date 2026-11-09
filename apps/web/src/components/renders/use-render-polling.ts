"use client";

import { useEffect, useState } from "react";
import { watchRender } from "@/lib/watch-render";
import { isTerminal, type RenderJobStatusResponse, type RenderJobView } from "./types";

export function useRenderPolling(
  jobId: string | null,
  status: RenderJobView["status"] | null,
  onUpdate: (job: RenderJobStatusResponse) => void,
  onComplete: (job: RenderJobStatusResponse) => void,
) {
  const [issue, setIssue] = useState<{ jobId: string; message: string } | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  useEffect(() => {
    if (!jobId || !status || isTerminal(status)) return;
    return watchRender(jobId, {
      onUpdate,
      onComplete,
      onError: (message) => setIssue({ jobId, message }),
    });
  }, [jobId, status, onUpdate, onComplete, retryCount]);
  return {
    error: issue?.jobId === jobId && status && !isTerminal(status) ? issue.message : null,
    retry: () => {
      setIssue(null);
      setRetryCount((count) => count + 1);
    },
  };
}
