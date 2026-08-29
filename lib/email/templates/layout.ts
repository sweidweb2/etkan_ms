import { SITE, getSiteUrl } from "@/lib/config/site";
import {
  EMAIL_BRAND,
  emailBrandBarBackground,
} from "@/lib/email/templates/brand";
import { emailChrome } from "@/lib/email/templates/chrome";
import type { EmailLocale } from "@/lib/email/templates/types";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function plainTextToHtmlParagraphs(body: string): string {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const withBreaks = escapeHtml(part).replaceAll("\n", "<br />");
      return `<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:${EMAIL_BRAND.bodyText};">${withBreaks}</p>`;
    });

  return paragraphs.join("") || "";
}

type LayoutContent = {
  title: string;
  htmlBody: string;
  textBody: string;
  referenceCode: string;
  cta?: { label: string; url: string };
  locale: EmailLocale;
};

/**
 * Absolute URL of the light lockup, which sits on the dark brand bars.
 * Returns null when no public origin is configured (local scripts, tests) so
 * the bars fall back to the text wordmark instead of a broken image.
 */
function brandLockupUrl(): string | null {
  try {
    return `${getSiteUrl()}/brand/wordmark-light.png`;
  } catch {
    return null;
  }
}

/** Lockup image for the brand bars, degrading to the text wordmark. */
function brandBarMark(
  lockupUrl: string | null,
  schoolName: string,
  width: number,
  fallbackStyle: string
): string {
  if (!lockupUrl) {
    return `<p style="margin:0;font-family:Arial,Helvetica,sans-serif;${fallbackStyle}color:${EMAIL_BRAND.onBrand};">${schoolName}</p>`;
  }

  const height = Math.round(width / (1800 / 688));
  return `<img src="${lockupUrl}" width="${width}" height="${height}" alt="${schoolName}" style="display:inline-block;border:0;outline:none;text-decoration:none;width:${width}px;height:${height}px;" />`;
}

function brandBarCellStyle(align: string, dir: string, textAlign: string) {
  return `padding:22px 28px;background-color:${EMAIL_BRAND.brand};background-image:${emailBrandBarBackground()};background-size:auto,auto,18px 18px,22px 22px;direction:${dir};text-align:${textAlign};`;
}

/** Administrative circular email shell (HTML + plain text). */
export function wrapEmailLayout(content: LayoutContent): {
  html: string;
  text: string;
} {
  const locale = content.locale ?? "en";
  const isRtl = locale === "ar";
  const chrome = emailChrome(locale);
  const dir = isRtl ? "rtl" : "ltr";
  const lang = isRtl ? "ar" : "en";
  const align = isRtl ? "right" : "left";
  const textAlign = isRtl ? "right" : "left";

  const schoolName = escapeHtml(SITE.name);
  const title = escapeHtml(content.title);
  const referenceCode = escapeHtml(content.referenceCode);
  const contactEmail = escapeHtml(chrome.contactEmail);
  const barStyle = brandBarCellStyle(align, dir, textAlign);
  const lockupUrl = brandLockupUrl();

  const ctaHtml = content.cta
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin:0;">
        <tr>
          <td align="${align}" style="padding:0;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-radius:6px;background:${EMAIL_BRAND.brand};">
                  <a href="${escapeHtml(content.cta.url)}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;line-height:1.25;color:${EMAIL_BRAND.onBrand};text-decoration:none;white-space:nowrap;">
                    ${escapeHtml(content.cta.label)}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${EMAIL_BRAND.pageBg};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${EMAIL_BRAND.pageBg};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${EMAIL_BRAND.cardBg};border:1px solid ${EMAIL_BRAND.border};">
          <tr>
            <td align="${align}" style="${barStyle}">
              ${brandBarMark(lockupUrl, schoolName, 150, "font-size:20px;font-weight:700;letter-spacing:0.02em;")}
              <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;color:rgba(255,255,255,0.82);">
                ${escapeHtml(chrome.circularHeading)}
              </p>
            </td>
          </tr>
          <tr>
            <td align="${align}" style="padding:28px 28px 8px;font-family:Arial,Helvetica,sans-serif;direction:${dir};text-align:${textAlign};">
              <p style="margin:0 0 4px;font-size:14px;line-height:1.5;color:${EMAIL_BRAND.muted};">
                ${escapeHtml(chrome.refLabel)} ${referenceCode}
              </p>
              <p style="margin:0 0 20px;font-size:14px;font-weight:600;line-height:1.5;color:${EMAIL_BRAND.brand};">
                ${escapeHtml(chrome.circularHeading)}
              </p>
              <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;color:${EMAIL_BRAND.text};">${title}</h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:${EMAIL_BRAND.bodyText};">
                ${escapeHtml(chrome.salutation)}
              </p>
              ${content.htmlBody}
            </td>
          </tr>
          ${
            content.cta
              ? `<tr>
            <td align="${align}" style="padding:8px 28px 20px;font-family:Arial,Helvetica,sans-serif;direction:${dir};text-align:${textAlign};">
              ${ctaHtml}
            </td>
          </tr>`
              : ""
          }
          <tr>
            <td align="${align}" style="padding:8px 28px 28px;font-family:Arial,Helvetica,sans-serif;direction:${dir};text-align:${textAlign};">
              <p style="margin:0 0 8px;font-size:16px;line-height:1.5;color:${EMAIL_BRAND.bodyText};">
                ${escapeHtml(chrome.additionalInfo)}
              </p>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.5;">
                <a href="mailto:${contactEmail}" style="color:${EMAIL_BRAND.brand};">${contactEmail}</a>
              </p>
              <p style="margin:0 0 4px;font-size:16px;line-height:1.5;color:${EMAIL_BRAND.text};font-weight:600;">
                ${escapeHtml(chrome.signerName)}
              </p>
              <p style="margin:0;font-size:14px;line-height:1.5;color:${EMAIL_BRAND.muted};">
                ${escapeHtml(chrome.signerTitle)}
              </p>
            </td>
          </tr>
          <tr>
            <td align="${align}" style="${barStyle}border-top:1px solid rgba(255,255,255,0.12);">
              ${brandBarMark(lockupUrl, schoolName, 104, "font-size:13px;font-weight:600;")}
              <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.45;color:rgba(255,255,255,0.78);">
                ${escapeHtml(chrome.signerTitle)} · ${contactEmail}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const ctaText = content.cta
    ? `\n\n${content.cta.label}: ${content.cta.url}`
    : "";

  const text = `${SITE.name}
${chrome.circularHeading}

${chrome.refLabel} ${content.referenceCode}
${chrome.circularHeading}

${content.title}

${chrome.salutation}

${content.textBody}${ctaText}

${chrome.additionalInfo}
${chrome.contactEmail}

${chrome.signerName}
${chrome.signerTitle}

—
${SITE.name}
${chrome.signerTitle} · ${chrome.contactEmail}`;

  return { html, text };
}
