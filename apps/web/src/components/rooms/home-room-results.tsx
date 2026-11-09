"use client";

import { ConceptTargetEditor } from "@/components/renders/ConceptTargetEditor";
import { useConceptSelection } from "@/components/renders/use-concept-selection";
import { ConceptAdvicePanel } from "@/components/renders/ConceptAdvicePanel";
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
import { formatMoney, getStyle } from "@roomdesigner/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

export interface EstimateSummary {
  currency: string;
  lowMinor: number;
  highMinor: number;
  top: { label: string; totalMinor: number }[];
}

interface HomeRoomResultsProps {
  roomId: string;
  projectId: string;
  roomLabel: string;
  dimensions: string;
  initialJob: RenderJobView | null;
  history: RenderJobView[];
  sourceUrl: string | null;
  estimate: EstimateSummary;
  keepList: string[];
  notes: string | null;
}

function styleLabelFor(styleKey: string | null): string {
  if (styleKey === null) return "Modern";
  return getStyle(styleKey)?.label ?? "Modern";
}

function styleDescription(styleKey: string | null): string {
  const hint = styleKey === null ? undefined : getStyle(styleKey)?.promptHint;
  if (hint === undefined) return "A fresh concept based on your room and preferences.";
  return hint.charAt(0).toUpperCase() + hint.slice(1) + ".";
}

