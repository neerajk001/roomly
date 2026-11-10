"use client";

import { useRef, useState, useTransition } from "react";
import { Dialog, Tabs } from "radix-ui";
import type { ConceptAdvice, EditTarget } from "@roomdesigner/shared";
import { editTargetRegions } from "@roomdesigner/shared";
import { getConceptAdviceAction } from "@/server/actions/concept-advice";
import type { RenderOutputView } from "./types";
import { ConceptTargetEditor } from "./ConceptTargetEditor";
import { ConceptAdvicePanel } from "./ConceptAdvicePanel";

export function ConceptEditWorkspace({
  objectDetectionAvailable = false,
  roomId,
  output,
  target,
  instruction,
  initialTab = "edit",
  pending,
  error,
  onTarget,
  onInstruction,
  onAdvice,
  onApply,
  onClose,
}: {
  objectDetectionAvailable?: boolean;
  roomId: string;
  output: RenderOutputView;
  target?: EditTarget;
  instruction: string;
  initialTab?: "edit" | "ideas";
  pending: boolean;
  error: string | null;
  onTarget(target: EditTarget | undefined): void;
  onInstruction(text: string): void;
  onAdvice(advice: ConceptAdvice): void;
  onApply(): void;
  onClose(): void;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const returnFocus = useRef<HTMLElement | null>(
    typeof document !== "undefined" && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );
  const [tab, setTab] = useState<string>(initialTab);
  const [analysing, startAnalysis] = useTransition();
  const [analysis, setAnalysis] = useState<{ key: string; advice: ConceptAdvice }>();
  const [analysisError, setAnalysisError] = useState<{ key: string; message: string }>();
  const selectionKey = target ? JSON.stringify(editTargetRegions(target)) : "";
  const selectedAdvice = analysis?.key === selectionKey ? analysis.advice : undefined;
  function analyse() {
    if (!target || pending || analysing) return;
    const key = selectionKey;
    setTab("ideas");
    setAnalysisError(undefined);
    startAnalysis(async () => {
      try {
        const result = await getConceptAdviceAction({
          roomId,
          outputId: output.id,
          editTarget: target,
          intentionHint: instruction.trim() || undefined,
        });
        if (result.advice) setAnalysis({ key, advice: result.advice });
        else
          setAnalysisError({
            key,
            message:
              result.error ?? "Analysis is unavailable. You can still enter your own change.",
          });
      } catch {
        setAnalysisError({
          key,
          message: "Analysis could not be loaded. Please try again or enter your own change.",
        });
      }
    });
  }
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-foreground/40" />
        <Dialog.Content
          aria-describedby="concept-editor-description"
          onOpenAutoFocus={(event) => {
            if (initialTab === "edit") {
              event.preventDefault();
              inputRef.current?.focus({ preventScroll: true });
            }
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocus.current?.focus({ preventScroll: true });
          }}
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => {
            if (pending) event.preventDefault();
          }}
          className="fixed inset-0 z-[80] flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-background text-foreground outline-none"
        >
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-semibold">Edit this concept</Dialog.Title>
              <Dialog.Description
                id="concept-editor-description"
                className="mt-0.5 truncate text-xs text-muted-foreground"
              >
                Editing concept {output.index + 1}
                {output.directionLabel ? ` · ${output.directionLabel}` : ""}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                disabled={pending}
                className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm font-medium disabled:opacity-50"
              >
                Back to designs
              </button>
            </Dialog.Close>
          </header>
          <ConceptTargetEditor
            objectDetectionAvailable={objectDetectionAvailable}
            roomId={roomId}
            outputId={output.id}
            imageUrl={output.url}
            advice={output.advice}
            target={target}
            disabled={pending || analysing}
            onChange={onTarget}
            onAdvice={onAdvice}
            actions={
              <>
                <button
                  type="button"
                  disabled={!target || pending || analysing}
                  aria-busy={analysing}
                  onClick={analyse}
                  className="mb-3 w-full rounded-lg border border-foreground px-4 py-2.5 text-sm font-semibold disabled:opacity-40"
                >
                  {analysing ? "Analysing selected areas…" : "Analyse selected areas"}
                </button>
                <p className="mb-2 text-xs text-muted-foreground">
                  Best quality · 3 credits per edit
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pending || analysing || instruction.trim().length < 3}
                    aria-busy={pending}
                    onClick={onApply}
                    className="flex-1 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {pending ? "Starting…" : "Apply change"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={onClose}
                    className="rounded-lg border border-border px-4 py-3 text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </>
            }
          >
            <Tabs.Root value={tab} onValueChange={setTab}>
              <Tabs.List
                aria-label="Editing tools"
                className="mb-4 grid grid-cols-2 rounded-lg bg-muted p-1"
              >
                {[
                  ["edit", "Your change"],
                  ["ideas", "Ideas"],
                ].map(([value, label]) => (
                  <Tabs.Trigger
                    key={value}
                    value={value ?? "edit"}
                    className="rounded-md px-3 py-2 text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm"
                  >
                    {label}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
              <Tabs.Content
                forceMount
                value="edit"
                className="outline-none data-[state=inactive]:hidden"
              >
                <label htmlFor="concept-edit-instruction" className="text-sm font-semibold">
                  What would you like to change?
                </label>
                <textarea
                  ref={inputRef}
                  id="concept-edit-instruction"
                  aria-label="Describe a change to this concept"
                  value={instruction}
                  maxLength={300}
                  rows={4}
                  disabled={pending}
                  onChange={(event) => onInstruction(event.target.value)}
                  placeholder="E.g. make the sofa deep green"
                  className="mt-2 w-full resize-none rounded-lg border border-border bg-background p-3 text-sm focus-visible:outline-2 focus-visible:outline-primary"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {target
                    ? `Only the marked ${target.label.toLowerCase()} can change.`
                    : "Describe one change. The whole image is available to edit."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["warmer lighting", "add plants", "change rug", "lighter walls"].map(
                    (example) => (
                      <button
                        key={example}
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          onInstruction(example);
                          inputRef.current?.focus();
                        }}
                        className="rounded-lg border border-border px-2.5 py-1.5 text-xs"
                      >
                        {example}
                      </button>
                    ),
                  )}
                </div>
              </Tabs.Content>
              <Tabs.Content
                forceMount
                value="ideas"
                className="outline-none data-[state=inactive]:hidden"
              >
                <ConceptAdvicePanel
                  roomId={roomId}
                  outputId={output.id}
                  advice={target ? selectedAdvice : output.advice}
                  onAdvice={onAdvice}
                  passive={!!target}
                  disabled={pending || analysing}
                  onUse={(text) => {
                    if (pending) return;
                    onInstruction(text);
                    setTab("edit");
                    requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
                  }}
                />
                {analysing && (
                  <p role="status" className="mt-3 text-sm text-muted-foreground">
                    Looking at the whole room and your selected areas. Suggestions will not change
                    the image.
                  </p>
                )}
                {analysisError?.key === selectionKey && (
                  <p role="alert" className="mt-3 text-sm text-destructive">
                    {analysisError.message}
                  </p>
                )}
              </Tabs.Content>
            </Tabs.Root>
            {error && (
              <p
                role="alert"
                className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
              >
                {error}
              </p>
            )}
          </ConceptTargetEditor>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
