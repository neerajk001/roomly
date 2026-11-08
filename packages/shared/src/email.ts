import { getServerEnv } from "@roomdesigner/config/env";

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
  idempotencyKey?: string;
}

/**
 * Abstraction over transactional email. Dev uses the console implementation
 * (URLs are printed to the server log); production uses Resend behind the
 * same interface.
 */
export interface EmailSender {
  send(input: SendEmailInput): Promise<void>;
}

const consoleSender: EmailSender = {
  async send(input) {
    // Structured single-line log; EMAIL_PROVIDER=console is the dev implementation.
    // eslint-disable-next-line no-console -- logging is this implementation's purpose
    console.info(
      JSON.stringify({
        channel: "email",
        provider: "console",
        to: input.to,
        subject: input.subject,
        body: input.text,
      }),
    );
  },
};

const createResendSender = (apiKey: string, from: string): EmailSender => ({
  async send(input) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        ...(input.idempotencyKey !== undefined ? { "Idempotency-Key": input.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        ...(input.html !== undefined ? { html: input.html } : {}),
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Resend email send failed (${response.status}): ${detail}`);
    }
  },
});

export function getEmailSender(): EmailSender {
  const env = getServerEnv();
  if (env.EMAIL_PROVIDER === "resend") {
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
      throw new Error("EMAIL_PROVIDER=resend requires RESEND_API_KEY and EMAIL_FROM");
    }
    return createResendSender(env.RESEND_API_KEY, env.EMAIL_FROM);
  }
  return consoleSender;
}
