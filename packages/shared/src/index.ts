// Shared zod schemas, constants (styles, plans, credits), types.
// This barrel must stay free of side effects and secrets: it is imported by
// client code too. Server-only modules (email) live in their own files and
// must be imported directly.
export { getEmailSender, type EmailSender, type SendEmailInput } from "./email.js";
