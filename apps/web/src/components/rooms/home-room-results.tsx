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
import type {
  RenderJobStatusResponse,
  RenderJobView,
  RenderOutputView,
} from "@/components/renders/types";
import { getStyle } from "@roomdesigner/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";

interface HomeRoomResultsProps {
  objectDetectionAvailable?: boolean;
  roomId: string;
  projectId: string;
  roomLabel: string;
  initialJob: RenderJobView | null;
  history: RenderJobView[];
  sourceUrl: string | null;
  notes: string | null;
}

function styleLabelFor(styleKey: string | null): string {
  if (styleKey === null) return "Modern";
  return getStyle(styleKey)?.label ?? "Modern";
}

export function HomeRoomResults({
  objectDetectionAvailable = false,
  roomId,
  projectId,
  roomLabel,
  initialJob,
  history,
  sourceUrl,
  notes,
}: HomeRoomResultsProps) {
  const router = useRouter();
  const [jobs, setJobs] = useState<RenderJobView[]>(history);
  const [currentId, setCurrentId] = useState<string | null>(initialJob?.id ?? null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [editingOutputId, setEditingOutputId] = useState<string | null>(null);
  const [targets, setTargets] = useState<Record<string, EditTarget | undefined>>({});
  const [editorTab, setEditorTab] = useState<"edit" | "ideas">("edit");
  const [editError, setEditError] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [mode, setMode] = useState<"side" | "slider">("side");
  const [clip, setClip] = useState(50);
  const [createPending, startCreate] = useTransition();
  const [editPending, startEdit] = useTransition();
  const savingFavorites = useRef(new Set<string>());

  const current = jobs.find((job) => job.id === currentId) ?? null;
  const status = current?.status ?? null;
  const includeItemsForRequest = JSON.stringify(current?.includeItems ?? []);
  const outputs = current?.outputs ?? [];
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

  const onRenderComplete = useCallback(() => {
    router.refresh();
  }, [router]);
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

  const submitRestyle = (input: {
    styleKey: string;
    quality: "draft" | "final";
    variations: number;
    notes: string;
  }) => {
    setPanelError(null);
    startCreate(async () => {
      const formData = new FormData();
      formData.set("roomId", roomId);
      formData.set("projectId", projectId);
      formData.set("kind", "RESTYLE");
      formData.set("includeItems", includeItemsForRequest);
      formData.set("styleKey", input.styleKey);
      formData.set("quality", input.quality);
      formData.set("variations", String(input.variations));
      if (input.notes.trim() !== "") formData.set("notes", input.notes);
      const result = await requestRender(formData);
      if (result.error !== undefined) {
        setPanelError(result.error);
        return;
      }
      if (result.jobId !== undefined) {
        startJob(result.jobId, "RESTYLE", "Base concept", input.styleKey);
        router.refresh();
      }
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
        startJob(result.jobId, "EDIT", instruction.slice(0, 40), current?.styleKey ?? null);
        setInstruction("");
        setEditingOutputId(null);
        router.refresh();
      }
    });
  };

  const styleKey = selected?.styleKey ?? current?.styleKey ?? null;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/app" className="text-xs text-muted-foreground underline">
            ← My rooms
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{roomLabel} designs</h1>
        </div>
        {status === "SUCCEEDED" && (
          <button
            type="button"
            disabled={createPending}
            onClick={() =>
              submitRestyle({
                styleKey: styleKey ?? "modern",
                quality: "draft",
                variations: 3,
                notes: notes ?? "",
              })
            }
            className="rounded-lg border border-border bg-card px-3 py-2 text-xs disabled:opacity-50"
          >
            Generate more · 3 credits
          </button>
        )}
      </header>

      {jobs.length > 1 && (
        <details>
          <summary className="cursor-pointer text-sm font-medium">Design history</summary>
          <label className="mt-3 block max-w-md space-y-2 text-sm font-medium">
            Previous generation
            <select
              disabled={editPending}
              value={currentId ?? ""}
              onChange={(event) => {
                setCurrentId(event.target.value);
                setLightbox(null);
                setEditingOutputId(null);
                setEditError(null);
              }}
              className="block h-11 w-full min-w-0 rounded-lg border border-input bg-card px-3 text-sm"
            >
              {jobs.map((job, index) => (
                <option key={job.id} value={job.id}>
                  {job.kind === "EDIT" ? `Edit: ${job.label}` : `Design set ${index + 1}`} ·{" "}
                  {job.status.toLowerCase()}
                </option>
              ))}
            </select>
          </label>
        </details>
      )}

      <RenderStatusNotice message={polling.error} onRetry={polling.retry} />
      {panelError !== null && (
        <p role="alert" className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {panelError}
        </p>
      )}

      {current === null && (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-lg font-semibold text-foreground">Ready to generate</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Create 3 concept visuals from your room photo, style and preferences.
          </p>
          <button
            type="button"
            disabled={createPending}
            onClick={() => {
              submitRestyle({ styleKey: "modern", quality: "draft", variations: 3, notes: "" });
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
          >
            Generate 3 concepts <span aria-hidden="true">→</span>
          </button>
        </div>
      )}

      {current !== null && (status === "QUEUED" || status === "RUNNING") && (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-base font-semibold text-foreground">Generating concepts...</p>
          <p className="mt-1 text-xs text-muted-foreground">
            This usually takes a few seconds. You can leave this page; results are saved.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3" aria-hidden="true">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-xl border border-border bg-foreground/5"
                style={{ animationDelay: `${String(index * 120)}ms` }}
              />
            ))}
          </div>
        </div>
      )}

      {current !== null && status === "FAILED" && (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-base font-semibold text-foreground">That render didn&apos;t work</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {current.errorMessage ?? "Something went wrong."} Your credits were refunded.
          </p>
          <button
            type="button"
            disabled={createPending}
            onClick={() => {
              submitRestyle({
                styleKey: styleKey ?? "modern",
                quality: "draft",
                variations: 3,
                notes: notes ?? "",
              });
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-60"
          >
            Try again
          </button>
        </div>
      )}

      {current !== null && status === "SUCCEEDED" && outputs.length > 0 && (
        <>
          <section>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Choose your favourite design
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose a concept to edit, download or share.
            </p>
            {current.similarConcepts && (
              <p
                role="status"
                className="mt-3 rounded-lg border border-border bg-muted p-3 text-sm"
              >
                Some concepts are visually similar. The automatic variation check has finished; no
                extra credits were charged.
              </p>
            )}
            <ul className="mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 xl:grid-cols-3">
              {outputs.map((output, index) => {
                const label = styleLabelFor(output.styleKey ?? styleKey);
                return (
                  <li key={output.id} className="w-[85%] shrink-0 snap-start sm:w-auto">
                    <article
                      className={`relative flex h-full flex-col overflow-hidden border bg-card ${
                        selected?.id === output.id
                          ? "border-foreground ring-2 ring-foreground"
                          : "border-border"
                      }`}
                    >
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            selectOutput(output.id);
                          }}
                          className="block w-full"
                          aria-label={`Select concept ${String(index + 1)}`}
                          aria-pressed={selected?.id === output.id}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- signed URL */}
                          <img
                            src={output.thumbUrl}
                            alt={`Concept ${String(index + 1)}`}
                            className="h-52 w-full object-cover"
                            loading={index === 0 ? "eager" : "lazy"}
                          />
                        </button>
                        {selected?.id === output.id && (
                          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-xl border border-border bg-accent px-2 py-1 text-[10px] font-semibold tracking-normal text-foreground">
                            <span aria-hidden="true">✦</span> Selected
                          </span>
                        )}
                        <button
                          type="button"
                          aria-pressed={output.isFavorite}
                          aria-label={
                            output.isFavorite ? "Remove from favorites" : "Add to favorites"
                          }
                          onClick={() => {
                            toggleFavorite(output);
                          }}
                          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card text-foreground"
                        >
                          <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill={output.isFavorite ? "currentColor" : "none"}
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8Z" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex flex-1 flex-col p-3">
                        <p className="text-sm font-semibold text-foreground">
                          {String(index + 1).padStart(2, "0")} · {label}
                        </p>
                        {output.directionLabel && (
                          <p className="mt-1 text-xs font-medium">{output.directionLabel}</p>
                        )}
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-[11px] text-muted-foreground">
              AI-generated concept visual. Not to scale.
            </p>
          </section>

          {selected && (
            <section
              aria-label="Selected design actions"
              className="space-y-3 rounded-xl border border-border bg-card p-4"
            >
              <p className="text-sm font-medium" role="status">
                Selected concept {selected.index + 1}
                {selected.directionLabel ? " · " + selected.directionLabel : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={editPending}
                  onClick={() => openEditor(selected.id)}
                  className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Edit this design
                </button>
                <a
                  href={"/api/render-outputs/" + selected.id + "/download"}
                  className="rounded-lg border border-border px-4 py-2.5 text-sm"
                >
                  Download
                </a>
                <a
                  href="#share-room"
                  onClick={() => router.refresh()}
                  className="rounded-lg border border-border px-4 py-2.5 text-sm"
                >
                  Share
                </a>
                <button
                  type="button"
                  onClick={() => setLightbox("/api/render-outputs/" + selected.id + "/file")}
                  className="rounded-lg border border-border px-4 py-2.5 text-sm"
                >
                  View full design
                </button>
              </div>
              <details>
                <summary className="cursor-pointer text-sm">Ideas & versions</summary>
                <div className="mt-3 space-y-3">
                  <button
                    type="button"
                    onClick={() => openEditor(selected.id, undefined, "ideas")}
                    className="rounded-lg border px-3 py-2 text-sm"
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
            </section>
          )}

          <details className="min-w-0 rounded-xl border border-border bg-card p-3">
            <summary className="cursor-pointer text-sm font-medium">Compare before & after</summary>
            <section className="rounded-xl border border-border bg-card">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-3 py-2.5">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Before / After</h2>
                  <p className="text-[11px] text-muted-foreground">
                    See how your space transforms.
                  </p>
                </div>
                <div className="flex rounded-xl border border-border text-[11px] font-semibold">
                  <button
                    type="button"
                    aria-pressed={mode === "side"}
                    onClick={() => {
                      setMode("side");
                    }}
                    className={
                      mode === "side"
                        ? "bg-primary px-3 py-1.5 text-white"
                        : "bg-card px-3 py-1.5 text-foreground"
                    }
                  >
                    Side by side
                  </button>
                  <button
                    type="button"
                    aria-pressed={mode === "slider"}
                    onClick={() => {
                      setMode("slider");
                    }}
                    className={
                      mode === "slider"
                        ? "bg-primary px-3 py-1.5 text-white"
                        : "bg-card px-3 py-1.5 text-foreground"
                    }
                  >
                    Slider
                  </button>
                </div>
              </div>
              <div className="p-3">
                {sourceUrl === null ? (
                  <p className="py-10 text-center text-xs text-muted-foreground">
                    Add a room photo to see the before / after comparison.
                  </p>
                ) : mode === "side" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <figure className="relative overflow-hidden rounded-xl border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element -- signed URL */}
                      <img src={sourceUrl} alt="Before" className="h-56 w-full object-cover" />
                      <figcaption className="absolute bottom-2 left-2 bg-foreground px-2 py-1 text-[10px] font-semibold tracking-normal text-white">
                        Before
                      </figcaption>
                    </figure>
                    <figure className="relative overflow-hidden rounded-xl border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element -- signed URL */}
                      <img
                        src={selected?.url ?? ""}
                        alt="After"
                        className="h-56 w-full object-cover"
                      />
                      <figcaption className="absolute bottom-2 right-2 bg-foreground px-2 py-1 text-[10px] font-semibold tracking-normal text-white">
                        After (selected concept)
                      </figcaption>
                    </figure>
                  </div>
                ) : (
                  <div>
                    <div className="relative overflow-hidden rounded-xl border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element -- signed URL */}
                      <img
                        src={sourceUrl}
                        alt="Before"
                        className="block h-56 w-full object-cover"
                      />
                      <div
                        className="absolute inset-0 overflow-hidden"
                        style={{ width: `${String(clip)}%` }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- signed URL */}
                        <img
                          src={selected?.url ?? ""}
                          alt="After"
                          className="block h-full object-cover"
                          style={{
                            width: `${String(10000 / Math.max(clip, 1))}%`,
                            maxWidth: "none",
                          }}
                        />
                      </div>
                      <span className="absolute bottom-2 left-2 bg-foreground px-2 py-1 text-[10px] font-semibold tracking-normal text-white">
                        Before
                      </span>
                      <span className="absolute bottom-2 right-2 bg-foreground px-2 py-1 text-[10px] font-semibold tracking-normal text-white">
                        After
                      </span>
                    </div>
                    <label className="mt-2 block text-[11px] text-muted-foreground">
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
                        className="mt-1 w-full accent-primary"
                      />
                    </label>
                  </div>
                )}
              </div>
            </section>
          </details>
        </>
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
