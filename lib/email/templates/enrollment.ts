import { EMAIL_BRAND } from "@/lib/email/templates/brand";
import { emailChrome, isArabicLocale } from "@/lib/email/templates/chrome";
import {
  escapeHtml,
  wrapEmailLayout,
} from "@/lib/email/templates/layout";
import type {
  EnrollmentTemplateVars,
  RenderedEmail,
} from "@/lib/email/templates/types";

export function renderEnrollmentEmail(
  vars: EnrollmentTemplateVars
): RenderedEmail {
  const chrome = emailChrome(vars.locale);
  const isAr = isArabicLocale(vars.locale);
  const subject = `${vars.status}: ${vars.semester_name}`;
  const title = isAr ? "تحديث التسجيل" : "Enrollment update";
  const statusLine = isAr
    ? `حالة تسجيلك في ${vars.semester_name} هي ${vars.status}.`
    : `Your enrollment status for ${vars.semester_name} is ${vars.status}.`;
  const statusLineHtml = isAr
    ? `حالة تسجيلك في <strong>${escapeHtml(vars.semester_name)}</strong> هي <strong>${escapeHtml(vars.status)}</strong>.`
    : `Your enrollment status for <strong>${escapeHtml(vars.semester_name)}</strong> is <strong>${escapeHtml(vars.status)}</strong>.`;

  const htmlBody = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:${EMAIL_BRAND.bodyText};">
      ${statusLineHtml}
    </p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:${EMAIL_BRAND.bodyText};">
      <strong>${escapeHtml(chrome.labels.startDate)}:</strong> ${escapeHtml(vars.start_date)}
    </p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:${EMAIL_BRAND.bodyText};">
      <strong>${escapeHtml(chrome.labels.nextStep)}:</strong> ${escapeHtml(vars.next_step)}
    </p>
  `;

  const textBody = `${statusLine}

${chrome.labels.startDate}: ${vars.start_date}
${chrome.labels.nextStep}: ${vars.next_step}`;

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
