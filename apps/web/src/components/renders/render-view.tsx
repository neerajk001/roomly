"use client";

import { createRenderAction } from "@/server/actions/renders";
import { GeneratePanel, type RestyleRequest } from "@/components/renders/generate-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  RenderJobStatusResponse,
  RenderJobView,
  RenderOutputView,
} from "@/components/renders/types";
import { isTerminal } from "@/components/renders/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

export function RenderView({
  roomId,
  projectId,
  hasPhoto,
  initialJob,
  history,
}: {
  roomId: string;
  projectId: string;
  hasPhoto: boolean;
  initialJob: RenderJobView | null;
  history: RenderJobView[];
}) {
  const router = useRouter();
  const [jobs, setJobs] = useState<RenderJobView[]>(history);
  const [currentId, setCurrentId] = useState<string | null>(initialJob?.id ?? null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [editingOutputId, setEditingOutputId] = useState<string | null>(null);
  const [instruction, setInstruction] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [lastRestyle, setLastRestyle] = useState<RestyleRequest | null>(null);
  const [createPending, startCreate] = useTransition();
  const [editPending, startEdit] = useTransition();
  const attempts = useRef(0);

  const current = jobs.find((job) => job.id === currentId) ?? null;
  const status = current?.status ?? null;

  const upsertJob = useCallback((incoming: RenderJobStatusResponse, label: string) => {
    setJobs((previous) => {
      const view: RenderJobView = {
        id: incoming.id,
        kind: incoming.kind,
        status: incoming.status,
        errorMessage: incoming.errorMessage,
        creditsCharged: incoming.creditsCharged,
        outputs: incoming.outputs,
        label,
      };
      return previous.some((job) => job.id === view.id)
        ? previous.map((job) => (job.id === view.id ? view : job))
        : [...previous, view];
    });
  }, []);

  const startJob = useCallback((jobId: string, kind: "RESTYLE" | "EDIT", label: string) => {
    setJobs((previous) =>
      previous.some((job) => job.id === jobId)
        ? previous
        : [
            ...previous,
            {
              id: jobId,
              kind,
              status: "QUEUED",
              errorMessage: null,
              creditsCharged: 0,
              outputs: [],
              label,
            },
          ],
    );
    setCurrentId(jobId);
  }, []);

  const submitRestyle = useCallback(
    (request: RestyleRequest) => {
      setPanelError(null);
      setLastRestyle(request);
      startCreate(async () => {
        const formData = new FormData();
        formData.set("roomId", roomId);
        formData.set("projectId", projectId);
        formData.set("kind", "RESTYLE");
        formData.set("styleKey", request.styleKey);
        formData.set("quality", request.quality);
        formData.set("variations", String(request.variations));
        if (request.notes.trim() !== "") formData.set("notes", request.notes);
        const result = await createRenderAction({}, formData);
        if (result.error !== undefined) {
          setPanelError(result.error);
          return;
        }
        if (result.jobId !== undefined) {
          startJob(result.jobId, "RESTYLE", "Base concept");
          router.refresh();
        }
      });
    },
    [projectId, roomId, router, startJob],
  );

  useEffect(() => {
    if (currentId === null || status === null || isTerminal(status)) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    attempts.current = 0;

    const tick = () => {
      void (async () => {
        try {
          const response = await fetch(`/api/renders/${currentId}`, { cache: "no-store" });
          if (response.ok) {
            const data = (await response.json()) as RenderJobStatusResponse;
            const label =
              data.kind === "EDIT"
                ? "Edit"
                : (jobs.find((job) => job.id === data.id)?.label ?? "Base concept");
            upsertJob(data, label);
            if (isTerminal(data.status)) {
              router.refresh();
              return;
            }
          }
        } catch {
          // Network hiccup: keep polling.
        }
        attempts.current += 1;
        const delay = Math.min(2000 * Math.pow(1.4, Math.max(0, attempts.current - 3)), 10_000);
        if (!cancelled) timer = setTimeout(tick, delay);
      })();
    };

    timer = setTimeout(tick, 2000);
    return () => {
      cancelled = true;
      if (timer !== undefined) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- poll loop keyed by job + status
  }, [currentId, status]);

  const toggleFavorite = (output: RenderOutputView) => {
    const next = !output.isFavorite;
    setJobs((previous) =>
      previous.map((job) =>
        job.id === currentId
          ? {
              ...job,
              outputs: job.outputs.map((item) =>
                item.id === output.id ? { ...item, isFavorite: next } : item,
              ),
            }
          : job,
      ),
    );
    void fetch(`/api/render-outputs/${output.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isFavorite: next }),
    });
  };

  const submitEdit = () => {
    if (editingOutputId === null) return;
    setEditError(null);
    startEdit(async () => {
      const formData = new FormData();
      formData.set("roomId", roomId);
      formData.set("projectId", projectId);
      formData.set("kind", "EDIT");
      formData.set("sourceOutputId", editingOutputId);
      formData.set("instruction", instruction);
      formData.set("quality", "draft");
      formData.set("variations", "1");
      const result = await createRenderAction({}, formData);
      if (result.error !== undefined) {
        setEditError(result.error);
        return;
      }
      if (result.jobId !== undefined) {
        startJob(result.jobId, "EDIT", instruction.slice(0, 40));
        setInstruction("");
        setEditingOutputId(null);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      <GeneratePanel
        hasPhoto={hasPhoto}
        pending={createPending}
        error={panelError}
        onCreate={submitRestyle}
      />

      {jobs.length > 1 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Render history">
          {jobs.map((job, index) => (
            <button
              key={job.id}
              type="button"
              onClick={() => {
                setCurrentId(job.id);
              }}
              aria-pressed={job.id === currentId}
              className={`max-w-[14rem] truncate rounded-full border px-3 py-1 text-xs ${
                job.id === currentId
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {job.kind === "EDIT" ? `Edit: ${job.label}` : `Base set ${index + 1}`}
            </button>
          ))}
        </div>
      )}

      {current === null && (
        <p className="text-sm text-muted-foreground">
          No renders yet. Pick a style above and generate concepts.
        </p>
      )}

      {current !== null && (current.status === "QUEUED" || current.status === "RUNNING") && (
        <Card>
          <CardHeader>
            <CardTitle>Generating concepts…</CardTitle>
            <CardDescription>
              This usually takes a few seconds. You can leave this page; results are saved.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3" aria-hidden="true">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="h-20 w-28 animate-pulse rounded-md bg-muted"
                  style={{ animationDelay: `${String(index * 120)}ms` }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {current !== null && current.status === "FAILED" && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>That render didn’t work</CardTitle>
            <CardDescription>
              {current.errorMessage ?? "Something went wrong."} Your credits were refunded.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="outline"
              disabled={lastRestyle === null || createPending}
              onClick={() => {
                if (lastRestyle !== null) submitRestyle(lastRestyle);
              }}
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {current !== null && current.status === "SUCCEEDED" && (
        <div className="space-y-3">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {current.outputs.map((output) => (
              <li
                key={output.id}
                className="group relative overflow-hidden rounded-lg border border-border"
              >
                <button
                  type="button"
                  className="block w-full"
                  onClick={() => {
                    setLightbox(output.url);
                  }}
                  aria-label={`Enlarge concept ${String(output.index + 1)}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed URL, no optimizer */}
                  <img
                    src={output.thumbUrl}
                    alt={`Concept ${String(output.index + 1)}`}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-[1.02]"
                  />
                </button>
                <div className="flex items-center justify-between gap-1 border-t border-border p-1.5">
                  <button
                    type="button"
                    aria-pressed={output.isFavorite}
                    aria-label={output.isFavorite ? "Remove from favorites" : "Add to favorites"}
                    onClick={() => {
                      toggleFavorite(output);
                    }}
                    className={`rounded p-1 text-sm ${output.isFavorite ? "text-red-500" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {output.isFavorite ? "♥" : "♡"}
                  </button>
                  <div className="flex items-center gap-1">
                    <a
                      href={`/api/render-outputs/${output.id}/download`}
                      className="rounded p-1 text-xs text-muted-foreground hover:text-foreground"
                      aria-label="Download"
                    >
                      ↓
                    </a>
                    <button
                      type="button"
                      className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setEditingOutputId(output.id);
                        setInstruction("");
                        setEditError(null);
                      }}
                    >
                      Edit this
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">AI-generated concept visual. Not to scale.</p>
        </div>
      )}

      {editingOutputId !== null && (
        <Card>
          <CardHeader>
            <CardTitle>Edit this concept</CardTitle>
            <CardDescription>Describe one change. Costs 1 credit per edit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {editError !== null && (
              <p
                role="alert"
                className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {editError}
              </p>
            )}
            <textarea
              value={instruction}
              maxLength={300}
              rows={3}
              onChange={(event) => {
                setInstruction(event.target.value);
              }}
              placeholder="E.g. make the sofa a deep green, keep everything else the same"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                disabled={editPending || instruction.trim().length < 3}
                onClick={submitEdit}
                aria-busy={editPending}
              >
                {editPending ? "Starting…" : "Apply change"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditingOutputId(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {lightbox !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Concept preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => {
            setLightbox(null);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- signed URL, no optimizer */}
          <img src={lightbox} alt="Concept visual" className="max-h-full max-w-full rounded-lg" />
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-sm"
            onClick={() => {
              setLightbox(null);
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
