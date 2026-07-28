import {
  plainTextToHtmlParagraphs,
  wrapEmailLayout,
} from "@/lib/email/templates/layout";
import type {
  CustomTemplateVars,
  RenderedEmail,
} from "@/lib/email/templates/types";

export function renderCustomEmail(vars: CustomTemplateVars): RenderedEmail {
  const subject = vars.subject;
  const title = vars.subject;

  const htmlBody = vars.bodyHtml?.trim()
    ? vars.bodyHtml
    : plainTextToHtmlParagraphs(vars.body);
  const textBody = vars.body;

  const wrapped = wrapEmailLayout({
    title,
    htmlBody,
    textBody,
    referenceCode: vars.reference_code,
    locale: vars.locale,
  });

  return { subject, ...wrapped };
}
