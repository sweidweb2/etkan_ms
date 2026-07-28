import { EMAIL_BRAND } from "@/lib/email/templates/brand";
import { emailChrome, isArabicLocale } from "@/lib/email/templates/chrome";
import {
  escapeHtml,
  wrapEmailLayout,
} from "@/lib/email/templates/layout";
import type {
  PaymentReminderTemplateVars,
  RenderedEmail,
} from "@/lib/email/templates/types";

export function renderPaymentReminderEmail(
  vars: PaymentReminderTemplateVars
): RenderedEmail {
  const chrome = emailChrome(vars.locale);
  const isAr = isArabicLocale(vars.locale);
  const subject = isAr
    ? `تذكير بالدفع — ${vars.amount} مستحق في ${vars.due_date}`
    : `Payment reminder — ${vars.amount} due ${vars.due_date}`;
  const title = isAr ? "تذكير بالدفع" : "Payment reminder";
  const intro = isAr
    ? `هذا تذكير بخصوص دفعة قادمة أو مستحقة لـ ${vars.semester_label}.`
    : `This is a reminder about an upcoming or outstanding payment for ${vars.semester_label}.`;
  const introHtml = isAr
    ? `هذا تذكير بخصوص دفعة قادمة أو مستحقة لـ <strong>${escapeHtml(vars.semester_label)}</strong>.`
    : `This is a reminder about an upcoming or outstanding payment for <strong>${escapeHtml(vars.semester_label)}</strong>.`;

  const contactHtml = vars.contact_note?.trim()
    ? `<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:${EMAIL_BRAND.bodyText};">${escapeHtml(vars.contact_note.trim())}</p>`
    : "";
  const contactText = vars.contact_note?.trim()
    ? `\n\n${vars.contact_note.trim()}`
    : "";

  const htmlBody = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:${EMAIL_BRAND.bodyText};">
      ${introHtml}
    </p>
    <p style="margin:0 0 8px;font-size:16px;line-height:1.5;color:${EMAIL_BRAND.bodyText};">
      <strong>${escapeHtml(chrome.labels.amount)}:</strong> ${escapeHtml(vars.amount)}
    </p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:${EMAIL_BRAND.bodyText};">
      <strong>${escapeHtml(chrome.labels.due)}:</strong> ${escapeHtml(vars.due_date)}
    </p>
    ${contactHtml}
  `;

  const textBody = `${intro}

${chrome.labels.amount}: ${vars.amount}
${chrome.labels.due}: ${vars.due_date}${contactText}`;

  const wrapped = wrapEmailLayout({
    title,
    htmlBody,
    textBody,
    referenceCode: vars.reference_code,
    locale: vars.locale,
    cta: { label: chrome.ctaSignIn, url: vars.login_url },
  });

  return { subject, ...wrapped };
}
