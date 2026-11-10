"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import {
  ROOM_CHECKLISTS,
  checklistForRoom,
  checklistRoomTypeSchema,
  roomIncludeItemsSchema,
  roomIncludesAreValid,
  recommendContrastingStyles,
  STYLES,
  getStyle,
  totalCreditCost,
  type ChecklistRoomType,
} from "@roomdesigner/shared";
import { createGuidedProjectAction } from "@/server/actions/wizard";
import { requestRender } from "@/lib/request-render";
import { uploadToStorage } from "@/lib/upload-storage";

const uploadResponseSchema = z.object({
  assetId: z.string().min(1),
  upload: z.object({
    url: z.url(),
    method: z.enum(["PUT", "POST"]),
    headers: z.record(z.string(), z.string()),
    fields: z.record(z.string(), z.string()).optional(),
  }),
});
const draftSchema = z
  .object({
    roomType: checklistRoomTypeSchema,
    includeItems: roomIncludeItemsSchema,
    style: z.string().max(64),
    customRequest: z.string().max(300).default(""),
  })
  .refine(
    (draft) =>
      roomIncludesAreValid(draft.roomType, draft.includeItems) &&
      (!draft.style || !!getStyle(draft.style)),
  );
const DRAFT_KEY = "roomly:home-quick-start:v1";
const createdRoomSchema = z
  .object({
    projectId: z.string().min(1).optional(),
    roomId: z.string().min(1).optional(),
    error: z.string().optional(),
  })
  .refine((value) => Boolean(value.error || (value.projectId && value.roomId)));

