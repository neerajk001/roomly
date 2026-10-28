"use client";

import { createRenderAction } from "@/server/actions/renders";
import { track } from "@/lib/analytics";
import { GeneratePanel, type RestyleRequest } from "@/components/renders/generate-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  RenderJobStatusResponse,
  RenderJobView,
  RenderOutputView,
} from "@/components/renders/types";
import { isTerminal } from "@/components/renders/types";
import { STYLES } from "@roomdesigner/shared";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

export function RenderView({
  roomId,
  projectId,
  hasPhoto,
  initialJob,
  history,
  sourceUrl,
}: {
  roomId: string;
  projectId: string;
  hasPhoto: boolean;
  initialJob: RenderJobView | null;
  history: RenderJobView[];
  sourceUrl?: string | null;
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
  const [clip, setClip] = useState(50);
  const [altStyle, setAltStyle] = useState("scandinavian");
  const [compareOpen, setCompareOpen] = useState(false);
  const trackedSuccess = useRef<Set<string>>(new Set());
  const attempts = useRef(0);

  const current = jobs.find((job) => job.id === currentId) ?? null;
  const favorites = (current?.outputs ?? []).filter((output) => output.isFavorite);
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
        if (request.stagingItems.length > 0) {
          formData.set("stagingItems", JSON.stringify(request.stagingItems));
        }
        const result = await createRenderAction({}, formData);
        if (result.error !== undefined) {
          setPanelError(result.error);
          return;
        }
        if (result.jobId !== undefined) {
          track("render_requested", { kind: "RESTYLE", variations: request.variations });
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
              if (data.status === "SUCCEEDED" && !trackedSuccess.current.has(data.id)) {
                trackedSuccess.current.add(data.id);
                track("render_succeeded", { kind: data.kind, images: data.outputs.length });
              }
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
      formData.set("quality", "final");
      formData.set("variations", "1");
      const result = await createRenderAction({}, formData);
      if (result.error !== undefined) {
        setEditError(result.error);
        return;
      }
      if (result.jobId !== undefined) {
        track("render_requested", { kind: "EDIT", variations: 1 });
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

      {current !== null && current.status === "SUCCEEDED" && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <label htmlFor="alt-style" className="block text-xs text-muted-foreground">
              Try another style
            </label>
            <select
              id="alt-style"
              value={altStyle}
              onChange={(event) => {
                setAltStyle(event.target.value);
              }}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
            >
              {STYLES.map((style) => (
                <option key={style.key} value={style.key}>
                  {style.label}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={createPending}
            onClick={() => {
              submitRestyle({
                styleKey: altStyle,
                quality: "draft",
                variations: 3,
                notes: "",
                stagingItems: [],
              });
            }}
          >
            Generate in this style (3 credits)
          </Button>
          {favorites.length >= 2 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setCompareOpen((open) => !open);
              }}
            >
              {compareOpen ? "Hide comparison" : "Compare favorites"}
            </Button>
          )}
        </div>
      )}

      {compareOpen && favorites.length >= 2 && (
        <div className="grid grid-cols-2 gap-2">
          {favorites.slice(0, 2).map((output, index) => (
            <figure key={output.id} className="overflow-hidden rounded-lg border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element -- signed URL, no optimizer */}
              <img src={output.url} alt={`Favorite ${String(index + 1)}`} className="block w-full" />
              <figcaption className="border-t border-border px-2 py-1 text-xs text-muted-foreground">
                Favorite {String(index + 1)}
              </figcaption>
            </figure>
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
                    setLightbox(`/api/render-outputs/${output.id}/file`);
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
                      href={`/api/render-outputs/${output.id}/file?variant=download`}
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

          {sourceUrl !== undefined && sourceUrl !== null && current.outputs[0] !== undefined && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Before / after</p>
              <div className="relative overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element -- signed URL */}
                <img src={sourceUrl} alt="Before" className="block w-full" />
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${String(clip)}%` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed URL */}
                  <img
                    src={current.outputs[0].url}
                    alt="After"
                    className="block h-full w-full object-cover"
                    style={{ width: `${String(10000 / Math.max(clip, 1))}%`, maxWidth: "none" }}
                  />
                </div>
                <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                  Before
                </span>
                <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                  After
                </span>
              </div>
              <label className="block text-xs text-muted-foreground">
                Drag to compare
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={clip}
                  aria-label="Before and after slider"
                  onChange={(event) => {
                    setClip(Number(event.target.value));
                  }}
                  className="mt-1 w-full"
                />
              </label>
            </div>
          )}
        </div>
      )}

      {editingOutputId !== null && (
        <Card>
          <CardHeader>
            <CardTitle>Edit this concept</CardTitle>
            <CardDescription>Describe one change. Edits run at best quality (3 credits).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {["warmer lighting", "add plants", "change rug", "lighter walls"].map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => {
                    setInstruction(example);
                  }}
                  className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted/50"
                >
                  {example}
                </button>
              ))}
            </div>
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
