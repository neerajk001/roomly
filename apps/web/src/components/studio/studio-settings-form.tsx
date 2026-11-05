"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadToStorage } from "@/lib/upload-storage";
import { setLogoAction, updateStudioAction, type StudioFormState } from "@/server/actions/studio";
import { CURRENCIES, type UploadTarget } from "@roomdesigner/shared";
import { useRouter } from "next/navigation";
import { useActionState, useRef, useState } from "react";

export interface StudioProfileValues {
  name: string;
  brandColor: string | null;
  currency: string;
  unitSystem: string;
  contactEmail: string | null;
  contactPhone: string | null;
  defaultTerms: string | null;
}

export function StudioSettingsForm({ profile }: { profile: StudioProfileValues }) {
  const [state, formAction, pending] = useActionState(updateStudioAction, {} as StudioFormState);
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoNotice, setLogoNotice] = useState<string | null>(null);

  const uploadLogo = async (file: File) => {
    setLogoError(null);
    setLogoNotice(null);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setLogoError("Use a PNG, JPEG or WebP logo.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError("Logos must be 2 MB or smaller.");
      return;
    }
    setLogoBusy(true);
    try {
      const presignResponse = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "LOGO", mime: file.type, sizeBytes: file.size }),
      });
      if (!presignResponse.ok) throw new Error("Could not start the logo upload.");
      const presign = (await presignResponse.json()) as {
        assetId: string;
        upload: UploadTarget;
      };
      await uploadToStorage(presign.upload, file);
      const confirm = await fetch(`/api/uploads/${presign.assetId}/confirm`, { method: "POST" });
      if (!confirm.ok) throw new Error("Logo could not be confirmed.");
      const result = await setLogoAction(presign.assetId);
      if (result.error !== undefined) throw new Error(result.error);
      setLogoNotice("Logo updated.");
      router.refresh();
    } catch (error) {
      setLogoError(error instanceof Error ? error.message : "Logo upload failed.");
    } finally {
      setLogoBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <form action={formAction} className="space-y-4">
        {state.error !== undefined && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}
        {state.notice !== undefined && (
          <p role="status" className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
            {state.notice}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="studio-name">Studio name</Label>
            <Input id="studio-name" name="name" defaultValue={profile.name} required maxLength={120} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="studio-color">Brand colour</Label>
            <Input
              id="studio-color"
              name="brandColor"
              defaultValue={profile.brandColor ?? ""}
              placeholder="#1f2937"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="studio-currency">Currency</Label>
            <select
              id="studio-currency"
              name="currency"
              defaultValue={profile.currency}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="studio-units">Units</Label>
            <select
              id="studio-units"
              name="unitSystem"
              defaultValue={profile.unitSystem}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="METRIC">Metric (m, cm)</option>
              <option value="IMPERIAL">Imperial (ft, in)</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="studio-email">Contact email</Label>
            <Input
              id="studio-email"
              name="contactEmail"
              type="email"
              defaultValue={profile.contactEmail ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="studio-phone">Contact phone</Label>
            <Input id="studio-phone" name="contactPhone" defaultValue={profile.contactPhone ?? ""} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="studio-terms">Default proposal terms</Label>
          <textarea
            id="studio-terms"
            name="defaultTerms"
            rows={4}
            maxLength={4000}
            defaultValue={profile.defaultTerms ?? ""}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save studio profile"}
        </Button>
      </form>

      <div className="space-y-2 border-t border-border pt-6">
        <Label htmlFor="studio-logo">Logo</Label>
        <p className="text-xs text-muted-foreground">
          PNG, JPEG or WebP, max 2 MB. Stored without EXIF and shown on briefs and proposals.
        </p>
        <input
          ref={fileRef}
          id="studio-logo"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="block w-full rounded-md border border-input p-2 text-sm"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file !== undefined) void uploadLogo(file);
            event.target.value = "";
          }}
          disabled={logoBusy}
        />
        {logoBusy && <p className="text-xs text-muted-foreground">Uploading...</p>}
        {logoError !== null && (
          <p role="alert" className="text-xs text-destructive">
            {logoError}
          </p>
        )}
        {logoNotice !== null && (
          <p role="status" className="text-xs text-muted-foreground">
            {logoNotice}
          </p>
        )}
      </div>
    </div>
  );
}