export function HomeQuickDesign({
  initialStyle,
  clients,
}: {
  initialStyle?: string;
  clients?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const studio = clients !== undefined;
  const [projectName, setProjectName] = useState("");
  const [clientId, setClientId] = useState("");
  const [roomType, setRoomType] = useState<ChecklistRoomType>("LIVING_ROOM");
  const [includeItems, setIncludeItems] = useState<string[]>([]);
  const [style, setStyle] = useState(initialStyle ?? "");
  const [customRequest, setCustomRequest] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [created, setCreated] = useState<{ projectId: string; roomId: string } | null>(null);
  const inFlight = useRef(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      const parsed = raw ? draftSchema.safeParse(JSON.parse(raw) as unknown) : null;
      if (parsed?.success) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- restore validated non-file browser preferences once
        setRoomType(parsed.data.roomType);
        setIncludeItems(parsed.data.includeItems);
        setCustomRequest(parsed.data.customRequest);
        if (!initialStyle) setStyle(parsed.data.style);
      }
    } catch {
      /* Browser storage is optional. */
    }
    setHydrated(true);
  }, [initialStyle]);
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ roomType, includeItems, style, customRequest }),
      );
    } catch {
      /* Optional persistence. */
    }
  }, [hydrated, roomType, includeItems, style, customRequest]);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- preview a locally selected file and release its URL on change
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const room = ROOM_CHECKLISTS.find((entry) => entry.key === roomType);
  async function generate() {
    if (!file || inFlight.current || created) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    let roomPath: string | null = null;
    try {
      const styles = style ? [style] : recommendContrastingStyles("global", 3);
      const primary = styles[0] ?? "modern";
      setProgress("Preparing your room…");
      const form = new FormData();
      form.set(
        "payload",
        JSON.stringify({
          ...(studio && projectName.trim() ? { name: projectName.trim() } : {}),
          ...(studio && clientId ? { clientId } : {}),
          roomType,
          notes: customRequest.trim(),
          widthMm: null,
          lengthMm: null,
          heightMm: null,
          renterMode: false,
          keepList: [],
          budgetMinor: null,
          styleKey: primary,
        }),
      );
      const result = createdRoomSchema.parse(await createGuidedProjectAction({}, form));
      if (!result.projectId || !result.roomId) {
        setError(result.error ?? "Your room could not be created. Please try again.");
        return;
      }
      const context = { projectId: result.projectId, roomId: result.roomId };
      setCreated(context);
      roomPath = `${studio ? "/studio" : "/app"}/projects/${context.projectId}/rooms/${context.roomId}`;
      setProgress("Uploading your photo…");
      const response = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roomId: context.roomId, mime: file.type, sizeBytes: file.size }),
      });
      if (!response.ok) throw new Error("Upload failed.");
      const presign = uploadResponseSchema.parse(await response.json());
      await uploadToStorage(presign.upload, file);
      const confirmed = await fetch(`/api/uploads/${encodeURIComponent(presign.assetId)}/confirm`, {
        method: "POST",
      });
      if (!confirmed.ok) throw new Error("Upload confirmation failed.");
      setProgress("Starting your three ideas…");
      const render = new FormData();
      for (const [key, value] of Object.entries({
        ...context,
        kind: "RESTYLE",
        styleKey: primary,
        styleKeys: JSON.stringify(styles),
        traditionKey: "global",
        variations: "3",
        quality: "draft",
        includeItems: JSON.stringify(includeItems),
        notes: customRequest.trim(),
      }))
        render.set(key, value);
      const queued = await requestRender(render);
      if (!queued.jobId) {
        setError(
          queued.error ??
            "Generation could not be confirmed. Open your room to check before trying again.",
        );
        return;
      }
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* Optional persistence. */
      }
      router.push(roomPath);
    } catch {
      setError(
        roomPath
          ? "Your room was saved, but the upload or generation could not be completed. Open the room to continue; we will not submit it again automatically."
          : "The request could not be confirmed. Check My spaces before trying again.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
      setProgress(null);
    }
  }
  return (
    <div className="mx-auto max-w-4xl space-y-7 px-4 py-8 sm:px-6 sm:py-12">
      <header>
        <p className="text-xs font-medium text-muted-foreground">A fresh start for your room</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {studio ? "Start a client project" : "Your room. Three new ideas."}
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          Add a photo, choose the room and pick any must-haves. We’ll take it from there.
        </p>
      </header>
      {studio && (
        <div className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Project name (optional)
            <input
              aria-label="Project name"
              disabled={busy || !!created}
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              maxLength={120}
              placeholder="We can name it from the room"
              className="mt-2 block h-11 w-full rounded-lg border border-border bg-background px-3"
            />
          </label>
          <label className="text-sm font-medium">
            Client (optional)
            <select
              aria-label="Client"
              disabled={busy || !!created}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="mt-2 block h-11 w-full rounded-lg border border-border bg-background px-3"
            >
              <option value="">No client yet</option>
              {clients?.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl border border-border bg-card p-5">
          <label htmlFor="quick-room-photo" className="block text-base font-semibold">
            Room photo
          </label>
          <p className="mt-1 text-xs text-muted-foreground">
            A clear view of the room. JPG, PNG or WebP, up to 10 MB.
          </p>
          {preview && (
            <div className="mt-4 overflow-hidden rounded-xl bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element -- local file preview */}
              <img
                src={preview}
                alt="Your room photo preview"
                className="max-h-72 w-full object-contain"
              />
            </div>
          )}
          <input
            id="quick-room-photo"
            aria-label="Room photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy || !!created}
            className="mt-4 block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-border file:bg-muted file:px-3 file:py-2 file:text-sm"
            onChange={(event) => {
              const next = event.target.files?.[0];
              if (!next) return;
              if (
                !["image/jpeg", "image/png", "image/webp"].includes(next.type) ||
                next.size > 10 * 1024 * 1024
              ) {
                setError("Choose a JPG, PNG or WebP image up to 10 MB.");
                setFile(null);
                setPreview(null);
                event.target.value = "";
                return;
              }
              setFile(next);
              setError(null);
            }}
          />
          {!file && (
            <div className="mt-5 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-12 text-center text-sm text-muted-foreground">
              Empty, messy or already furnished—start with the room as it is.
            </div>
          )}
        </section>
        <section className="rounded-2xl border border-border bg-card p-5">
          <label htmlFor="quick-room-type" className="block text-sm font-semibold">
            Room type
          </label>
          <select
            id="quick-room-type"
            disabled={busy || !!created}
            value={roomType}
            className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            onChange={(event) => {
              const next = checklistRoomTypeSchema.parse(event.target.value);
              setRoomType(next);
              setIncludeItems([]);
              setError(null);
            }}
          >
            {ROOM_CHECKLISTS.map((entry) => (
              <option key={entry.key} value={entry.key}>
                {entry.label}
              </option>
            ))}
          </select>
          <fieldset className="mt-6" disabled={busy || !!created}>
            <legend className="text-base font-semibold">
              What would you like in your{" "}
              {roomType === "OTHER" ? "space" : (room?.label.toLowerCase() ?? "room")}?
            </legend>
            <p className="mt-2 text-xs text-muted-foreground">
              Pick any must-haves, or let AI decide. These are items to include, not objects to keep
              exactly as photographed.
            </p>
            {includeItems.length > 0 && (
              <button
                type="button"
                className="mt-3 text-xs font-medium underline underline-offset-4"
                onClick={() => setIncludeItems([])}
              >
                Clear selections
              </button>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {checklistForRoom(roomType).map(([key, label]) => (
                <label
                  key={key}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-3 text-sm ${includeItems.includes(key) ? "border-foreground bg-muted" : "border-border"}`}
                >
                  <input
                    type="checkbox"
                    checked={includeItems.includes(key)}
                    className="h-4 w-4 shrink-0 accent-black"
                    onChange={(event) =>
                      setIncludeItems((current) =>
                        event.target.checked
                          ? [...current, key]
                          : current.filter((item) => item !== key),
                      )
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="mt-5 block text-sm font-medium">
            Anything else you want?{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
            <textarea
              aria-label="Additional room requests"
              value={customRequest}
              onChange={(event) => setCustomRequest(event.target.value)}
              maxLength={300}
              rows={2}
              disabled={busy || !!created}
              placeholder="E.g. a prayer corner, space for a piano, or no TV"
              className="mt-2 block w-full resize-y rounded-lg border border-border bg-background p-3 text-sm"
            />
          </label>
          <details className="mt-5 border-t border-border pt-4">
            <summary className="cursor-pointer text-sm font-medium">
              Choose a style (optional)
            </summary>
            <label htmlFor="quick-style" className="sr-only">
              Design style
            </label>
            <select
              id="quick-style"
              value={style}
              disabled={busy || !!created}
              onChange={(event) => setStyle(event.target.value)}
              className="mt-3 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="">Show me different ideas</option>
              {STYLES.map((entry) => (
                <option key={entry.key} value={entry.key}>
                  {entry.label}
                </option>
              ))}
            </select>
            <Link href="/app/inspiration" className="mt-3 inline-block text-sm underline">
              Browse room inspiration →
            </Link>
          </details>
        </section>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-border bg-card p-4 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {progress && (
        <p role="status" className="text-sm">
          {progress}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
        <p className="text-xs text-muted-foreground">
          Three concept visuals · {totalCreditCost("draft", 3)} credits
          <br />
          Measurements and costs can wait until you see a design.
        </p>
        {created && !busy ? (
          <Link
            className="rounded-lg bg-foreground px-5 py-3 text-sm font-semibold text-background"
            href={`${studio ? "/studio" : "/app"}/projects/${created.projectId}/rooms/${created.roomId}`}
          >
            Open saved room →
          </Link>
        ) : (
          <button
            type="button"
            disabled={!file || busy || !hydrated}
            aria-busy={busy}
            onClick={() => void generate()}
            className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Preparing your designs…" : "Generate 3 ideas"}
          </button>
        )}
      </div>
    </div>
  );
}
