/**
 * A browser upload target returned by the storage provider. S3-compatible
 * storage uses a presigned PUT; Cloudinary uses a signed multipart POST.
 * This type is client-safe so upload components can share one helper.
 */
export interface UploadTarget {
  url: string;
  method: "PUT" | "POST";
  headers: Record<string, string>;
  fields?: Record<string, string>;
}
