"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STYLES } from "@roomdesigner/shared";
import { useState } from "react";

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

const MAX_PHOTOS = 8;

interface UploadState {
  assetId: string;
  name: string;
  status: "uploading" | "done" | "error";
  message?: string;
}

export function BriefForm({
  token,
  clientName,
  brandName,
}: {
  token: string;
  clientName: string;
  brandName: string;
}) {
  const [name, setName] = useState(clientName);
  const [roomType, setRoomType] = useState<string>("LIVING_ROOM");
  const [goals, setGoals] = useState("");
  const [picks, setPicks] = useState<string[]>([]);
  const [budgetBand, setBudgetBand] = useState("not_sure");
  const [timeline, setTimeline] = useState("");
  const [keepItems, setKeepItems] = useState("");
  const [notes, setNotes] = useState("");
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const assetIds = uploads.filter((upload) => upload.status === "done").map((upload) => upload.assetId);

  const togglePick = (key: string) => {
    setPicks((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : current.length < 3
          ? [...current, key]
          : current,
    );
  };

  const addPhotos = async (files: FileList | null) => {
    if (files === null) return;
    const remaining = MAX_PHOTOS - uploads.length;
    for (const file of Array.from(files).slice(0, Math.max(remaining, 0))) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setError("Only JPEG, PNG or WebP photos are supported.");
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("Photos must be 10 MB or smaller.");
        continue;
      }
      const entry: UploadState = {
        assetId: `${file.name}-${String(Date.now())}`,
        name: file.name,
        status: "uploading",
      };
      setUploads((current) => [...current, entry]);
      try {
        const presignResponse = await fetch(`/api/brief/${token}/upload`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mime: file.type, sizeBytes: file.size }),
        });
        if (!presignResponse.ok) throw new Error("Upload could not start.");
        const presign = (await presignResponse.json()) as { assetId: string; uploadUrl: string };
        const put = await fetch(presign.uploadUrl, {
          method: "PUT",
          headers: { "content-type": file.type },
          body: file,
        });
        if (!put.ok) throw new Error("Upload failed.");
        const confirm = await fetch(`/api/brief/${token}/confirm/${presign.assetId}`, {
          method: "POST",
        });
        if (!confirm.ok) throw new Error("Upload could not be confirmed.");
        setUploads((current) =>
          current.map((item) =>
            item.assetId === entry.assetId
              ? { ...item, assetId: presign.assetId, status: "done" }
              : item,
          ),
        );
      } catch (uploadError) {
        setUploads((current) =>
          current.map((item) =>
            item.assetId === entry.assetId
              ? {
                  ...item,
                  status: "error",
                  message: uploadError instanceof Error ? uploadError.message : "Upload failed.",
                }
              : item,
          ),
        );
      }
    }
  };

  const submit = async () => {
    setError(null);
    if (name.trim() === "") {
      setError("Your name is required.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/brief/${token}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          answers: {
            roomType,
            clientName: name,
            goals: goals === "" ? undefined : goals,
            styleLikes: picks,
            budgetBand,
            timeline: timeline === "" ? undefined : timeline,
            keepItems: keepItems === "" ? undefined : keepItems,
            notes: notes === "" ? undefined : notes,
          },
          assetIds,
          website: "",
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(body?.error?.message ?? "Could not send the brief.");
      }
      setDone(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not send the brief.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="space-y-3 text-center">
        <h2 className="text-xl font-semibold text-foreground">Thank you!</h2>
        <p className="text-sm text-muted-foreground">
          Your brief is with {brandName}. They will be in touch with next steps.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error !== null && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="brief-name">Your name</Label>
        <Input
          id="brief-name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
          maxLength={120}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="brief-room">Room type</Label>
        <select
          id="brief-room"
          value={roomType}
          onChange={(event) => {
            setRoomType(event.target.value);
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

      <div className="space-y-2">
        <Label htmlFor="brief-goals">What do you want to change?</Label>
        <textarea
          id="brief-goals"
          rows={3}
          maxLength={800}
          value={goals}
          onChange={(event) => {
            setGoals(event.target.value);
          }}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Styles you like (up to 3)</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STYLES.slice(0, 8).map((style) => {
            const active = picks.includes(style.key);
            return (
              <button
                key={style.key}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  togglePick(style.key);
                }}
                className={`rounded-lg border p-2 text-left text-xs ${active ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
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
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="brief-budget">Budget</Label>
          <select
            id="brief-budget"
            value={budgetBand}
            onChange={(event) => {
              setBudgetBand(event.target.value);
            }}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="under_1k">Under 1k</option>
            <option value="1k_5k">1k – 5k</option>
            <option value="5k_15k">5k – 15k</option>
            <option value="15k_plus">15k+</option>
            <option value="not_sure">Not sure yet</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="brief-timeline">Timeline</Label>
          <Input
            id="brief-timeline"
            value={timeline}
            maxLength={120}
            placeholder="E.g. before the holidays"
            onChange={(event) => {
              setTimeline(event.target.value);
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="brief-keep">Anything that must stay?</Label>
        <Input
          id="brief-keep"
          value={keepItems}
          maxLength={500}
          placeholder="E.g. the sofa, the bookshelf"
          onChange={(event) => {
            setKeepItems(event.target.value);
          }}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="brief-photos">Photos of the room (up to {MAX_PHOTOS})</Label>
        <input
          id="brief-photos"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          multiple
          onChange={(event) => {
            void addPhotos(event.target.files);
            event.target.value = "";
          }}
          className="block w-full rounded-md border border-input p-2 text-sm"
        />
        {uploads.length > 0 && (
          <ul className="space-y-1 text-xs">
            {uploads.map((upload) => (
              <li key={upload.assetId} className="flex justify-between gap-2">
                <span className="truncate">{upload.name}</span>
                <span className={upload.status === "error" ? "text-destructive" : "text-muted-foreground"}>
                  {upload.status === "done" ? "Uploaded" : upload.status === "error" ? "Failed" : "Uploading..."}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="brief-notes">Notes</Label>
        <textarea
          id="brief-notes"
          rows={3}
          maxLength={1000}
          value={notes}
          onChange={(event) => {
            setNotes(event.target.value);
          }}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        />
      </div>

      {/* Honeypot: hidden from people, tempting for bots. */}
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
        readOnly
      />

      <Button type="button" onClick={() => void submit()} disabled={submitting} aria-busy={submitting}>
        {submitting ? "Sending..." : "Send brief"}
      </Button>
    </div>
  );
}
