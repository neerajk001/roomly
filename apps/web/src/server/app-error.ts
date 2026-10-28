/**
 * Typed application error. Services throw AppError; route handlers and server
 * actions map it to a safe response. Provider errors and stack traces never
 * reach the user.
 */
export class AppError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}
