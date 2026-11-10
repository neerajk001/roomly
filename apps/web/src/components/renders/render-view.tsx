"use client";

import { ConceptPreview } from "@/components/renders/ConceptPreview";
import { ConceptEditWorkspace } from "@/components/renders/ConceptEditWorkspace";
import { useConceptSelection } from "@/components/renders/use-concept-selection";
import { ConceptEditHistory } from "@/components/renders/ConceptEditHistory";
import type { ConceptAdvice, EditTarget } from "@roomdesigner/shared";
import { requestRender } from "@/lib/request-render";
import { useRenderPolling } from "@/components/renders/use-render-polling";
import { RenderStatusNotice } from "@/components/renders/RenderStatusNotice";
import { saveFavorite } from "@/lib/save-favorite";
import { track } from "@/lib/analytics";
import { GeneratePanel, type RestyleRequest } from "@/components/renders/generate-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  RenderJobStatusResponse,
  RenderJobView,
  RenderOutputView,
} from "@/components/renders/types";
import { STYLES } from "@roomdesigner/shared";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useRef, useState, useTransition } from "react";

export function RenderView({
  roomType,
  objectDetectionAvailable = false,
  roomId,
  projectId,
  hasPhoto,
  initialJob,
  history,
  sourceUrl,
}: {
  roomType: string;
  objectDetectionAvailable?: boolean;
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
  const [targets, setTargets] = useState<Record<string, EditTarget | undefined>>({});
  const [editorTab, setEditorTab] = useState<"edit" | "ideas">("edit");
  const [editError, setEditError] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [lastRestyle, setLastRestyle] = useState<RestyleRequest | null>(null);
  const [createPending, startCreate] = useTransition();
  const [editPending, startEdit] = useTransition();
  const [clip, setClip] = useState(50);
  const [altStyle, setAltStyle] = useState("scandinavian");
  const [compareOpen, setCompareOpen] = useState(false);
  const trackedSuccess = useRef<Set<string>>(new Set());
  const savingFavorites = useRef(new Set<string>());

  const current = jobs.find((job) => job.id === currentId) ?? null;
  const favorites = (current?.outputs ?? []).filter((output) => output.isFavorite);
  const status = current?.status ?? null;
  const includeItemsForRequest = JSON.stringify(current?.includeItems ?? []);
  const { selected, choose, drafts, setDraft } = useConceptSelection(
    roomId,
    jobs,
    currentId,
    setCurrentId,
  );
  const instruction = editingOutputId ? (drafts[editingOutputId] ?? "") : "";
  const setInstruction = (text: string) => {
    if (editingOutputId) setDraft(editingOutputId, text);
  };
  const editingTarget = jobs
    .flatMap((job) => job.outputs)
    .find((output) => output.id === editingOutputId);
  const selectOutput = (outputId: string, jobId = currentId) => {
    if (editPending) return;
    choose(outputId, jobId);
    setEditingOutputId(null);
    setEditError(null);
  };
  const openEditor = (outputId: string, text?: string, tab: "edit" | "ideas" = "edit") => {
    if (editPending) return;
    choose(outputId);
    setEditingOutputId(outputId);
    setEditError(null);
    if (text !== undefined) setDraft(outputId, text);
    setEditorTab(tab);
  };
  const rememberAdvice = (outputId: string, advice: ConceptAdvice) =>
    setJobs((previous) =>
      previous.map((job) => ({
        ...job,
        outputs: job.outputs.map((output) =>
          output.id === outputId ? { ...output, advice } : output,
        ),
      })),
    );

  const upsertJob = useCallback((incoming: RenderJobStatusResponse) => {
    setJobs((previous) => {
      const view: RenderJobView = {
        id: incoming.id,
        kind: incoming.kind,
        status: incoming.status,
        errorMessage: incoming.errorMessage,
        creditsCharged: incoming.creditsCharged,
        outputs: incoming.outputs,
        label: incoming.label ?? (incoming.kind === "EDIT" ? "Edit" : "Base concept"),
        sourceOutputId: incoming.sourceOutputId ?? null,
        editTarget: incoming.editTarget,
        includeItems: incoming.includeItems,
        styleKey: incoming.styleKey,
        similarConcepts: incoming.similarConcepts ?? false,
      };
      return previous.some((job) => job.id === view.id)
        ? previous.map((job) => (job.id === view.id ? view : job))
        : [...previous, view];
    });
  }, []);

  const startJob = useCallback(
    (jobId: string, kind: "RESTYLE" | "EDIT", label: string, styleKey: string | null) => {
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
                styleKey,
              },
            ],
      );
      setCurrentId(jobId);
    },
    [],
  );

  const submitRestyle = (request: RestyleRequest) => {
    setPanelError(null);
    setLastRestyle(request);
    startCreate(async () => {
      const formData = new FormData();
      formData.set("roomId", roomId);
      formData.set("projectId", projectId);
      formData.set("kind", "RESTYLE");
      formData.set(
        "includeItems",
        request.includeItems !== undefined
          ? JSON.stringify(request.includeItems)
          : includeItemsForRequest,
      );
      formData.set("styleKey", request.styleKey);
      formData.set("quality", request.quality);
      formData.set("variations", String(request.variations));
      if (request.notes.trim() !== "") formData.set("notes", request.notes);
      if (request.stagingItems.length > 0) {
        formData.set("stagingItems", JSON.stringify(request.stagingItems));
      }
      const result = await requestRender(formData);
      if (result.error !== undefined) {
        setPanelError(result.error);
        return;
      }
      if (result.jobId !== undefined) {
        track("render_requested", { kind: "RESTYLE", variations: request.variations });
        startJob(result.jobId, "RESTYLE", "Base concept", request.styleKey);
        router.refresh();
      }
    });
  };

  const onRenderComplete = useCallback(
    (data: RenderJobStatusResponse) => {
      if (data.status === "SUCCEEDED" && !trackedSuccess.current.has(data.id)) {
        trackedSuccess.current.add(data.id);
        track("render_succeeded", { kind: data.kind, images: data.outputs.length });
      }
      router.refresh();
    },
    [router],
  );
  const polling = useRenderPolling(currentId, status, upsertJob, onRenderComplete);

  const toggleFavorite = (output: RenderOutputView) => {
    if (savingFavorites.current.has(output.id)) return;
    savingFavorites.current.add(output.id);
    setPanelError(null);
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
    void saveFavorite(output.id, next)
      .catch(() => {
        setJobs((previous) =>
          previous.map((job) => ({
            ...job,
            outputs: job.outputs.map((item) =>
              item.id === output.id ? { ...item, isFavorite: output.isFavorite } : item,
            ),
          })),
        );
        setPanelError("Your favorite could not be saved. Please try again.");
      })
      .finally(() => savingFavorites.current.delete(output.id));
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
      if (targets[editingOutputId])
        formData.set("editTarget", JSON.stringify(targets[editingOutputId]));
      formData.set("instruction", instruction);
      formData.set("quality", "final");
      formData.set("variations", "1");
      const result = await requestRender(formData);
      if (result.error !== undefined) {
        setEditError(result.error);
        return;
      }
      if (result.jobId !== undefined) {
        track("render_requested", { kind: "EDIT", variations: 1 });
        startJob(result.jobId, "EDIT", instruction.slice(0, 40), null);
        setInstruction("");
        setEditingOutputId(null);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      <details
        open={current === null || status === "FAILED" || !!panelError}
        className="rounded-xl border border-border bg-card p-4"
      >
        <summary className="cursor-pointer text-sm font-semibold">Generate concepts</summary>
        <div className="mt-4">
          {" "}
          <GeneratePanel
            roomType={roomType}
            hasPhoto={hasPhoto}
            pending={createPending}
            error={panelError}
            onCreate={submitRestyle}
          />
        </div>
      </details>

      <RenderStatusNotice message={polling.error} onRetry={polling.retry} />
      {jobs.length > 1 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Render history">
          {jobs.map((job, index) => (
            <button
              key={job.id}
              type="button"
              onClick={() => {
                if (editPending) return;
                setCurrentId(job.id);
                setEditingOutputId(null);
                setEditError(null);
              }}
              disabled={editPending}
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

      {current?.status === "SUCCEEDED" && current.similarConcepts && (
        <p role="status" className="rounded-lg border border-border bg-muted p-3 text-sm">
          Some concepts are visually similar. The automatic variation check has finished; no extra
          credits were charged.
        </p>
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
              <img
                src={output.url}
                alt={`Favorite ${String(index + 1)}`}
                className="block w-full"
              />
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
          <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3">
            {current.outputs.map((output) => (
              <li
                key={output.id}
                className={
                  "group relative w-[85%] shrink-0 snap-start overflow-hidden rounded-lg border sm:w-auto " +
                  (selected?.id === output.id
                    ? "border-foreground ring-2 ring-inset ring-foreground"
                    : "border-border")
                }
              >
                <button
                  type="button"
                  className="block w-full"
                  onClick={() => {
                    selectOutput(output.id);
                  }}
                  aria-label={`Select concept ${String(output.index + 1)}`}
                  aria-pressed={selected?.id === output.id}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed URL, no optimizer */}
                  <img
                    src={output.thumbUrl}
                    alt={`Concept ${String(output.index + 1)}`}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-[1.02]"
                  />
                </button>

                {output.directionLabel && (
                  <p className="border-t border-border px-2 py-1.5 text-xs font-medium">
                    {output.directionLabel}
                  </p>
                )}
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
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            AI-generated concept visual. Not to scale.
          </p>

          {current?.status === "SUCCEEDED" && selected && (
            <div className="space-y-3">
              <p className="text-sm font-medium" role="status">
                Selected concept {selected.index + 1}
                {selected.directionLabel ? ` · ${selected.directionLabel}` : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => openEditor(selected.id)}>
                  Edit this
                </Button>
                <a
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                  href={"/api/render-outputs/" + selected.id + "/download"}
                >
                  Download
                </a>
                <Link
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                  href={"/studio/projects/" + projectId + "/proposals/new?pin=" + selected.id}
                >
                  Pin to proposal
                </Link>
                <button
                  type="button"
                  onClick={() => setLightbox(selected.url)}
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                >
                  View full design
                </button>
              </div>
              <details>
                <summary className="cursor-pointer text-sm">Ideas & versions</summary>
                <div className="mt-3 space-y-3">
                  {" "}
                  <button
                    type="button"
                    onClick={() => openEditor(selected.id, undefined, "ideas")}
                    className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium"
                  >
                    Explore suggestions →
                  </button>
                  <ConceptEditHistory
                    jobs={jobs}
                    outputId={selected.id}
                    onSelect={(jobId, outputId) => selectOutput(outputId, jobId)}
                  />
                </div>
              </details>
            </div>
          )}

          {sourceUrl !== undefined && sourceUrl !== null && selected !== null && (
            <details className="space-y-2">
              <summary className="cursor-pointer text-sm font-medium">
                Compare before & after
              </summary>
              <div className="relative overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element -- signed URL */}
                <img src={sourceUrl} alt="Before" className="block w-full" />
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${String(clip)}%` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed URL */}
                  <img
                    src={selected.url}
                    alt="After"
                    className="block h-full w-full object-cover"
                    style={{ width: `${String(10000 / Math.max(clip, 1))}%`, maxWidth: "none" }}
                  />
                </div>
                <span className="absolute bottom-2 left-2 rounded bg-foreground/60 px-2 py-0.5 text-xs text-white">
                  Before
                </span>
                <span className="absolute bottom-2 right-2 rounded bg-foreground/60 px-2 py-0.5 text-xs text-white">
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
            </details>
          )}
        </div>
      )}

      {editingOutputId !== null && editingTarget && (
        <ConceptEditWorkspace
          key={editingTarget.id}
          objectDetectionAvailable={objectDetectionAvailable}
          roomId={roomId}
          output={editingTarget}
          target={targets[editingTarget.id]}
          instruction={instruction}
          initialTab={editorTab}
          pending={editPending}
          error={editError}
          onTarget={(target) =>
            setTargets((previous) => ({ ...previous, [editingTarget.id]: target }))
          }
          onInstruction={setInstruction}
          onAdvice={(advice) => rememberAdvice(editingTarget.id, advice)}
          onApply={submitEdit}
          onClose={() => setEditingOutputId(null)}
        />
      )}

      {lightbox !== null && <ConceptPreview url={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
