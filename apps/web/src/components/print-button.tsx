"use client";

export function PrintButton({ label = "Print / save as PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        window.print();
      }}
      className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted/50 print:hidden"
    >
      {label}
    </button>
  );
}
