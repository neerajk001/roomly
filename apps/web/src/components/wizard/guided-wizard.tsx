"use client";

import { createGuidedProjectAction, goToRoomAction } from "@/server/actions/wizard";
import { createRenderAction } from "@/server/actions/renders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  STYLES,
  formatMoney,
  getStyle,
  typicalSizeFor,
  totalCreditCost,
} from "@roomdesigner/shared";
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

const STEPS = ["Photo", "Room details", "Keep items", "Renting", "Budget", "Style", "Review"];

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
  styles: string[];
}

const initialDraft: Draft = {
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
};

function minorFromMajor(value: string, currency: string): number | null {
  const parsed = Number.parseFloat(value.replace(/,/g, ""));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * (currency === "JPY" ? 1 : 100));
}

function mmFromMetres(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 1000);
}

export function GuidedWizard({ currency, credits }: { currency: string; credits: number }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

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

  const chosenStyle = draft.styles[0] ?? "modern";
  const styleLabel = getStyle(chosenStyle)?.label ?? "Modern";
  const totalCost = totalCreditCost("draft", 3);
  const usedTypical = draft.useTypical || draft.width === "" || draft.length === "";

  const canContinue = (): boolean => {
    if (draft.step === 0) return files.length >= 1;
    if (draft.step === 1) return draft.roomType !== "";
    return true;
  };

  const next = () => {
    setError(null);
    if (!canContinue()) {
      setError(draft.step === 0 ? "Add at least one photo to continue." : "Choose a room type.");
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
        const presign = (await presignResponse.json()) as { assetId: string; uploadUrl: string };
        const put = await fetch(presign.uploadUrl, {
          method: "PUT",
          headers: { "content-type": file.type },
          body: file,
        });
        if (!put.ok) throw new Error("Upload failed.");
        const confirm = await fetch(`/api/uploads/${presign.assetId}/confirm`, { method: "POST" });
        if (!confirm.ok) throw new Error("Upload could not be confirmed.");
      }

      setProgress("Starting 3 concept visuals...");
      const renderForm = new FormData();
      renderForm.set("roomId", created.roomId);
      renderForm.set("projectId", created.projectId);
      renderForm.set("kind", "RESTYLE");
      renderForm.set("styleKey", chosenStyle);
      renderForm.set("variations", "3");
      renderForm.set("quality", "draft");
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
    <div className="rounded-2xl border border-[#e4dfd3] bg-[#fbf9f3] text-[#1f2a24] shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e4dfd3] px-4 py-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold">🌿 RoomDesigner</span>
          <span className="text-[#c3bcae]">|</span>
          <span className="text-[#5b665f]">{roomLabel} redesign</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[#e4dfd3] bg-white px-2.5 py-1">◉ {credits} credits</span>
          <span className="rounded-md border border-[#e4dfd3] bg-white px-2.5 py-1">Save draft</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2f5233] text-[10px] font-semibold text-white">
            {(draft.step + 1).toString()}
          </span>
        </div>
      </header>

      <div className="grid gap-0 lg:grid-cols-[190px_1fr]">
        <nav aria-label="Design steps" className="border-b border-[#e4dfd3] p-3 lg:border-b-0 lg:border-r">
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
                    className={`flex w-full items-center gap-2 whitespace-nowrap rounded-md px-2 py-2 text-left text-xs ${
                      active
                        ? "bg-[#e7ece0] font-medium text-[#2f5233]"
                        : done
                          ? "text-[#405048]"
                          : "text-[#a8a294]"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                        active
                          ? "border-[#2f5233] bg-[#2f5233] text-white"
                          : done
                            ? "border-[#2f5233] text-[#2f5233]"
                            : "border-[#d8d2c4]"
                      }`}
                    >
                      {index + 1}
                    </span>
                    {label}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="p-5">
          {error !== null && (
            <p role="alert" className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {draft.step === 0 && (
            <div className="grid gap-5 lg:grid-cols-[1fr_240px]">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Add a photo of your room</h1>
                <p className="mt-1 text-sm text-[#5b665f]">
                  Upload a clear photo so the AI can understand your space.
                </p>
                <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#d8d2c4] bg-white px-4 py-8 text-center text-sm hover:bg-[#faf8f2]">
                  <span className="text-2xl" aria-hidden="true">
                    ⇪
                  </span>
                  <span className="mt-2 font-medium">Drag and drop a photo here</span>
                  <span className="text-xs text-[#7a857d]">or click to upload</span>
                  <span className="mt-2 text-[11px] text-[#a8a294]">
                    Up to {MAX_PHOTOS} photos · JPEG, PNG or WebP · 10 MB each
                  </span>
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
                {previews.length > 0 && (
                  <ul className="mt-3 grid grid-cols-4 gap-2">
                    {previews.map((url, index) => (
                      <li key={url} className="relative overflow-hidden rounded-lg border border-[#e4dfd3]">
                        {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
                        <img src={url} alt={`Selected photo ${String(index + 1)}`} className="h-16 w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setFiles((current) => current.filter((_, i) => i !== index));
                          }}
                          className="absolute right-1 top-1 rounded-full bg-white/90 px-1 text-[10px]"
                          aria-label="Remove photo"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 flex items-center gap-2 rounded-md bg-[#eef1e8] px-3 py-2 text-[11px] text-[#405048]">
                  🔒 Photos are private and only used to generate your designs.
                </p>
              </div>
              <aside className="hidden space-y-3 lg:block">
                {/* eslint-disable-next-line @next/next/no-img-element -- static demo asset */}
                <img src="/demo/living-after.jpg" alt="" className="h-36 w-full rounded-lg object-cover" />
                <div className="rounded-lg border border-[#e4dfd3] bg-white p-3 text-xs">
                  <p className="font-medium">Tips for best results</p>
                  <ul className="mt-1.5 space-y-1 text-[#5b665f]">
                    <li>✓ Use a well-lit photo</li>
                    <li>✓ Include as much of the room as possible</li>
                    <li>✓ Take it from a corner if you can</li>
                  </ul>
                </div>
              </aside>
            </div>
          )}

          {draft.step === 1 && (
            <div className="grid gap-5 lg:grid-cols-[1fr_240px]">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Tell us about the room</h1>
                <p className="mt-1 text-sm text-[#5b665f]">
                  Rough sizes are fine — you can skip this if you&apos;re not sure.
                </p>
                <div className="mt-4 space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="wiz-room-type">Room type</Label>
                    <select
                      id="wiz-room-type"
                      value={draft.roomType}
                      onChange={(event) => {
                        patch({ roomType: event.target.value });
                      }}
                      className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
                    >
                      {ROOM_TYPES.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ["width", "Width (m)"],
                        ["length", "Length (m)"],
                        ["height", "Ceiling (m)"],
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key} className="space-y-1">
                        <Label htmlFor={`wiz-${key}`} className="text-xs">
                          {label}
                        </Label>
                        <Input
                          id={`wiz-${key}`}
                          inputMode="decimal"
                          value={draft[key]}
                          disabled={draft.useTypical}
                          onChange={(event) => {
                            patch({ [key]: event.target.value });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draft.useTypical}
                      onChange={(event) => {
                        patch({ useTypical: event.target.checked });
                      }}
                    />
                    I&apos;m not sure about the exact dimensions
                  </label>
                </div>
              </div>
              <aside className="space-y-3">
                <div className="rounded-lg border border-[#e4dfd3] bg-white p-3">
                  <svg viewBox="0 0 200 140" className="w-full" role="img" aria-label="Room plan guidance">
                    <rect x="20" y="20" width="160" height="100" fill="#f3efe6" stroke="#a8a294" />
                    <rect x="20" y="90" width="70" height="30" fill="#e0d8c6" />
                    <rect x="20" y="40" width="34" height="30" fill="#cbd6c0" />
                    <path d="M20 12 H180" stroke="#2f5233" strokeWidth="1" markerEnd="url(#a)" />
                    <defs>
                      <marker id="a" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                        <path d="M0 0 L6 3 L0 6 z" fill="#2f5233" />
                      </marker>
                    </defs>
                  </svg>
                  <p className="mt-2 text-[11px] text-[#7a857d]">
                    Dimensions help us suggest better layouts and a more accurate cost range.
                  </p>
                </div>
              </aside>
            </div>
          )}

          {draft.step === 2 && (
            <div className="grid gap-5 lg:grid-cols-[1fr_240px]">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">What should stay?</h1>
                <p className="mt-1 text-sm text-[#5b665f]">
                  Select items you want to keep exactly as they are.
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {KEEP_ITEMS.map(([label, icon]) => {
                    const active = draft.keepList.includes(label);
                    return (
                      <button
                        key={label}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          toggleKeep(label);
                        }}
                        className={`relative rounded-lg border-2 bg-white p-2 text-left text-xs ${
                          active ? "border-[#2f5233]" : "border-[#e4dfd3]"
                        }`}
                      >
                        <span className="flex h-14 items-center justify-center rounded bg-[#f3efe6] text-xl" aria-hidden="true">
                          {icon}
                        </span>
                        <span className="mt-1 block">{label}</span>
                        {active && (
                          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#2f5233] text-[9px] text-white">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex gap-2">
                  <Input
                    value={draft.customKeep}
                    maxLength={40}
                    placeholder="Add something else (e.g. bookshelf, plants)"
                    onChange={(event) => {
                      patch({ customKeep: event.target.value });
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-white"
                    onClick={() => {
                      const value = draft.customKeep.trim().slice(0, 40);
                      if (value !== "") {
                        toggleKeep(value);
                        patch({ customKeep: "" });
                      }
                    }}
                  >
                    +
                  </Button>
                </div>
              </div>
              <aside className="rounded-lg border border-[#e4dfd3] bg-white p-3 text-xs">
                <p className="font-medium">Selected items ({draft.keepList.length})</p>
                {draft.keepList.length === 0 ? (
                  <p className="mt-2 text-[#7a857d]">Nothing selected yet.</p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {draft.keepList.map((item) => (
                      <li key={item} className="flex justify-between gap-2">
                        <span>{item}</span>
                        <button
                          type="button"
                          className="text-[#a33]"
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
                <p className="mt-3 rounded-md bg-[#eef1e8] px-2 py-1.5 text-[11px] text-[#405048]">
                  These items will remain unchanged in the generated design.
                </p>
              </aside>
            </div>
          )}

          {draft.step === 3 && (
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Do you rent or own this place?</h1>
              <p className="mt-1 text-sm text-[#5b665f]">
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
                      className={`rounded-xl border-2 bg-white p-4 text-left ${
                        active ? "border-[#2f5233]" : "border-[#e4dfd3]"
                      }`}
                    >
                      <span className="text-2xl" aria-hidden="true">
                        {option.icon}
                      </span>
                      <span className="mt-2 block text-sm font-medium">{option.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-[#5b665f]">{option.body}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 rounded-md bg-[#eef1e8] px-3 py-2 text-[11px] text-[#405048]">
                Not sure? You can always change this later.
              </p>
            </div>
          )}

          {draft.step === 4 && (
            <div className="grid gap-5 lg:grid-cols-[1fr_220px]">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Any budget in mind?</h1>
                <p className="mt-1 text-sm text-[#5b665f]">
                  This helps us prioritize the right changes.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="rounded-md border border-[#2f5233] bg-[#eef1e8] px-2 py-1 text-xs font-medium">
                    {currency}
                  </span>
                  <Input
                    inputMode="decimal"
                    value={draft.budget}
                    placeholder="50,000"
                    onChange={(event) => {
                      patch({ budget: event.target.value });
                    }}
                    className="max-w-40 bg-white"
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    ["Under 25k", "25000"],
                    ["25k – 75k", "50000"],
                    ["75k+", "100000"],
                  ].map(([label, value]) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        patch({ budget: value ?? "" });
                      }}
                      className="rounded-md border border-[#d8d2c4] bg-white px-2.5 py-1.5 text-xs"
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    patch({ budget: "" });
                  }}
                  className="mt-4 text-xs text-[#5b665f] underline"
                >
                  Skip for now
                </button>
              </div>
              <aside className="hidden rounded-lg border border-[#e4dfd3] bg-white p-3 text-[11px] text-[#5b665f] lg:block">
                We&apos;ll show what fits your budget first, focusing on high-impact changes.
              </aside>
            </div>
          )}

          {draft.step === 5 && (
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Which look do you like?</h1>
              <p className="mt-1 text-sm text-[#5b665f]">
                Pick the styles you like most. You can pick up to 3.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {STYLES.map((style) => {
                  const active = draft.styles.includes(style.key);
                  return (
                    <button
                      key={style.key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        toggleStyle(style.key);
                      }}
                      className={`relative overflow-hidden rounded-lg border-2 bg-white text-left text-xs ${
                        active ? "border-[#2f5233]" : "border-[#e4dfd3]"
                      }`}
                    >
                      <span className="flex h-16 items-end gap-1 p-2" style={{ background: `linear-gradient(135deg, ${style.palette[0]}, ${style.palette[1]})` }}>
                        <span className="h-3 w-3 rounded-full border border-white/60" style={{ backgroundColor: style.palette[2] }} />
                      </span>
                      <span className="block px-2 py-1.5">{style.label}</span>
                      {active && (
                        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#2f5233] text-[9px] text-white">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => {
                  patch({ styles: ["scandinavian"] });
                }}
                className="mt-3 rounded-md border border-[#d8d2c4] bg-white px-3 py-1.5 text-xs"
              >
                ✨ Not sure yet — choose for me
              </button>
            </div>
          )}

          {draft.step === 6 && (
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Review your details</h1>
              <p className="mt-1 text-sm text-[#5b665f]">Looks good? Generate 3 concept designs.</p>
              <div className="mt-4 grid gap-4 lg:grid-cols-[200px_1fr]">
                {previews[0] !== undefined ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- local object URL */
                  <img src={previews[0]} alt="Your room" className="h-32 w-full rounded-lg object-cover" />
                ) : (
                  <div className="flex h-32 items-center justify-center rounded-lg bg-[#f3efe6] text-xs text-[#7a857d]">
                    No photo preview
                  </div>
                )}
                <dl className="divide-y divide-[#eee8db] text-sm">
                  {[
                    ["Photo", `${String(files.length)} photo${files.length === 1 ? "" : "s"} uploaded`, 0],
                    [
                      "Room details",
                      `${roomLabel} · ${usedTypical ? "typical sizes" : `${draft.width} × ${draft.length} × ${draft.height} m`}`,
                      1,
                    ],
                    ["Keep items", draft.keepList.length > 0 ? draft.keepList.join(", ") : "None", 2],
                    ["Renting", draft.renterMode ? "I rent this place" : "I own this place", 3],
                    [
                      "Budget",
                      minorFromMajor(draft.budget, currency) !== null
                        ? formatMoney(minorFromMajor(draft.budget, currency) ?? 0, currency)
                        : "Not set",
                      4,
                    ],
                    ["Style", styleLabel, 5],
                  ].map(([label, value, step]) => (
                    <div key={String(label)} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <dt className="text-xs text-[#7a857d]">{String(label)}</dt>
                        <dd className="truncate">{String(value)}</dd>
                      </div>
                      <button
                        type="button"
                        className="text-xs text-[#2f5233] underline"
                        onClick={() => {
                          patch({ step: Number(step) });
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                </dl>
              </div>
              <p className="mt-3 rounded-md bg-[#eef1e8] px-3 py-2 text-[11px] text-[#405048]">
                💡 Your room dimensions and budget guide recommendations. Renders are concept
                visuals, not architectural plans.
              </p>
              <p className="mt-2 text-xs text-[#7a857d]">
                Costs {totalCost} credits (3 draft concepts).
              </p>
            </div>
          )}

          {progress !== null && (
            <p role="status" className="mt-3 text-xs text-[#5b665f]">
              {progress}
            </p>
          )}

          <div className="mt-6 flex items-center justify-between border-t border-[#eee8db] pt-4">
            <Button type="button" variant="ghost" onClick={back} disabled={draft.step === 0 || busy}>
              ← Back
            </Button>
            {draft.step < STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={next}
                disabled={busy}
                className="bg-[#2f5233] text-white hover:bg-[#27452b]"
              >
                Continue →
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => void submit()}
                disabled={busy}
                aria-busy={busy}
                className="bg-[#2f5233] text-white hover:bg-[#27452b]"
              >
                {busy ? "Working..." : "✨ Generate 3 concepts"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
