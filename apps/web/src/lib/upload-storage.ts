import type { UploadTarget } from "@roomdesigner/shared";

/**
 * Uploads a file directly to the storage provider. S3-compatible storage uses
 * a presigned PUT; Cloudinary uses a signed multipart POST. Keeping both flows
 * here means components never know which provider is configured.
 */
export function uploadToStorage(
  target: UploadTarget,
  file: File,
  onProgress?: (progress: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(target.method, target.url);

    if (target.method === "PUT") {
      for (const [key, value] of Object.entries(target.headers)) {
        request.setRequestHeader(key, value);
      }
    }

    if (onProgress !== undefined) {
      request.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
    }

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
        return;
      }
      reject(new Error("Upload failed. Try again."));
    };
    request.onerror = () => {
      reject(new Error("Network error during upload."));
    };

    if (target.method === "POST") {
      const form = new FormData();
      for (const [key, value] of Object.entries(target.fields ?? {})) {
        form.append(key, value);
      }
      form.append("file", file);
      request.send(form);
      return;
    }

    request.send(file);
  });
}
