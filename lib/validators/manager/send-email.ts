import { z } from "zod";
import { formValidationFailure } from "@/lib/validators/safe-parse-form-data";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";
import {
  EMAIL_LOCALES,
  EMAIL_TEMPLATE_IDS,
  type EmailTemplateId,
} from "@/lib/email/templates";
import { EMAIL_REGEX, emailField } from "@/lib/validators/auth/fields";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

/** Bounds shared by Zod + HTML attributes (aligned with email_sent text columns). */
export const EMAIL_COMPOSE_LIMITS = {
  recipients: 200,
  subject: 200,
  title: 200,
  body: 5_000,
  bodyCustom: 50_000,
  bodyHtml: 100_000,
  shortText: 500,
  nextStep: 1_000,
  amount: 100,
  date: 100,
  url: 2_000,
} as const;

const optionalTrimmed = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

/** Empty string → undefined so optional email fields work with RHF. */
const optionalEmailField = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  },
  emailField.optional()
);

const optionalUrlField = optionalTrimmed.refine(
  (value) => {
    if (!value) {
      return true;
    }
    try {
      // Absolute URL only when provided
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  { message: "CTA URL must be a valid link (https://…)." }
);

const optionalIsoDateField = optionalTrimmed.refine(
  (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
  { message: "Please enter a valid date." }
);

function isBlankRichText(html?: string) {
  if (!html?.trim()) {
    return true;
  }

  const text = html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text.length === 0;
}

export const sendEmailSchema = z
  .object({
    templateId: z.enum(EMAIL_TEMPLATE_IDS, {
      message: "Select a valid email template.",
    }),
    locale: z
      .enum(EMAIL_LOCALES, {
        message: "Select a language.",
      })
      .default("en"),
    userIds: z
      .array(z.string().uuid({ message: "Invalid user id." }))
      .max(EMAIL_COMPOSE_LIMITS.recipients, {
        message: `You can email at most ${EMAIL_COMPOSE_LIMITS.recipients} users at once.`,
      })
      .default([]),
    toEmail: optionalEmailField,
    toEmails: z
      .array(emailField)
      .max(EMAIL_COMPOSE_LIMITS.recipients, {
        message: `You can email at most ${EMAIL_COMPOSE_LIMITS.recipients} addresses at once.`,
      })
      .default([]),
    bodyHtml: optionalTrimmed,
    // welcome
    account_email: optionalEmailField,
    temporary_password: optionalTrimmed,
    // announcement / custom
    title: optionalTrimmed,
    body: optionalTrimmed,
    date: optionalIsoDateField,
    subject: optionalTrimmed,
    // reminder
    item_name: optionalTrimmed,
    due_at: optionalTrimmed,
    consequence: optionalTrimmed,
    cta_url: optionalUrlField,
    // payment
    amount: optionalTrimmed,
    due_date: optionalIsoDateField,
    semester_label: optionalTrimmed,
    contact_note: optionalTrimmed,
    // enrollment
    semester_name: optionalTrimmed,
    status: optionalTrimmed,
    start_date: optionalIsoDateField,
    next_step: optionalTrimmed,
  })
  .superRefine((values, context) => {
    const hasUsers = values.userIds.length > 0;
    const hasExternalEmail = Boolean(values.toEmail);
    const hasExternalEmails = (values.toEmails?.length ?? 0) > 0;
    const totalRecipients =
      values.userIds.length +
      (hasExternalEmail ? 1 : 0) +
      (values.toEmails?.length ?? 0);

    if (!hasUsers && !hasExternalEmail && !hasExternalEmails) {
      const message = "Enter a recipient email or select at least one user.";
      context.addIssue({ code: "custom", message, path: ["toEmail"] });
      context.addIssue({ code: "custom", message, path: ["toEmails"] });
      context.addIssue({ code: "custom", message, path: ["userIds"] });
    }

    if (totalRecipients > EMAIL_COMPOSE_LIMITS.recipients) {
      context.addIssue({
        code: "custom",
        message: `You can email at most ${EMAIL_COMPOSE_LIMITS.recipients} recipients at once.`,
        path: ["userIds"],
      });
    }

    // Legacy single-email dialog: disallow mixing one typed address with user picks.
    if (hasUsers && hasExternalEmail && !hasExternalEmails) {
      context.addIssue({
        code: "custom",
        message: "Send either to a typed email or to selected users, not both.",
        path: ["toEmail"],
      });
    }

    const requireField = (
      key: keyof typeof values,
      label: string,
      max: number = EMAIL_COMPOSE_LIMITS.shortText
    ) => {
      const raw = values[key];
      if (typeof raw !== "string" || !raw.trim()) {
        context.addIssue({
          code: "custom",
          message: `${label} is required.`,
          path: [key],
        });
        return;
      }
      if (raw.trim().length > max) {
        context.addIssue({
          code: "custom",
          message: `${label} must be at most ${max} characters.`,
          path: [key],
        });
      }
    };

    switch (values.templateId) {
      case "welcome":
        requireField("account_email", "Account email", AUTH_LIMITS.email.max);
        requireField(
          "temporary_password",
          "Temporary password",
          AUTH_LIMITS.password.max
        );
        break;
      case "announcement":
        requireField("title", "Title", EMAIL_COMPOSE_LIMITS.title);
        requireField("body", "Message", EMAIL_COMPOSE_LIMITS.body);
        if (values.date && values.date.length > EMAIL_COMPOSE_LIMITS.date) {
          context.addIssue({
            code: "custom",
            message: `Date must be at most ${EMAIL_COMPOSE_LIMITS.date} characters.`,
            path: ["date"],
          });
        }
        break;
      case "reminder":
        requireField("item_name", "Item name");
        requireField("due_at", "Date / time", EMAIL_COMPOSE_LIMITS.date);
        if (
          values.consequence &&
          values.consequence.length > EMAIL_COMPOSE_LIMITS.body
        ) {
          context.addIssue({
            code: "custom",
            message: `Note must be at most ${EMAIL_COMPOSE_LIMITS.body} characters.`,
            path: ["consequence"],
          });
        }
        if (values.cta_url && values.cta_url.length > EMAIL_COMPOSE_LIMITS.url) {
          context.addIssue({
            code: "custom",
            message: `CTA URL must be at most ${EMAIL_COMPOSE_LIMITS.url} characters.`,
            path: ["cta_url"],
          });
        }
        break;
      case "payment_reminder":
        requireField("amount", "Amount", EMAIL_COMPOSE_LIMITS.amount);
        requireField("due_date", "Due date", EMAIL_COMPOSE_LIMITS.date);
        requireField("semester_label", "Semester / label");
        if (
          values.contact_note &&
          values.contact_note.length > EMAIL_COMPOSE_LIMITS.body
        ) {
          context.addIssue({
            code: "custom",
            message: `Contact note must be at most ${EMAIL_COMPOSE_LIMITS.body} characters.`,
            path: ["contact_note"],
          });
        }
        break;
      case "enrollment":
        requireField("semester_name", "Semester name");
        requireField("status", "Status");
        requireField("start_date", "Start date", EMAIL_COMPOSE_LIMITS.date);
        requireField("next_step", "Next step", EMAIL_COMPOSE_LIMITS.nextStep);
        break;
      case "custom": {
        requireField("subject", "Subject", EMAIL_COMPOSE_LIMITS.subject);
        const hasHtml = !isBlankRichText(values.bodyHtml);
        if (hasHtml) {
          if (
            (values.bodyHtml?.length ?? 0) > EMAIL_COMPOSE_LIMITS.bodyHtml
          ) {
            context.addIssue({
              code: "custom",
              message: "Message is too long.",
              path: ["bodyHtml"],
            });
          }
        } else {
          requireField("body", "Message", EMAIL_COMPOSE_LIMITS.bodyCustom);
        }
        break;
      }
    }
  });

export type SendEmailInput = z.infer<typeof sendEmailSchema>;

function parseUserIds(formData: FormData): string[] {
  const multi = formData
    .getAll("userIds")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (multi.length > 0) {
    return [...new Set(multi)];
  }

  const csv = String(formData.get("userIds") ?? "").trim();
  if (!csv) {
    return [];
  }

  return [
    ...new Set(
      csv
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    ),
  ];
}

function parseToEmails(formData: FormData): string[] {
  const multi = formData
    .getAll("toEmails")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (multi.length > 0) {
    return [...new Set(multi.map((email) => email.toLowerCase()))];
  }

  const csv = String(formData.get("toEmails") ?? "").trim();
  if (!csv) {
    return [];
  }

  return [
    ...new Set(
      csv
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
}

export function parseSendEmailFormData(formData: FormData):
  | { success: true; data: SendEmailInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const rawToEmail = String(formData.get("toEmail") ?? "").trim();
  const rawLocale = String(formData.get("locale") ?? "en").trim();
  const rawBodyHtml = String(formData.get("bodyHtml") ?? "").trim();

  const parsed = sendEmailSchema.safeParse({
    templateId: formData.get("templateId"),
    locale: rawLocale || "en",
    userIds: parseUserIds(formData),
    toEmail: rawToEmail || undefined,
    toEmails: parseToEmails(formData),
    bodyHtml: rawBodyHtml || undefined,
    account_email: formData.get("account_email") ?? undefined,
    temporary_password: formData.get("temporary_password") ?? undefined,
    title: formData.get("title") ?? undefined,
    body: formData.get("body") ?? undefined,
    date: formData.get("date") ?? undefined,
    subject: formData.get("subject") ?? undefined,
    item_name: formData.get("item_name") ?? undefined,
    due_at: formData.get("due_at") ?? undefined,
    consequence: formData.get("consequence") ?? undefined,
    cta_url: formData.get("cta_url") ?? undefined,
    amount: formData.get("amount") ?? undefined,
    due_date: formData.get("due_date") ?? undefined,
    semester_label: formData.get("semester_label") ?? undefined,
    contact_note: formData.get("contact_note") ?? undefined,
    semester_name: formData.get("semester_name") ?? undefined,
    status: formData.get("status") ?? undefined,
    start_date: formData.get("start_date") ?? undefined,
    next_step: formData.get("next_step") ?? undefined,
  });

  if (!parsed.success) {
    return formValidationFailure(zodFieldErrors(parsed.error.flatten().fieldErrors));
  }

  return { success: true, data: parsed.data };
}

export function isValidComposeEmail(value: string) {
  return EMAIL_REGEX.test(value.trim());
}

export type { EmailTemplateId };
