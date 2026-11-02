export interface RenderOutputView {
  id: string;
  index: number;
  isFavorite: boolean;
  url: string;
  thumbUrl: string;
}

export interface RenderJobView {
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
