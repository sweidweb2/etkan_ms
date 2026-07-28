import {
  escapeHtml,
  plainTextToHtmlParagraphs,
  wrapEmailLayout,
} from "@/lib/email/templates/layout";
import { EMAIL_BRAND } from "@/lib/email/templates/brand";
import { emailChrome } from "@/lib/email/templates/chrome";
import type {
  AnnouncementTemplateVars,
  RenderedEmail,
} from "@/lib/email/templates/types";

export function renderAnnouncementEmail(
  vars: AnnouncementTemplateVars
): RenderedEmail {
  const chrome = emailChrome(vars.locale);
  const subject = vars.title;
  const title = vars.title;
  const dateLine = vars.date?.trim()
    ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:${EMAIL_BRAND.muted};">${escapeHtml(chrome.labels.date)}: ${escapeHtml(vars.date.trim())}</p>`
    : "";
  const dateText = vars.date?.trim()
    ? `${chrome.labels.date}: ${vars.date.trim()}\n\n`
    : "";

  const htmlBody = `
    ${dateLine}
    ${plainTextToHtmlParagraphs(vars.body)}
  `;

  const textBody = `${dateText}${vars.body}`;

  const wrapped = wrapEmailLayout({
    title,
    htmlBody,
    textBody,
    referenceCode: vars.reference_code,
    locale: vars.locale,
  });

  return { subject, ...wrapped };
}
