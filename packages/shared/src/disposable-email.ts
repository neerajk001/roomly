/**
 * Small, easy-to-update static list of obvious disposable email domains.
 * Deliberately not exhaustive: a hard block only needs to catch the cheap
 * abuse cases before the paid-credit guards take over.
 */
export const DISPOSABLE_EMAIL_DOMAINS: readonly string[] = [
  "10minutemail.com",
  "guerrillamail.com",
  "guerrillamail.info",
  "mailinator.com",
  "temp-mail.org",
  "tempmail.com",
  "throwawaymail.com",
  "trashmail.com",
  "yopmail.com",
  "sharklasers.com",
];

export function isDisposableEmail(email: string): boolean {
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  return DISPOSABLE_EMAIL_DOMAINS.includes(domain);
}
