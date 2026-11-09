import type { ConceptAdvice } from "@roomdesigner/shared";

export interface RenderOutputView {
  advice?: ConceptAdvice;
  directionLabel?: string;
  styleKey?: string | null;
  id: string;
  index: number;
  isFavorite: boolean;
  url: string;
  thumbUrl: string;
}

export interface RenderJobView {
  sourceOutputId?: string | null;
  similarConcepts?: boolean;
  id: string;
  kind: "RESTYLE" | "EDIT";
  status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELED";
  errorMessage: string | null;
  creditsCharged: number;
  outputs: RenderOutputView[];
  label: string;
  styleKey: string | null;
}

export interface RenderJobStatusResponse {
  sourceOutputId?: string | null;
  label?: string;
  similarConcepts?: boolean;
  id: string;
  kind: "RESTYLE" | "EDIT";
  status: RenderJobView["status"];
  errorMessage: string | null;
  creditsCharged: number;
  outputs: RenderOutputView[];
  styleKey: string | null;
}

export function isTerminal(status: RenderJobView["status"]): boolean {
  return status === "SUCCEEDED" || status === "FAILED" || status === "CANCELED";
}