export function HomeRoomResults({
  roomId,
  projectId,
  roomLabel,
  dimensions,
  initialJob,
  history,
  sourceUrl,
  estimate,
  keepList,
  notes,
}: HomeRoomResultsProps) {
  const router = useRouter();
  const [jobs, setJobs] = useState<RenderJobView[]>(history);
  const [currentId, setCurrentId] = useState<string | null>(initialJob?.id ?? null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [editingOutputId, setEditingOutputId] = useState<string | null>(null);
  const [targets, setTargets] = useState<Record<string, EditTarget | undefined>>({});
  const editorRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!editingOutputId) return;
    editorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    editorRef.current?.focus({ preventScroll: true });
  }, [editingOutputId]);
  const [editError, setEditError] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [mode, setMode] = useState<"side" | "slider">("side");
  const [clip, setClip] = useState(50);
  const [createPending, startCreate] = useTransition();
  const [editPending, startEdit] = useTransition();
  const savingFavorites = useRef(new Set<string>());

  const current = jobs.find((job) => job.id === currentId) ?? null;
  const status = current?.status ?? null;
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
  const openEditor = (outputId: string, text?: string) => {
    if (editPending) return;
    choose(outputId);
    setEditingOutputId(outputId);
    setEditError(null);
    if (text !== undefined) setDraft(outputId, text);
    if (editingOutputId === outputId) {
      editorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      editorRef.current?.focus({ preventScroll: true });
    }
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

  const submitRestyle = useCallback(
    (input: {
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
    },
    [projectId, roomId, router, startJob],
  );

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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/app/spaces"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <span aria-hidden="true">←</span> Back to my spaces
          </Link>
          <h1 className="mt-2 text-4xl font-semibold leading-[1.02] tracking-tight text-foreground sm:text-5xl">
            {status === "SUCCEEDED"
              ? "Your room, reimagined."
              : `Design your ${roomLabel.toLowerCase()}`}
          </h1>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            {roomLabel} · {dimensions}
          </p>
        </div>
        <div className="flex flex-wrap items-stretch gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-accent text-foreground">
              {status === "SUCCEEDED" ? (
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="4 10 8 14 16 5" />
                </svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                </svg>
              )}
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {status === "SUCCEEDED"
                  ? `${String(outputs.length)} concepts ready`
                  : status === "FAILED"
                    ? "Generation failed"
                    : status === null
                      ? "Ready to generate"
                      : "Generating concepts..."}
              </p>
              <p className="mt-0.5 max-w-[230px] text-[11px] leading-snug text-muted-foreground">
                {status === "SUCCEEDED"
                  ? "Based on your photo and preferences."
                  : status === "FAILED"
                    ? (current?.errorMessage ?? "Your credits were refunded.")
                    : status === null
                      ? "Create 3 concepts from your room photo."
                      : "This usually takes a few seconds."}
              </p>
            </div>
          </div>
          {status === "SUCCEEDED" && (
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
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all   hover:shadow-sm disabled:opacity-60"
            >
              Generate more
              <span aria-hidden="true">✦</span>
            </button>
          )}
          <Link
            href={`/app/projects/${projectId}`}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-foreground hover:text-white"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            Edit brief
          </Link>
        </div>
      </div>

      {jobs.length > 1 && (
        <label className="block max-w-md space-y-2 text-sm font-medium">
          Design history
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
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Choose your favourite design
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {outputs.length} concept visuals based on your room, style and budget.
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
            <ul className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {outputs.map((output, index) => {
                const label = styleLabelFor(output.styleKey ?? styleKey);
                return (
                  <li key={output.id}>
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
                            setLightbox(`/api/render-outputs/${output.id}/file`);
                          }}
                          className="block w-full"
                          aria-label={`View concept ${String(index + 1)} full size`}
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
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                          {styleDescription(output.styleKey ?? styleKey)}
                        </p>
                        <button
                          type="button"
                          disabled={editPending}
                          aria-pressed={selected?.id === output.id}
                          onClick={() => selectOutput(output.id)}
                          className="mt-3 rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium"
                        >
                          Select concept {index + 1}
                        </button>
                        <div className="mt-auto flex gap-2 pt-3">
                          <button
                            type="button"
                            onClick={() => {
                              selectOutput(output.id);
                              setLightbox(`/api/render-outputs/${output.id}/file`);
                            }}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-primary px-3 py-2 text-[11px] font-semibold text-white"
                          >
                            View full design <span aria-hidden="true">→</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              openEditor(output.id);
                              setEditError(null);
                            }}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-[11px] font-semibold text-foreground hover:bg-foreground/5"
                          >
                            <svg
                              className="h-3.5 w-3.5"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                            Edit this design
                          </button>
                        </div>
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

          {current?.status === "SUCCEEDED" && selected && (
            <div className="space-y-3">
              <p className="text-sm font-medium" role="status">
                Selected concept {selected.index + 1}
                {selected.directionLabel ? ` · ${selected.directionLabel}` : ""}
              </p>
              <ConceptAdvicePanel
                key={selected.id}
                roomId={roomId}
                outputId={selected.id}
                advice={selected.advice}
                onAdvice={(advice) => rememberAdvice(selected.id, advice)}
                onUse={(text) => openEditor(selected.id, text)}
              />
              <ConceptEditHistory
                jobs={jobs}
                outputId={selected.id}
                onSelect={(jobId, outputId) => selectOutput(outputId, jobId)}
              />
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
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

            <section className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Estimated cost range</h2>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                    Based on your room measurements and selected scope. This range is shared across
                    concepts; prices may vary by location and provider.
                  </p>
                </div>
                <span className="shrink-0 rounded-xl border border-border bg-card px-2 py-1 text-[11px] font-semibold">
                  {estimate.currency}
                </span>
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                {formatMoney(estimate.lowMinor, estimate.currency)} –{" "}
                {formatMoney(estimate.highMinor, estimate.currency)}
              </p>
              <p className="mt-4 text-xs font-semibold text-foreground">
                Suggested estimate priorities
              </p>
              <ul className="mt-2 divide-y divide-border">
                {estimate.top.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center justify-between gap-2 py-2 text-xs"
                  >
                    <span className="truncate text-muted-foreground">{item.label}</span>
                    <span className="shrink-0 font-semibold text-foreground">
                      {formatMoney(item.totalMinor, estimate.currency)}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href="#cost-breakdown"
                className="mt-3 block rounded-xl border border-border bg-card px-3 py-2 text-center text-xs font-semibold text-foreground transition-colors hover:bg-foreground hover:text-white"
              >
                View itemized costs →
              </Link>
            </section>
          </div>

          <details className="rounded-xl border border-border bg-card">
            <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-foreground">
              <span className="flex items-center gap-2">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="18" height="18" />
                  <path d="M3 9h18" />
                  <path d="M9 21V9" />
                </svg>
                Room details &amp; selected items
              </span>
              <span aria-hidden="true">⌄</span>
            </summary>
            <div className="border-t border-border px-4 py-3">
              <dl className="grid gap-3 text-xs sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Room</dt>
                  <dd className="font-semibold text-foreground">{roomLabel}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Dimensions</dt>
                  <dd className="font-semibold text-foreground">{dimensions}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Keep items</dt>
                  <dd className="font-semibold text-foreground">
                    {keepList.length > 0 ? keepList.join(", ") : "None"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Notes</dt>
                  <dd className="font-semibold text-foreground">
                    {notes === null || notes === "" ? "None" : notes}
                  </dd>
                </div>
              </dl>
            </div>
          </details>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/app/spaces"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground"
            >
              <span aria-hidden="true">←</span> Back to my spaces
            </Link>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (selected !== null) toggleFavorite(selected);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-foreground/5"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 3h12v18l-6-4-6 4z" />
                </svg>
                Save to my spaces
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selected !== null) {
                    openEditor(selected.id);
                    setEditError(null);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
              >
                Edit this design <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </>
      )}

      {editingOutputId !== null && (
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-base font-semibold text-foreground">Edit this concept</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Describe one change. Edits run at best quality (3 credits).
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {["warmer lighting", "add plants", "change rug", "lighter walls"].map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  setInstruction(example);
                }}
                className="rounded-xl border border-border bg-card px-2.5 py-1 text-xs text-foreground hover:bg-foreground/5"
              >
                {example}
              </button>
            ))}
          </div>
          {editError !== null && (
            <p
              role="alert"
              className="mt-2 border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {editError}
            </p>
          )}
          {editingTarget && (
            <div className="my-3 flex items-center gap-3 rounded-lg border border-border bg-muted p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- signed concept thumbnail */}
              <img
                src={editingTarget.thumbUrl}
                alt="Concept being edited"
                className="h-16 w-20 rounded object-cover"
              />
              <p className="text-sm font-medium">
                Editing concept {editingTarget.index + 1}
                {editingTarget.directionLabel ? ` · ${editingTarget.directionLabel}` : ""}
              </p>
            </div>
          )}
          {editingTarget && (
            <ConceptTargetEditor
              key={editingTarget.id}
              roomId={roomId}
              outputId={editingTarget.id}
              imageUrl={editingTarget.url}
              advice={editingTarget.advice}
              target={targets[editingTarget.id]}
              disabled={editPending}
              onChange={(target) =>
                setTargets((previous) => ({ ...previous, [editingTarget.id]: target }))
              }
              onAdvice={(advice) => rememberAdvice(editingTarget.id, advice)}
            />
          )}
          <textarea
            ref={editorRef}
            aria-label="Describe a change to this concept"
            value={instruction}
            maxLength={300}
            rows={3}
            onChange={(event) => {
              setInstruction(event.target.value);
            }}
            placeholder="E.g. make the sofa a deep green, keep everything else the same"
            className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              disabled={editPending || instruction.trim().length < 3}
              onClick={submitEdit}
              aria-busy={editPending}
              className="rounded-xl border border-border bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {editPending ? "Starting..." : "Apply change"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingOutputId(null);
              }}
              className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {lightbox !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Concept preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/70 p-4"
          onClick={() => {
            setLightbox(null);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- signed URL */}
          <img
            src={lightbox}
            alt="Concept visual"
            className="max-h-full max-w-full rounded-xl border border-border bg-card"
          />
          <button
            type="button"
            className="absolute right-4 top-4 rounded-xl border border-border bg-card px-3 py-1 text-sm font-semibold text-foreground"
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
