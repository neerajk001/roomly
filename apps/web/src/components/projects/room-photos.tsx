"use client";

import { Button } from "@/components/ui/button";
import { uploadToStorage } from "@/lib/upload-storage";
import type { UploadTarget } from "@roomdesigner/shared";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

interface ExistingPhoto {
  id: string;
  url: string;
}

interface UploadItem {
  id: string;
  name: string;
  file: File;
  status: "uploading" | "error" | "done";
  progress: number;
  message?: string;
}

const MAX_PHOTOS = 3;

export function RoomPhotos({
  roomId,
  photos,
}: {
  roomId: string;
  photos: ExistingPhoto[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = MAX_PHOTOS - photos.length - uploads.filter((u) => u.status !== "error").length;

  const startUpload = (file: File) => {
    const item: UploadItem = {
      id: crypto.randomUUID(),
      name: file.name,
      file,
      status: "uploading",
      progress: 0,
    };
    setUploads((current) => [...current, item]);
    void runUpload(item);
  };

  const runUpload = async (item: UploadItem) => {
    setUploads((current) =>
      current.map((u) => (u.id === item.id ? { ...u, status: "uploading", progress: 0, message: undefined } : u)),
    );
    setError(null);
    try {
      const presignResponse = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          roomId,
          mime: item.file.type,
          sizeBytes: item.file.size,
        }),
      });
      if (!presignResponse.ok) {
        const body = (await presignResponse.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(body?.error?.message ?? "Upload could not start.");
      }
      const presign = (await presignResponse.json()) as {
        assetId: string;
        upload: UploadTarget;
      };

      await uploadToStorage(presign.upload, item.file, (progress) => {
        setUploads((current) =>
          current.map((u) => (u.id === item.id ? { ...u, progress } : u)),
        );
      });

      const confirmResponse = await fetch(`/api/uploads/${presign.assetId}/confirm`, {
        method: "POST",
      });
      if (!confirmResponse.ok) {
        const body = (await confirmResponse.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(body?.error?.message ?? "Upload could not be confirmed.");
      }

      setUploads((current) =>
        current.map((u) => (u.id === item.id ? { ...u, status: "done", progress: 100 } : u)),
      );
      router.refresh();
    } catch (uploadError) {
      setUploads((current) =>
        current.map((u) =>
          u.id === item.id
            ? {
                ...u,
                status: "error",
                message: uploadError instanceof Error ? uploadError.message : "Upload failed.",
              }
            : u,
        ),
      );
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (files === null) return;
    const list = Array.from(files);
    for (const file of list.slice(0, Math.max(remaining, 0))) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setError("Only JPEG, PNG or WebP photos are supported.");
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("Photos must be 10 MB or smaller.");
        continue;
      }
      startUpload(file);
    }
    if (list.length > remaining) {
      setError(`You can add ${MAX_PHOTOS} photos per room.`);
    }
  };

  return (
    <div className="space-y-3">
      {photos.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {photos.map((photo) => (
            <li key={photo.id}>
              {/* eslint-disable-next-line @next/next/no-img-element -- signed URL, no optimizer */}
              <img
                src={photo.url}
                alt="Room photo"
                className="h-20 w-28 rounded-md border border-border object-cover"
                loading="lazy"
              />
            </li>
          ))}
        </ul>
      )}

      {remaining > 0 && (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => {
            setDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            handleFiles(event.dataTransfer.files);
          }}
          className={`rounded-lg border border-dashed p-4 text-center transition-colors ${
            dragging ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          <p className="text-sm text-muted-foreground">
            Drop a photo here, or{" "}
            <button
              type="button"
              onClick={() => {
                inputRef.current?.click();
              }}
              className="font-medium text-foreground underline"
            >
              choose a file
            </button>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            JPEG, PNG or WebP · up to 10 MB · {remaining} more allowed
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            multiple
            className="sr-only"
            onChange={(event) => {
              handleFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>
      )}

      {error !== null && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}

      {uploads.length > 0 && (
        <ul className="space-y-2">
          {uploads.map((upload) => (
            <li key={upload.id} className="rounded-md border border-border p-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-foreground">{upload.name}</span>
                <span className="text-muted-foreground">
                  {upload.status === "done"
                    ? "Uploaded"
                    : upload.status === "error"
                      ? "Failed"
                      : `${String(upload.progress)}%`}
                </span>
              </div>
              {upload.status === "uploading" && (
                <div
                  className="mt-1 h-1 w-full overflow-hidden rounded bg-muted"
                  role="progressbar"
                  aria-valuenow={upload.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="h-full bg-primary" style={{ width: `${String(upload.progress)}%` }} />
                </div>
              )}
              {upload.status === "error" && (
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="text-destructive">{upload.message ?? "Upload failed."}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void runUpload(upload);
                    }}
                  >
                    Retry
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
