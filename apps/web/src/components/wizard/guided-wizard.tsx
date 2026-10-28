"use client";

import { createGuidedProjectAction, goToRoomAction } from "@/server/actions/wizard";
import { createRenderAction } from "@/server/actions/renders";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  STYLES,
  STYLE_QUIZ_PAIRS,
  formatMoney,
  getStyle,
  recommendStyles,
  typicalSizeFor,
  totalCreditCost,
} from "@roomdesigner/shared";
import { track } from "@/lib/analytics";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "roomly:guided-wizard:v1";
const MAX_PHOTOS = 3;

const ROOM_TYPES = [
  ["LIVING_ROOM", "Living room"],
  ["BEDROOM", "Bedroom"],
  ["KITCHEN", "Kitchen"],
  ["BATHROOM", "Bathroom"],
  ["DINING_ROOM", "Dining room"],
  ["HOME_OFFICE", "Home office"],
  ["KIDS_ROOM", "Kids room"],
  ["BALCONY", "Balcony"],
  ["HALLWAY", "Hallway"],
  ["OTHER", "Other"],
] as const;

const KEEP_CHIPS = ["sofa", "flooring", "curtains", "bed", "cabinets"];
const STEPS = ["Photo", "Room", "Keep", "Renter", "Budget", "Style", "Confirm"];

interface Draft {
  step: number;
  roomType: string;
  width: string;
  length: string;
  height: string;
  useTypical: boolean;
  keepList: string[];
  customKeep: string;
  renterMode: boolean;
  budget: string;
  picks: Record<string, string>;
  quizDone: boolean;
  skipQuiz: boolean;
  styleKey: string;
}

const initialDraft: Draft = {
  step: 0,
  roomType: "LIVING_ROOM",
  width: "",
  length: "",
  height: "",
  useTypical: false,
  keepList: [],
  customKeep: "",
  renterMode: false,
  budget: "",
  picks: {},
  quizDone: false,
  skipQuiz: false,
  styleKey: "modern",
};

function minorFromMajor(value: string, currency: string): number | null {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * (currency === "JPY" ? 1 : 100));
}

function mmFromMetres(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 1000);
}

