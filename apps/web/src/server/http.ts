import { NextResponse } from "next/server";
import { AppError } from "./app-error";
import { ImageError } from "@roomdesigner/storage";
import { logEvent } from "@roomdesigner/shared/logger";

/**
 * Maps domain errors to safe JSON responses. Unknown errors become a generic
 * 500; stack traces and provider messages never reach the client.
 */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }
  if (error instanceof ImageError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message:
            error.code === "IMAGE_TOO_LARGE"
              ? "Images must be 10 MB or smaller."
              : "That file could not be read as an image.",
        },
      },
      { status: 400 },
    );
  }
  logEvent("error", "unhandled_server_error", { message: error instanceof Error ? error.message : "unknown" });
  return NextResponse.json(
    { error: { code: "INTERNAL", message: "Something went wrong. Try again." } },
    { status: 500 },
  );
}
