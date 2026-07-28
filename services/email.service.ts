import {
  createMailtrapClient,
  getMailtrapSender,
} from "@/lib/mailtrap/client";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

export type SendEmailResult =
  | { success: true; messageIds: string[] }
  | { success: false; error: string };

function normalizeRecipients(to: string | string[]) {
  const emails = (Array.isArray(to) ? to : [to])
    .map((email) => email.trim())
    .filter(Boolean);

  return emails.map((email) => ({ email }));
}

/** Sends a transactional email via Mailtrap Email Sending API. */
export async function sendEmail(
  input: SendEmailInput
): Promise<SendEmailResult> {
  const recipients = normalizeRecipients(input.to);

  if (recipients.length === 0) {
    return { success: false, error: "At least one recipient email is required." };
  }

  if (!input.subject.trim()) {
    return { success: false, error: "Subject is required." };
  }

  if (!input.text.trim() && !input.html?.trim()) {
    return { success: false, error: "Email body is required." };
  }

  try {
    const client = createMailtrapClient();
    const from = getMailtrapSender();

    const response = await client.send({
      from,
      to: recipients,
      subject: input.subject.trim(),
      text: input.text,
      ...(input.html ? { html: input.html } : {}),
    });

    return {
      success: true,
      messageIds: response.message_ids ?? [],
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send email.";
    return { success: false, error: message };
  }
}

/** One-off connectivity check: sends a short test message via Mailtrap. */
export async function sendMailtrapTestEmail(
  to = "asweid657@gmail.com"
): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: "Etkan MS — Mailtrap test",
    text: "This is a test email from Etkan MS via Mailtrap.",
    html: "<p>This is a test email from <strong>Etkan MS</strong> via Mailtrap.</p>",
  });
}