export function GuidedWizard({ currency }: { currency: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  useEffect(() => {
    track("wizard_started");
  }, []);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
        setDraft({ ...initialDraft, ...(JSON.parse(raw) as Partial<Draft>) });
      } catch {
        // ignore corrupt draft
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  const patch = (next: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...next }));
  };

  const recommendation = useMemo(() => recommendStyles(Object.values(draft.picks)), [draft.picks]);
  const selectedStyle = getStyle(draft.styleKey) ?? STYLES[0];
  const totalCost = totalCreditCost("draft", 3);

  const addKeep = (value: string) => {
    const trimmed = value.trim().slice(0, 40);
    if (trimmed === "" || draft.keepList.length >= 10) return;
    if (draft.keepList.some((item) => item.toLowerCase() === trimmed.toLowerCase())) return;
    patch({ keepList: [...draft.keepList, trimmed], customKeep: "" });
  };

  const canContinue = (): boolean => {
    if (draft.step === 0) return files.length >= 1;
    if (draft.step === 1) return draft.roomType !== "";
    return true;
  };

  const next = () => {
    setError(null);
    if (!canContinue()) {
      setError(draft.step === 0 ? "Add at least one photo of the room." : "Choose a room type.");
      return;
    }
    const step = Math.min(draft.step + 1, STEPS.length - 1);
    if (step === 6 && recommendation[0] !== undefined && draft.quizDone) {
      patch({ step, styleKey: draft.styleKey === "" ? recommendation[0] : draft.styleKey });
    } else {
      patch({ step });
    }
  };

  const back = () => {
    setError(null);
    patch({ step: Math.max(0, draft.step - 1) });
  };

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      setProgress("Creating your project…");
      const typical = typicalSizeFor(draft.roomType);
      const widthMm = draft.useTypical ? typical.widthMm : mmFromMetres(draft.width);
      const lengthMm = draft.useTypical ? typical.lengthMm : mmFromMetres(draft.length);
      const heightMm = draft.useTypical ? typical.heightMm : mmFromMetres(draft.height);

      const payload = {
        roomType: draft.roomType,
        widthMm,
        lengthMm,
        heightMm,
        renterMode: draft.renterMode,
        keepList: draft.keepList,
        budgetMinor: minorFromMajor(draft.budget, currency),
        styleKey: draft.styleKey,
      };

      const formData = new FormData();
      formData.set("payload", JSON.stringify(payload));
      const created = await createGuidedProjectAction({}, formData);
      if (created.error !== undefined || created.projectId === undefined || created.roomId === undefined) {
        setError(created.error ?? "Could not create the project.");
        return;
      }

      setProgress("Uploading photos…");
      for (const [index, file] of files.entries()) {
        await uploadPhoto(created.roomId, file, index + 1, files.length, setProgress);
      }

      setProgress("Starting the first render…");
      const renderForm = new FormData();
      renderForm.set("roomId", created.roomId);
      renderForm.set("projectId", created.projectId);
      renderForm.set("kind", "RESTYLE");
      renderForm.set("styleKey", draft.styleKey);
      renderForm.set("variations", "3");
      renderForm.set("quality", "draft");
      const render = await createRenderAction({}, renderForm);
      if (render.error !== undefined) {
        setError(render.error);
        return;
      }

      track("wizard_completed", { roomType: draft.roomType, renter: draft.renterMode });
      window.localStorage.removeItem(STORAGE_KEY);
      await goToRoomAction(created.projectId, created.roomId);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <p className="text-xs text-muted-foreground">
          Step {draft.step + 1} of {STEPS.length} · {STEPS[draft.step]}
        </p>
        <CardTitle>{titleFor(draft.step)}</CardTitle>
        <CardDescription>{descriptionFor(draft.step)}</CardDescription>
        <div className="mt-3 h-1 w-full overflow-hidden rounded bg-muted" aria-hidden="true">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${String(((draft.step + 1) / STEPS.length) * 100)}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {error !== null && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {draft.step === 0 && (
          <div className="space-y-3">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              multiple
              aria-label="Room photos"
              onChange={(event) => {
                const list = Array.from(event.target.files ?? []).slice(0, MAX_PHOTOS);
                setFiles(list);
                event.target.value = "";
              }}
              className="block w-full rounded-md border border-input p-3 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Up to {MAX_PHOTOS} photos · JPEG, PNG or WebP · 10 MB each. The first photo is the
              source for the render.
            </p>
            {files.length > 0 && (
              <ul className="space-y-1 text-sm">
                {files.map((file) => (
                  <li key={file.name} className="flex items-center justify-between gap-2">
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline"
                      onClick={() => {
                        setFiles((current) => current.filter((item) => item !== file));
                      }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">
              Photos aren&apos;t kept in the draft: if you refresh, pick them again.
            </p>
          </div>
        )}

        {draft.step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wizard-room-type">Room type</Label>
              <select
                id="wizard-room-type"
                value={draft.roomType}
                onChange={(event) => {
                  patch({ roomType: event.target.value });
                }}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {ROOM_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.useTypical}
                onChange={(event) => {
                  patch({ useTypical: event.target.checked });
                }}
                className="mt-1"
              />
              <span>
                I don&apos;t know the exact sizes — use typical sizes for this room
                <span className="block text-xs text-muted-foreground">
                  The cost range will be marked as rougher.
                </span>
              </span>
            </label>
            {!draft.useTypical && (
              <div className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    ["width", "Width (m)"],
                    ["length", "Length (m)"],
                    ["height", "Ceiling (m)"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={`wizard-${key}`}>{label}</Label>
                    <Input
                      id={`wizard-${key}`}
                      inputMode="decimal"
                      value={draft[key]}
                      placeholder={key === "height" ? "2.7" : "e.g. 4"}
                      onChange={(event) => {
                        patch({ [key]: event.target.value });
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {draft.step === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              What should stay exactly as it is? These items are kept unchanged in the render.
            </p>
            <div className="flex flex-wrap gap-2">
              {KEEP_CHIPS.map((chip) => {
                const active = draft.keepList.includes(chip);
                return (
                  <button
                    key={chip}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      patch({
                        keepList: active
                          ? draft.keepList.filter((item) => item !== chip)
                          : [...draft.keepList, chip],
                      });
                    }}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      active ? "border-primary bg-primary/10" : "border-border text-muted-foreground"
                    }`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Input
                value={draft.customKeep}
                maxLength={40}
                placeholder="Something else (max 10 items)"
                onChange={(event) => {
                  patch({ customKeep: event.target.value });
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addKeep(draft.customKeep);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  addKeep(draft.customKeep);
                }}
              >
                Add
              </Button>
            </div>
            {draft.keepList.length > 0 && (
              <ul className="flex flex-wrap gap-1.5 text-xs">
                {draft.keepList.map((item) => (
                  <li key={item} className="rounded-full bg-muted px-2 py-1">
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {draft.step === 3 && (
          <label className="flex items-start gap-3 rounded-lg border border-border p-4 text-sm">
            <input
              type="checkbox"
              checked={draft.renterMode}
              onChange={(event) => {
                patch({ renterMode: event.target.checked });
              }}
              className="mt-1"
            />
            <span>
              I rent this place
              <span className="mt-1 block text-xs text-muted-foreground">
                Only change what a renter can change (paint, rugs, curtains, lighting, furniture,
                decor) — no flooring, doors, built-ins or structure.
              </span>
            </span>
          </label>
        )}

        {draft.step === 4 && (
          <div className="space-y-2">
            <Label htmlFor="wizard-budget">Budget (optional, {currency})</Label>
            <Input
              id="wizard-budget"
              inputMode="decimal"
              value={draft.budget}
              placeholder="e.g. 2500"
              onChange={(event) => {
                patch({ budget: event.target.value });
              }}
            />
            <p className="text-xs text-muted-foreground">
              We&apos;ll show what fits your budget first. You can change this later.
            </p>
          </div>
        )}

        {draft.step === 5 && (
          <div className="space-y-5">
            {!draft.skipQuiz ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Pick the one you like more in each pair. {Object.keys(draft.picks).length}/
                  {STYLE_QUIZ_PAIRS.length} answered.
                </p>
                <div className="space-y-4">
                  {STYLE_QUIZ_PAIRS.map((pair, pairIndex) => (
                    <div key={pair.join("-")} className="grid grid-cols-2 gap-2">
                      {pair.map((styleKey) => {
                        const style = getStyle(styleKey);
                        if (style === undefined) return null;
                        const active = draft.picks[String(pairIndex)] === styleKey;
                        return (
                          <button
                            key={styleKey}
                            type="button"
                            aria-pressed={active}
                            onClick={() => {
                              const picks = { ...draft.picks, [String(pairIndex)]: styleKey };
                              const done = Object.keys(picks).length >= STYLE_QUIZ_PAIRS.length;
                              const recommended = recommendStyles(Object.values(picks));
                              patch({
                                picks,
                                quizDone: done,
                                ...(done && recommended[0] !== undefined
                                  ? { styleKey: recommended[0] }
                                  : {}),
                              });
                            }}
                            className={`rounded-lg border p-3 text-left ${
                              active ? "border-primary ring-2 ring-primary/30" : "border-border"
                            }`}
                          >
                            <span className="flex gap-1">
                              {style.palette.map((color) => (
                                <span
                                  key={color}
                                  className="h-6 w-6 rounded-full border border-black/10"
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </span>
                            <span className="mt-2 block text-sm font-medium">{style.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
                {draft.quizDone && recommendation.length > 0 && (
                  <p className="text-sm">
                    Your matches:{" "}
                    <strong>{recommendation.map((key) => getStyle(key)?.label ?? key).join(", ")}</strong>
                  </p>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    patch({ skipQuiz: true });
                  }}
                >
                  Skip, I&apos;ll choose myself
                </Button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {STYLES.map((style) => (
                  <button
                    key={style.key}
                    type="button"
                    aria-pressed={draft.styleKey === style.key}
                    onClick={() => {
                      patch({ styleKey: style.key });
                    }}
                    className={`rounded-lg border p-3 text-left text-xs ${
                      draft.styleKey === style.key
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border"
                    }`}
                  >
                    <span className="flex gap-1">
                      {style.palette.map((color) => (
                        <span
                          key={color}
                          className="h-4 w-4 rounded-full border border-black/10"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </span>
                    <span className="mt-1 block font-medium">{style.label}</span>
                  </button>
                ))}
              </div>
            )}
            {draft.quizDone && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Chosen style</p>
                <select
                  aria-label="Chosen style"
                  value={draft.styleKey}
                  onChange={(event) => {
                    patch({ styleKey: event.target.value });
                  }}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  {STYLES.map((style) => (
                    <option key={style.key} value={style.key}>
                      {style.label}
                      {recommendation.includes(style.key) ? " · recommended" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {draft.step === 6 && (
          <div className="space-y-3 text-sm">
            <dl className="grid grid-cols-[8rem_1fr] gap-y-2">
              <dt className="text-muted-foreground">Photos</dt>
              <dd>{files.length}</dd>
              <dt className="text-muted-foreground">Room</dt>
              <dd>{ROOM_TYPES.find(([value]) => value === draft.roomType)?.[1] ?? draft.roomType}</dd>
              <dt className="text-muted-foreground">Sizes</dt>
              <dd>
                {draft.useTypical
                  ? "Typical sizes (rougher estimate)"
                  : draft.width !== "" && draft.length !== ""
                    ? `${draft.width} × ${draft.length} m`
                    : "Not provided (typical sizes used)"}
              </dd>
              <dt className="text-muted-foreground">Keep</dt>
              <dd>{draft.keepList.length > 0 ? draft.keepList.join(", ") : "Nothing specific"}</dd>
              <dt className="text-muted-foreground">Renter</dt>
              <dd>{draft.renterMode ? "Yes — renter-safe changes only" : "No"}</dd>
              <dt className="text-muted-foreground">Budget</dt>
              <dd>
                {minorFromMajor(draft.budget, currency) !== null
                  ? formatMoney(minorFromMajor(draft.budget, currency) ?? 0, currency)
                  : "Not set"}
              </dd>
              <dt className="text-muted-foreground">Style</dt>
              <dd>{selectedStyle?.label ?? draft.styleKey}</dd>
              <dt className="text-muted-foreground">Cost</dt>
              <dd>
                {totalCost} credits (3 draft concepts)
              </dd>
            </dl>
            <p className="text-xs text-muted-foreground">
              AI-generated concept visual. Not to scale. You can edit or try another style after the
              first result.
            </p>
          </div>
        )}

        {progress !== null && (
          <p role="status" className="text-sm text-muted-foreground">
            {progress}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={back} disabled={draft.step === 0 || busy}>
            Back
          </Button>
          {draft.step < STEPS.length - 1 ? (
            <Button type="button" onClick={next} disabled={busy}>
              Continue
            </Button>
          ) : (
            <Button type="button" onClick={() => void submit()} disabled={busy} aria-busy={busy}>
              {busy ? "Working…" : "Generate"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

async function uploadPhoto(
  roomId: string,
  file: File,
  position: number,
  total: number,
  setProgress: (message: string) => void,
): Promise<void> {
  setProgress(`Uploading photo ${String(position)} of ${String(total)}…`);
  const presignResponse = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ roomId, mime: file.type, sizeBytes: file.size }),
  });
  if (!presignResponse.ok) {
    const body = (await presignResponse.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;
    throw new Error(body?.error?.message ?? "Upload could not start.");
  }
  const presign = (await presignResponse.json()) as { assetId: string; uploadUrl: string };
  const put = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "content-type": file.type },
    body: file,
  });
  if (!put.ok) throw new Error("Upload failed. Try again.");
  const confirm = await fetch(`/api/uploads/${presign.assetId}/confirm`, { method: "POST" });
  if (!confirm.ok) {
    const body = (await confirm.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;
    throw new Error(body?.error?.message ?? "Upload could not be confirmed.");
  }
}

function titleFor(step: number): string {
  return (
    [
      "Add a photo of the room",
      "Tell us about the room",
      "What should stay?",
      "Are you renting?",
      "Any budget in mind?",
      "Which look do you like?",
      "Ready to generate",
    ][step] ?? ""
  );
}

function descriptionFor(step: number): string {
  return (
    [
      "One clear photo works best. Nothing is sent to the AI until you confirm.",
      "Rough sizes are fine — you can skip them.",
      "We keep these unchanged so the room stays yours.",
      "Renter-safe changes only, no construction.",
      "Optional. We rank what to change first by impact per cost.",
      "Six quick pairs. You can skip and choose yourself.",
      "Review, then generate 3 concept visuals.",
    ][step] ?? ""
  );
}
