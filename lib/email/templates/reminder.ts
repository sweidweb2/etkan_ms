import { EMAIL_BRAND } from "@/lib/email/templates/brand";
import { emailChrome, isArabicLocale } from "@/lib/email/templates/chrome";
import {
  escapeHtml,
  wrapEmailLayout,
} from "@/lib/email/templates/layout";
import type {
  ReminderTemplateVars,
  RenderedEmail,
} from "@/lib/email/templates/types";

export function renderReminderEmail(vars: ReminderTemplateVars): RenderedEmail {
  const chrome = emailChrome(vars.locale);
  const isAr = isArabicLocale(vars.locale);
  const subject = isAr
    ? `تذكير: ${vars.item_name} في ${vars.due_at}`
    : `Reminder: ${vars.item_name} on ${vars.due_at}`;
  const title = isAr ? "تذكير" : "Reminder";
  const aboutLine = isAr
    ? `هذا تذكير بخصوص ${vars.item_name}.`
    : `This is a reminder about ${vars.item_name}.`;
  const aboutLineHtml = isAr
    ? `هذا تذكير بخصوص <strong>${escapeHtml(vars.item_name)}</strong>.`
    : `This is a reminder about <strong>${escapeHtml(vars.item_name)}</strong>.`;

  const consequenceHtml = vars.consequence?.trim()
    ? `<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:${EMAIL_BRAND.bodyText};">${escapeHtml(vars.consequence.trim())}</p>`
    : "";
  const consequenceText = vars.consequence?.trim()
    ? `\n\n${vars.consequence.trim()}`
    : "";

  const htmlBody = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:${EMAIL_BRAND.bodyText};">
      ${aboutLineHtml}
    </p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:${EMAIL_BRAND.bodyText};">
      <strong>${escapeHtml(chrome.labels.when)}:</strong> ${escapeHtml(vars.due_at)}
    </p>
    ${consequenceHtml}
  `;

  const textBody = `${aboutLine}

${chrome.labels.when}: ${vars.due_at}${consequenceText}`;

  const wrapped = wrapEmailLayout({
    title,
    htmlBody,
    textBody,
    referenceCode: vars.reference_code,
    locale: vars.locale,
    cta: vars.cta_url?.trim()
      ? { label: chrome.ctaOpenDetails, url: vars.cta_url.trim() }
      : undefined,
  });

  return { subject, ...wrapped };
}
