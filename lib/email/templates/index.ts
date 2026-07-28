import { renderAnnouncementEmail } from "@/lib/email/templates/announcement";
import { renderCustomEmail } from "@/lib/email/templates/custom";
import { renderEnrollmentEmail } from "@/lib/email/templates/enrollment";
import { renderPaymentReminderEmail } from "@/lib/email/templates/payment-reminder";
import { renderReminderEmail } from "@/lib/email/templates/reminder";
import { renderWelcomeEmail } from "@/lib/email/templates/welcome";
import type {
  EmailTemplateId,
  EmailTemplateMeta,
  EmailTemplateVarsById,
  RenderedEmail,
} from "@/lib/email/templates/types";
import { EMAIL_LOCALES, EMAIL_TEMPLATE_IDS } from "@/lib/email/templates/types";

export { EMAIL_TEMPLATE_IDS, EMAIL_LOCALES };
export type {
  EmailTemplateId,
  EmailLocale,
  EmailTemplateMeta,
  EmailTemplateVarsById,
  RenderedEmail,
} from "@/lib/email/templates/types";

export const EMAIL_TEMPLATES: EmailTemplateMeta[] = [
  {
    id: "welcome",
    label: "Welcome",
    description: "Send account credentials and a sign-in link.",
  },
  {
    id: "announcement",
    label: "Announcement",
    description: "Broadcast a school or group announcement.",
  },
  {
    id: "reminder",
    label: "Reminder",
    description: "Nudge users about an upcoming item or deadline.",
  },
  {
    id: "payment_reminder",
    label: "Payment reminder",
    description: "Remind users about an upcoming or overdue payment.",
  },
  {
    id: "enrollment",
    label: "Enrollment update",
    description: "Notify users about semester enrollment status.",
  },
  {
    id: "custom",
    label: "Custom",
    description: "Compose a free-form email with the Etkan layout.",
  },
];

export function isEmailTemplateId(value: string): value is EmailTemplateId {
  return (EMAIL_TEMPLATE_IDS as readonly string[]).includes(value);
}

export function renderEmailTemplate<T extends EmailTemplateId>(
  id: T,
  vars: EmailTemplateVarsById[T]
): RenderedEmail {
  switch (id) {
    case "welcome":
      return renderWelcomeEmail(vars as EmailTemplateVarsById["welcome"]);
    case "announcement":
      return renderAnnouncementEmail(
        vars as EmailTemplateVarsById["announcement"]
      );
    case "reminder":
      return renderReminderEmail(vars as EmailTemplateVarsById["reminder"]);
    case "payment_reminder":
      return renderPaymentReminderEmail(
        vars as EmailTemplateVarsById["payment_reminder"]
      );
    case "enrollment":
      return renderEnrollmentEmail(vars as EmailTemplateVarsById["enrollment"]);
    case "custom":
      return renderCustomEmail(vars as EmailTemplateVarsById["custom"]);
    default: {
      const _exhaustive: never = id;
      throw new Error(`Unknown email template: ${_exhaustive}`);
    }
  }
}
