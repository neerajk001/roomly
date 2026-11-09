"use client";

import { uploadToStorage } from "@/lib/upload-storage";
import { createGuidedProjectAction, goToRoomAction } from "@/server/actions/wizard";
import { createRenderAction } from "@/server/actions/renders";
import {
  BUDGET_TIERS,
  getStyle,
  recommendContrastingStyles,
  typicalSizeFor,
  totalCreditCost,
  type UploadTarget,
} from "@roomdesigner/shared";
import { parseMoneyInput } from "@roomdesigner/estimate";
import { StylePreview } from "./StylePreview";
import { StyleDirectionPicker } from "./StyleDirectionPicker";
import { restoreWizardDraft, wizardDraftSchema, type WizardDraft as Draft } from "./wizard-draft";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "roomly:guided-wizard:v2";
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

const KEEP_ITEMS = [
  ["Sofa", "🛋"],
  ["Flooring", "▤"],
  ["Curtains", "▥"],
  ["Bed", "🛏"],
  ["Cabinets", "▦"],
  ["Rug", "◫"],
  ["Dining table", "▭"],
  ["TV", "▣"],
] as const;

const KEEP_IMAGES: Record<string, string> = {
  Sofa: "/demo/living-after.jpg",
  Flooring: "/demo/hero-after-modern.jpg",
  Curtains: "/demo/bedroom-after.jpg",
  Bed: "/demo/bedroom-after.jpg",
  Cabinets: "/demo/kitchen-after.jpg",
  Rug: "/demo/living-before.jpg",
  "Dining table": "/demo/dining-after.jpg",
  TV: "/demo/living-after.jpg",
};

const STAGE_ITEMS = [
  ["sofa", "Sofa"],
  ["dining-table", "Dining table"],
  ["rug", "Rug"],
  ["flooring", "Flooring"],
  ["curtains", "Curtains"],
  ["plants", "Plants"],
  ["art", "Art"],
  ["lighting", "Lighting"],
  ["storage", "Storage"],
] as const;

const STEPS = ["Photo", "Room details", "Keep items", "Renting", "Style", "Budget", "Review"];

const initialDraft: Draft = {
  version: 3,
  traditionKey: "",
  budgetTier: null,
  step: 0,
  roomType: "LIVING_ROOM",
  width: "4.2",
  length: "5.1",
  height: "2.7",
  useTypical: false,
  keepList: [],
  customKeep: "",
  renterMode: false,
  budget: "",
  styles: [],
  variations: "3",
  quality: "draft",
  notes: "",
  stagingItems: [],
};

function minorFromMajor(value: string, currency: string): number | null {
  const minor = parseMoneyInput(value.replace(/,/g, ""), currency);
  return minor !== null && minor > 0 ? minor : null;
}

function mmFromMetres(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 1000);
}

function CheckIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg
      className={className}
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
  );
}

function StepBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute -top-3 left-4 rounded-xl border border-border bg-accent px-3 py-1 text-sm font-semibold text-foreground">
      {children}
    </span>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function GuidedWizard({
  currency,
  initialStyle,
}: {
  currency: string;
  initialStyle?: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() =>
    initialStyle === undefined
      ? initialDraft
      : {
          ...initialDraft,
          styles: getStyle(initialStyle) ? [initialStyle] : [],
          traditionKey: "global",
        },
  );
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (initialStyle !== undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- no draft to restore
      setHydrated(true);
      return;
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      try {
        const restored = restoreWizardDraft(JSON.parse(raw) as unknown);
        if (restored) setDraft(restored);
      } catch {
        // ignore corrupt draft
      }
    }
    setHydrated(true);
  }, [initialStyle]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft, hydrated]);

  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(
    () => () => {
      for (const url of previews) URL.revokeObjectURL(url);
    },
    [previews],
  );

  const patch = (next: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...next }));
  };

  const chosenStyles =
    draft.styles.length > 0
      ? draft.styles
      : recommendContrastingStyles(draft.traditionKey, Math.min(3, Number(draft.variations)));
  const chosenStyle = chosenStyles[0] ?? "modern";
  const chosenStyleDefinition = getStyle(chosenStyle);
  const variationCount = Math.min(4, Math.max(1, Number(draft.variations) || 3));
  const hasEnoughConcepts = variationCount >= chosenStyles.length;
  const totalCost = totalCreditCost(draft.quality, variationCount);
  const typicalDims = typicalSizeFor(draft.roomType);
  const widthM = draft.useTypical ? typicalDims.widthMm / 1000 : Number(draft.width);
  const lengthM = draft.useTypical ? typicalDims.lengthMm / 1000 : Number(draft.length);
  const heightM = draft.useTypical ? typicalDims.heightMm / 1000 : Number(draft.height);
  const dimsLine = `${widthM.toFixed(2)} m × ${lengthM.toFixed(2)} m · ceiling ${heightM.toFixed(2)} m`;

  const canContinue = (): boolean => {
    if (draft.step === 0) return files.length >= 1;
    if (draft.step === 1) return true;
    if (draft.step === 4) return draft.traditionKey !== "" && draft.styles.length > 0;
    if (draft.step === 5)
      return draft.budget.trim() === "" || minorFromMajor(draft.budget, currency) !== null;
    return true;
  };

  const next = () => {
    setError(null);
    if (!canContinue()) {
      setError(
        draft.step === 0
          ? "Add at least one photo to continue."
          : draft.step === 4
            ? "Choose a tradition and at least one look, or choose looks for me."
            : draft.step === 5
              ? "Enter a valid positive budget, or clear it to skip."
              : "Choose a room type.",
      );
      return;
    }
    patch({ step: Math.min(draft.step + 1, STEPS.length - 1) });
  };

  const back = () => {
    setError(null);
    patch({ step: Math.max(0, draft.step - 1) });
  };

  const toggleKeep = (item: string) => {
    setDraft((current) => ({
      ...current,
      keepList: current.keepList.includes(item)
        ? current.keepList.filter((entry) => entry !== item)
        : current.keepList.length >= 10
          ? current.keepList
          : [...current.keepList, item],
    }));
  };

  const toggleStaging = (item: Draft["stagingItems"][number]) => {
    setDraft((current) => ({
      ...current,
      stagingItems: current.stagingItems.includes(item)
        ? current.stagingItems.filter((entry) => entry !== item)
        : [...current.stagingItems, item],
    }));
  };

  const toggleStyle = (key: string) => {
    setDraft((current) => ({
      ...current,
      styles: current.styles.includes(key)
        ? current.styles.filter((entry) => entry !== key)
        : current.styles.length >= 3
          ? current.styles
          : [...current.styles, key],
    }));
  };

  const roomLabel = ROOM_TYPES.find(([value]) => value === draft.roomType)?.[1] ?? "Room";

  const submit = async () => {
    setError(null);
    if (!hasEnoughConcepts || chosenStyles.length === 0) {
      setError("Choose at least one concept per selected look.");
      return;
    }
    if (draft.budget.trim() !== "" && minorFromMajor(draft.budget, currency) === null) {
      setError("Enter a valid budget, or clear it to skip.");
      return;
    }
    if (files.length === 0) {
      setError("Add your room photo again before generating.");
      patch({ step: 0 });
      return;
    }
    setBusy(true);
    try {
      setProgress("Creating your project...");
      const typical = typicalSizeFor(draft.roomType);
      const formData = new FormData();
      formData.set(
        "payload",
        JSON.stringify({
          roomType: draft.roomType,
          widthMm: draft.useTypical ? typical.widthMm : mmFromMetres(draft.width),
          lengthMm: draft.useTypical ? typical.lengthMm : mmFromMetres(draft.length),
          heightMm: draft.useTypical ? typical.heightMm : mmFromMetres(draft.height),
          renterMode: draft.renterMode,
          keepList: draft.keepList,
          budgetMinor: minorFromMajor(draft.budget, currency),
          styleKey: chosenStyle,
        }),
      );
      const created = await createGuidedProjectAction({}, formData);
      if (created.projectId === undefined || created.roomId === undefined) {
        setError(created.error ?? "Could not create the project.");
        return;
      }

      setProgress("Uploading photos...");
      for (const [index, file] of files.entries()) {
        setProgress(`Uploading photo ${String(index + 1)} of ${String(files.length)}...`);
        const presignResponse = await fetch("/api/uploads/presign", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ roomId: created.roomId, mime: file.type, sizeBytes: file.size }),
        });
        if (!presignResponse.ok) throw new Error("Upload could not start.");
        const presign = (await presignResponse.json()) as {
          assetId: string;
          upload: UploadTarget;
        };
        await uploadToStorage(presign.upload, file);
        const confirm = await fetch(`/api/uploads/${presign.assetId}/confirm`, { method: "POST" });
        if (!confirm.ok) throw new Error("Upload could not be confirmed.");
      }

      setProgress(`Starting ${variationCount} concept visuals...`);
      const renderForm = new FormData();
      renderForm.set("roomId", created.roomId);
      renderForm.set("projectId", created.projectId);
      renderForm.set("kind", "RESTYLE");
      renderForm.set("styleKey", chosenStyle);
      renderForm.set("styleKeys", JSON.stringify(chosenStyles));
      renderForm.set("traditionKey", draft.traditionKey || "global");
      if (draft.budgetTier) renderForm.set("budgetTier", draft.budgetTier);
      renderForm.set("variations", String(variationCount));
      renderForm.set("quality", draft.quality);
      if (draft.notes.trim() !== "") renderForm.set("notes", draft.notes.trim());
      if (draft.stagingItems.length > 0) {
        renderForm.set("stagingItems", JSON.stringify(draft.stagingItems));
      }
      const render = await createRenderAction({}, renderForm);
      if (render.error !== undefined) {
        setError(render.error);
        return;
      }
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
    <div className={draft.step === 6 ? "" : "grid gap-0 lg:grid-cols-[240px_1fr]"}>
      {draft.step !== 6 && (
        <nav
          aria-label="Design steps"
          className="min-w-0 border-b border-border p-3 lg:border-b-0 lg:border-r lg:p-4"
        >
          <ol className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-1">
            {STEPS.map((label, index) => {
              const active = index === draft.step;
              const done = index < draft.step;
              return (
                <li key={label}>
                  <button
                    type="button"
                    onClick={() => {
                      if (index <= draft.step) patch({ step: index });
                    }}
                    className={`flex w-full items-center gap-2.5 whitespace-nowrap px-2.5 py-2.5 text-left text-sm transition-colors ${
                      active
                        ? "bg-primary font-semibold text-white"
                        : done
                          ? "text-foreground"
                          : "text-muted-foreground"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] ${
                        active
                          ? "border-white bg-card text-primary"
                          : done
                            ? "border-primary bg-primary text-white"
                            : "border-border text-muted-foreground"
                      }`}
                    >
                      {done ? <CheckIcon /> : index + 1}
                    </span>
                    {label}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      <div
        className={
          draft.step === 6 ? "min-w-0" : "flex min-h-0 min-w-0 flex-col p-5 sm:p-8 lg:p-10"
        }
      >
        <div className="flex-1">
          {error !== null && (
            <p
              role="alert"
              className="mb-3 border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          {draft.step === 0 && (
            <div className="grid gap-5 lg:grid-cols-[1fr_230px]">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">
                  Add a photo of <span className="text-primary">your room.</span>
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Upload a clear photo so our AI can understand your space and create realistic
                  designs.
                </p>
                <label className="mt-4 flex cursor-pointer flex-col items-center justify-center border border-dashed border-border bg-card px-4 py-8 text-center text-sm hover:bg-foreground/[0.02]">
                  <svg
                    className="h-8 w-8 text-foreground"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 16V4" />
                    <path d="m6 10 6-6 6 6" />
                    <path d="M4 20h16" />
                  </svg>
                  <span className="mt-2 font-semibold">Drag and drop a photo here</span>
                  <span className="text-xs text-muted-foreground">or click to upload</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    multiple
                    className="sr-only"
                    aria-label="Room photos"
                    onChange={(event) => {
                      const list = Array.from(event.target.files ?? []).slice(0, MAX_PHOTOS);
                      setFiles(list);
                      event.target.value = "";
                    }}
                  />
                </label>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Up to {MAX_PHOTOS} photos · JPEG, PNG or WebP · 10 MB each
                </p>
                <ul className="mt-3 grid grid-cols-4 gap-2">
                  {previews.map((url, index) => (
                    <li
                      key={url}
                      className="relative overflow-hidden rounded-xl border border-border"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
                      <img
                        src={url}
                        alt={`Selected photo ${String(index + 1)}`}
                        className="h-16 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFiles((current) => current.filter((_, i) => i !== index));
                        }}
                        className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center bg-card/90 text-[10px]"
                        aria-label="Remove photo"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                  {previews.length < MAX_PHOTOS && (
                    <li>
                      <label className="flex h-16 cursor-pointer items-center justify-center rounded-xl border border-border bg-card text-2xl hover:bg-foreground/[0.02]">
                        +
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          className="sr-only"
                          aria-label="Add more photos"
                          onChange={(event) => {
                            const list = Array.from(event.target.files ?? []);
                            setFiles((current) => [...current, ...list].slice(0, MAX_PHOTOS));
                            event.target.value = "";
                          }}
                        />
                      </label>
                    </li>
                  )}
                </ul>
                <p className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-accent px-3 py-2 text-[11px] text-foreground">
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
                    <rect x="4" y="10" width="16" height="11" rx="2" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>
                  Your photos are private and only used to generate your designs.
                </p>
              </div>
              <aside className="hidden space-y-3 lg:block">
                {/* eslint-disable-next-line @next/next/no-img-element -- static demo asset */}
                <img
                  src="/demo/living-after.jpg"
                  alt=""
                  className="h-36 w-full rounded-xl border border-border object-cover"
                />
                <div className="rounded-xl border border-border bg-card p-3 text-xs">
                  <p className="font-semibold">Tips for best results</p>
                  <ul className="mt-2 space-y-1.5 text-muted-foreground">
                    {[
                      "Use a well-lit photo",
                      "Include as much of the room as possible",
                      "Take it from a corner if you can",
                    ].map((tip) => (
                      <li key={tip} className="flex items-start gap-2">
                        <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-xl border border-border text-foreground">
                          <CheckIcon className="h-2 w-2" />
                        </span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>
            </div>
          )}

          {draft.step === 1 && (
            <div className="grid gap-5 lg:grid-cols-[1fr_230px]">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">
                  Tell us about <span className="text-primary">the room.</span>
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Rough sizes are fine — you can always skip this if you&apos;re not sure.
                </p>
                <div className="mt-4 space-y-3">
                  <div className="space-y-1">
                    <label htmlFor="wiz-room-type" className="text-xs font-semibold">
                      Room type
                    </label>
                    <div className="relative">
                      <svg
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M3 11V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3" />
                        <path d="M3 11h18v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      </svg>
                      <select
                        id="wiz-room-type"
                        value={draft.roomType}
                        onChange={(event) => {
                          patch({
                            roomType: wizardDraftSchema.shape.roomType.parse(event.target.value),
                          });
                        }}
                        className="h-10 w-full appearance-none rounded-xl border border-border bg-card pl-9 pr-3 text-sm"
                      >
                        {ROOM_TYPES.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <svg
                        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ["width", "Width (m)"],
                        ["length", "Length (m)"],
                        ["height", "Ceiling height (m)"],
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key} className="space-y-1">
                        <label htmlFor={`wiz-${key}`} className="text-xs font-semibold">
                          {label}
                        </label>
                        <input
                          id={`wiz-${key}`}
                          type="number"
                          step="0.1"
                          min="0"
                          value={draft[key]}
                          disabled={draft.useTypical}
                          onChange={(event) => {
                            patch({ [key]: event.target.value });
                          }}
                          className="h-10 w-full rounded-xl border border-border bg-card px-2 text-sm disabled:bg-foreground/5"
                        />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={draft.useTypical}
                        onChange={(event) => {
                          patch({ useTypical: event.target.checked });
                        }}
                        className="h-4 w-4 rounded-xl border border-border accent-primary"
                      />
                      I&apos;m not sure about the exact dimensions
                    </label>
                    {draft.useTypical && (
                      <p className="mt-1 pl-6 text-[11px] text-muted-foreground">
                        That&apos;s okay. We&apos;ll use typical sizes for this room and mark the
                        cost estimate as rougher.
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <aside className="space-y-3">
                <div className="rounded-xl border border-border bg-card p-3">
                  <svg
                    viewBox="0 0 200 140"
                    className="w-full"
                    role="img"
                    aria-label="Room plan guidance"
                  >
                    <rect
                      x="20"
                      y="20"
                      width="160"
                      height="100"
                      fill="var(--card)"
                      stroke="var(--foreground)"
                    />
                    <rect x="20" y="90" width="70" height="30" fill="var(--muted)" />
                    <rect x="20" y="40" width="34" height="30" fill="var(--accent)" />
                    <path d="M20 12 H180" stroke="#000" strokeWidth="1" markerEnd="url(#a)" />
                    <defs>
                      <marker
                        id="a"
                        markerWidth="6"
                        markerHeight="6"
                        refX="3"
                        refY="3"
                        orient="auto"
                      >
                        <path d="M0 0 L6 3 L0 6 z" fill="#000" />
                      </marker>
                    </defs>
                  </svg>
                </div>
                <div className="rounded-xl border border-border bg-accent p-3 text-[11px]">
                  <p className="flex items-center gap-1.5 font-semibold">
                    <span aria-hidden="true">💡</span> Why we need this?
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Dimensions help us suggest better furniture layouts and a more accurate cost
                    estimate.
                  </p>
                </div>
              </aside>
            </div>
          )}

          {draft.step === 2 && (
            <div className="grid gap-5 lg:grid-cols-[1fr_230px]">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">
                  What should <span className="text-primary">stay?</span>
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Select the items you want to keep exactly as they are in the new design.
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {KEEP_ITEMS.map(([label]) => {
                    const active = draft.keepList.includes(label);
                    return (
                      <button
                        key={label}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          toggleKeep(label);
                        }}
                        className={`relative border bg-card p-1 text-left text-xs ${
                          active ? "border-primary ring-1 ring-primary" : "border-border"
                        }`}
                      >
                        <span className="block h-14 w-full overflow-hidden border-b border-border bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element -- static demo asset */}
                          <img
                            src={KEEP_IMAGES[label] ?? "/demo/living-after.jpg"}
                            alt=""
                            className="h-full w-full object-cover"
                            aria-hidden="true"
                          />
                        </span>
                        <span className="mt-1 block px-1 pb-0.5 font-medium">{label}</span>
                        {active && (
                          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center bg-primary text-white">
                            <CheckIcon />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    value={draft.customKeep}
                    maxLength={40}
                    placeholder="Add something else (e.g. bookshelf, plants, wall art)"
                    onChange={(event) => {
                      patch({ customKeep: event.target.value });
                    }}
                    className="h-10 flex-1 rounded-xl border border-border bg-card px-3 text-sm"
                  />
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-primary text-lg text-white"
                    onClick={() => {
                      const value = draft.customKeep.trim().slice(0, 40);
                      if (value !== "") {
                        toggleKeep(value);
                        patch({ customKeep: "" });
                      }
                    }}
                    aria-label="Add custom item"
                  >
                    +
                  </button>
                </div>
              </div>
              <aside className="space-y-3">
                <div className="rounded-xl border border-border bg-card p-3 text-xs">
                  <p className="font-semibold">Selected items ({draft.keepList.length})</p>
                  {draft.keepList.length === 0 ? (
                    <p className="mt-2 text-muted-foreground">Nothing selected yet.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {draft.keepList.map((item) => (
                        <li
                          key={item}
                          className="flex justify-between gap-2 border-b border-border pb-1.5 last:border-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">{item}</p>
                            <p className="text-[10px] text-muted-foreground">Will be kept as is</p>
                          </div>
                          <button
                            type="button"
                            className="shrink-0 text-red-700"
                            onClick={() => {
                              toggleKeep(item);
                            }}
                            aria-label={`Remove ${item}`}
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex items-start gap-2 rounded-xl border border-border bg-accent p-3 text-[11px] text-muted-foreground">
                  <span aria-hidden="true">ⓘ</span>
                  <p>These items will remain unchanged in the generated designs.</p>
                </div>
              </aside>
            </div>
          )}

          {draft.step === 3 && (
            <div className="grid gap-5 lg:grid-cols-[1fr_220px]">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">
                  Do you <span className="text-primary">rent or own</span> this place?
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  This helps us suggest the right kind of changes for your space.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      value: true,
                      icon: "▦",
                      title: "I rent this place",
                      body: "Renter-friendly changes only (paint, rugs, curtains, lighting, furniture, decor). No construction, no structural changes.",
                    },
                    {
                      value: false,
                      icon: "⌂",
                      title: "I own this place",
                      body: "Includes all types of changes including construction, built-ins and structural modifications.",
                    },
                  ].map((option) => {
                    const active = draft.renterMode === option.value;
                    return (
                      <button
                        key={option.title}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          patch({ renterMode: option.value });
                        }}
                        className={`relative border bg-card p-4 text-left ${
                          active ? "border-primary ring-1 ring-primary" : "border-border"
                        }`}
                      >
                        <span className="text-2xl" aria-hidden="true">
                          {option.icon}
                        </span>
                        <span className="mt-2 block text-sm font-semibold">{option.title}</span>
                        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                          {option.body}
                        </span>
                        {active && (
                          <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center bg-primary text-white">
                            <CheckIcon />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-accent px-3 py-2 text-[11px]">
                  <span aria-hidden="true">💡</span>
                  Not sure? You can always change this later.
                </div>
              </div>
              <aside className="relative hidden lg:block">
                {/* eslint-disable-next-line @next/next/no-img-element -- static demo asset */}
                <img
                  src="/demo/homeowner-feature.jpg"
                  alt=""
                  className="h-full min-h-52 w-full rounded-xl border border-border object-cover"
                />
                <p className="absolute -top-3 right-2 max-w-[120px] -rotate-3 text-center font-sans text-[11px] italic leading-tight">
                  We&apos;ll suggest renter-friendly ideas for your space.
                </p>
              </aside>
            </div>
          )}

          {draft.step === 5 && (
            <div className="grid gap-5 lg:grid-cols-[1fr_220px]">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">
                  Any <span className="text-primary">budget</span> in mind?
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  This helps us prioritize the right changes. You can skip this for now.
                </p>
                <div className="mt-4 inline-flex rounded-xl border border-border text-xs font-semibold">
                  <span className="bg-primary px-3 py-1.5 text-white">{currency}</span>
                </div>
                <div className="mt-3">
                  <div className="relative max-w-52">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-foreground">
                      {currency === "INR"
                        ? "₹"
                        : currency === "USD"
                          ? "$"
                          : currency === "EUR"
                            ? "€"
                            : ""}
                    </span>
                    <input
                      inputMode="decimal"
                      value={draft.budget}
                      placeholder="50,000"
                      onChange={(event) => {
                        patch({ budget: event.target.value });
                      }}
                      aria-label="Budget"
                      className="h-10 w-full rounded-xl border border-border bg-card pl-8 pr-3 text-sm"
                    />
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3" aria-label="Budget preference">
                  {BUDGET_TIERS.map((tier) => (
                    <button
                      key={tier.key}
                      type="button"
                      aria-pressed={draft.budgetTier === tier.key}
                      onClick={() =>
                        patch({ budgetTier: draft.budgetTier === tier.key ? null : tier.key })
                      }
                      className={`rounded-xl border p-4 text-left ${draft.budgetTier === tier.key ? "border-foreground bg-muted ring-1 ring-foreground" : "border-border bg-card"}`}
                    >
                      <span className="block text-sm font-semibold">{tier.label}</span>
                      <span className="mt-2 block text-xs text-muted-foreground">
                        {tier.description}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Optional. A spending direction, not an exact price promise. You can also add a
                  custom amount above.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    patch({ budget: "", budgetTier: null });
                  }}
                  className="mt-4 rounded-xl border border-border bg-card px-3 py-1.5 text-xs"
                >
                  No budget preference
                </button>
              </div>
              <aside className="hidden space-y-3 lg:block">
                {chosenStyleDefinition && (
                  <StylePreview style={chosenStyleDefinition} roomType={draft.roomType} />
                )}
                <div className="rounded-xl border border-border bg-card p-3 text-[11px] text-muted-foreground">
                  Your preference guides furniture and finish choices. Concept visuals are not price
                  quotes.
                </div>
              </aside>
            </div>
          )}

          {draft.step === 4 && (
            <StyleDirectionPicker
              traditionKey={draft.traditionKey}
              styles={draft.styles}
              roomType={draft.roomType}
              onTradition={(key) =>
                patch({ traditionKey: key, styles: key === draft.traditionKey ? draft.styles : [] })
              }
              onToggle={toggleStyle}
              onExplore={() =>
                patch({
                  styles: recommendContrastingStyles(
                    draft.traditionKey,
                    Math.min(3, Number(draft.variations)),
                  ),
                })
              }
            />
          )}

          {draft.step === 6 && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      router.push("/app/spaces");
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    <span aria-hidden="true">←</span> Back to my spaces
                  </button>
                  <h1 className="mt-2 text-4xl font-semibold leading-[1.02] tracking-tight text-foreground sm:text-5xl">
                    Design your {roomLabel.toLowerCase()}
                  </h1>
                  <p className="mt-2 text-sm font-medium text-muted-foreground">{dimsLine}</p>
                </div>
                <div className="flex flex-wrap items-stretch gap-3">
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-accent text-foreground">
                      <svg
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Ready to generate</p>
                      <p className="mt-0.5 max-w-[230px] text-[11px] leading-snug text-muted-foreground">
                        Select your preferences and create {variationCount} concepts.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void submit()}
                    disabled={busy || !hasEnoughConcepts || chosenStyles.length === 0}
                    aria-busy={busy}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all   hover:shadow-sm disabled:opacity-60"
                  >
                    {busy ? "Generating..." : `Generate ${String(variationCount)} concepts`}
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>

              <section className="relative rounded-xl border border-border bg-card p-4 pt-6">
                <StepBadge>1. Design direction</StepBadge>
                <p className="mb-4 text-sm text-muted-foreground">
                  Each concept explores a different palette, furniture form and lighting mood within
                  your chosen looks. Your kept items and room constraints stay in place.
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  {chosenStyles.map((key) => {
                    const style = getStyle(key);
                    if (!style) return null;
                    return (
                      <div key={key} className="overflow-hidden rounded-lg border border-border">
                        <StylePreview style={style} roomType={draft.roomType} />
                        <div className="p-3">
                          <p className="text-sm font-semibold">{style.label}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {capitalize(style.promptHint)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() => patch({ step: 4 })}
                    className="rounded-lg border border-border px-3 py-2"
                  >
                    Change design direction
                  </button>
                  <button
                    type="button"
                    onClick={() => patch({ step: 5 })}
                    className="rounded-lg border border-border px-3 py-2"
                  >
                    Budget:{" "}
                    {BUDGET_TIERS.find((tier) => tier.key === draft.budgetTier)?.label ??
                      "No tier preference"}
                    {draft.budget ? ` · ${currency} ${draft.budget}` : ""}
                  </button>
                </div>
                {!hasEnoughConcepts && (
                  <p role="alert" className="mt-3 text-sm text-destructive">
                    Choose at least {chosenStyles.length} concepts so every selected look is
                    included.
                  </p>
                )}
              </section>

              <div className="grid gap-4 sm:grid-cols-2">
                <section className="relative rounded-xl border border-border bg-card p-4 pt-6">
                  <StepBadge>2. Variations</StepBadge>
                  <label htmlFor="wiz-variations" className="sr-only">
                    Variations
                  </label>
                  <select
                    id="wiz-variations"
                    value={draft.variations}
                    onChange={(event) => {
                      patch({
                        variations: wizardDraftSchema.shape.variations.parse(event.target.value),
                      });
                    }}
                    className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
                  >
                    {[1, 2, 3, 4].map((count) => (
                      <option key={count} value={String(count)}>
                        {count}
                      </option>
                    ))}
                  </select>
                </section>
                <section className="relative rounded-xl border border-border bg-card p-4 pt-6">
                  <StepBadge>3. Render quality</StepBadge>
                  <label htmlFor="wiz-quality" className="sr-only">
                    Render quality
                  </label>
                  <select
                    id="wiz-quality"
                    value={draft.quality}
                    onChange={(event) => {
                      patch({ quality: event.target.value === "final" ? "final" : "draft" });
                    }}
                    className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
                  >
                    <option value="draft">Draft (faster, cheaper)</option>
                    <option value="final">Final (best quality)</option>
                  </select>
                </section>
              </div>

              <section className="relative rounded-xl border border-border bg-card p-4 pt-6">
                <StepBadge>4. Stage this room (optional)</StepBadge>
                <p className="text-xs text-muted-foreground">
                  Empty room? Pick what to add. Existing items that already fit are kept.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {STAGE_ITEMS.map(([key, label]) => {
                    const active = draft.stagingItems.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          toggleStaging(key);
                        }}
                        className={`flex items-center gap-2 border px-3 py-1.5 text-xs font-medium transition-colors ${
                          active
                            ? "border-border bg-accent text-foreground"
                            : "border-border bg-card text-foreground hover:bg-foreground/5"
                        }`}
                      >
                        <span
                          className={`flex h-3.5 w-3.5 items-center justify-center rounded-xl border border-border ${
                            active ? "bg-foreground text-white" : "bg-card"
                          }`}
                        >
                          {active && <CheckIcon className="h-2.5 w-2.5" />}
                        </span>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="relative rounded-xl border border-border bg-card p-4 pt-6">
                <StepBadge>5. Notes (optional)</StepBadge>
                <label htmlFor="wiz-notes" className="sr-only">
                  Notes
                </label>
                <textarea
                  id="wiz-notes"
                  value={draft.notes}
                  maxLength={300}
                  rows={2}
                  onChange={(event) => {
                    patch({ notes: event.target.value });
                  }}
                  placeholder="E.g. keep the rug and the shelf on the left"
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </section>

              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-accent text-foreground">
                    <svg
                      className="h-6 w-6"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-base font-semibold text-foreground">
                      Your design will be ready in a few seconds
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      We&apos;ll generate {variationCount} unique concepts based on your
                      preferences, room dimensions and budget.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="border-l border-border pl-4 text-xs">
                    <p className="text-muted-foreground">Cost</p>
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <ellipse cx="12" cy="6" rx="8" ry="3" />
                        <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
                        <path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
                      </svg>
                      {totalCost} credits
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void submit()}
                    disabled={busy || !hasEnoughConcepts || chosenStyles.length === 0}
                    aria-busy={busy}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all   hover:shadow-sm disabled:opacity-60"
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                    </svg>
                    {busy ? "Generating..." : `Generate ${String(variationCount)} concepts`}
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {progress !== null && (
            <p role="status" className="mt-3 text-xs text-muted-foreground">
              {progress}
            </p>
          )}
        </div>

        {draft.step !== 6 && (
          <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
            <button
              type="button"
              onClick={() => {
                if (draft.step === 0) {
                  router.push("/app");
                } else {
                  back();
                }
              }}
              disabled={busy}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold disabled:opacity-40"
            >
              <span aria-hidden="true">←</span> Back
            </button>
            <button
              type="button"
              onClick={next}
              disabled={busy}
              className="flex items-center gap-3 rounded-xl border border-border bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all   hover:shadow-sm disabled:opacity-60"
            >
              Continue <span aria-hidden="true">→</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
