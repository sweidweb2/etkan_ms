import "server-only";

import { MailtrapClient } from "mailtrap";

export type MailtrapSender = {
  email: string;
  name: string;
};

/**
 * Mailtrap Email Sending client. Server-only — never expose the token to the browser.
 */
export function createMailtrapClient() {
  const token = process.env.MAILTRAP_API_KEY;

  if (!token) {
    throw new Error("MAILTRAP_API_KEY is not set");
  }

  return new MailtrapClient({ token });
}

/** Verified sending-domain address used as the From header. */
export function getMailtrapSender(): MailtrapSender {
  const email = process.env.MAILTRAP_FROM_EMAIL;
  const name = process.env.MAILTRAP_FROM_NAME ?? "Etkan MS";

  if (!email) {
    throw new Error(
      "MAILTRAP_FROM_EMAIL is not set. Use an address on your verified Mailtrap domain (e.g. noreply@etkan.org)."
    );
  }

  return { email, name };
}
