"use client";

export function RenderStatusNotice({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry(): void;
}) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-lg border border-border bg-muted p-3 text-sm">
      <p>{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 rounded-lg border border-border bg-card px-3 py-2 font-medium"
      >
        Check status again
      </button>
    </div>
  );
}
