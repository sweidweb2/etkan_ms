import { z } from "zod";
import { emailField } from "@/lib/validators/auth/fields";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import { EMAIL_COMPOSE_LIMITS } from "@/lib/validators/manager/send-email";
import type { FieldErrors } from "@/types/auth";

export const resendEmailSchema = z
  .object({
    emailSentId: z.string().uuid({ message: "Invalid sent email." }),
    userIds: z
      .array(z.string().uuid({ message: "Invalid user id." }))
      .max(EMAIL_COMPOSE_LIMITS.recipients, {
        message: `You can email at most ${EMAIL_COMPOSE_LIMITS.recipients} users at once.`,
      })
      .default([]),
    toEmails: z
      .array(emailField)
      .max(EMAIL_COMPOSE_LIMITS.recipients, {
        message: `You can email at most ${EMAIL_COMPOSE_LIMITS.recipients} addresses at once.`,
      })
      .default([]),
  })
  .superRefine((values, context) => {
    if (values.userIds.length === 0 && values.toEmails.length === 0) {
      const message = "Add at least one recipient.";
      context.addIssue({ code: "custom", message, path: ["toEmails"] });
      context.addIssue({ code: "custom", message, path: ["userIds"] });
    }

    if (
      values.userIds.length + values.toEmails.length >
      EMAIL_COMPOSE_LIMITS.recipients
    ) {
      context.addIssue({
        code: "custom",
        message: `You can email at most ${EMAIL_COMPOSE_LIMITS.recipients} recipients at once.`,
        path: ["userIds"],
      });
    }
  });

export type ResendEmailInput = z.infer<typeof resendEmailSchema>;

function parseUserIds(formData: FormData): string[] {
  const multi = formData
    .getAll("userIds")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (multi.length > 0) {
    return [...new Set(multi)];
  }

  return [];
}

function parseToEmails(formData: FormData): string[] {
  const multi = formData
    .getAll("toEmails")
    .map((value) => String(value).trim().toLowerCase())
    .filter(Boolean);

  return [...new Set(multi)];
}

export function parseResendEmailFormData(formData: FormData):
  | { success: true; data: ResendEmailInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = resendEmailSchema.safeParse({
    emailSentId: formData.get("emailSentId"),
    userIds: parseUserIds(formData),
    toEmails: parseToEmails(formData),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  return { success: true, data: parsed.data };
}
