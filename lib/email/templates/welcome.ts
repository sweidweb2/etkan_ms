import { EMAIL_BRAND } from "@/lib/email/templates/brand";
import { emailChrome, isArabicLocale } from "@/lib/email/templates/chrome";
import {
  escapeHtml,
  wrapEmailLayout,
} from "@/lib/email/templates/layout";
import type {
  RenderedEmail,
  WelcomeTemplateVars,
} from "@/lib/email/templates/types";

export function renderWelcomeEmail(vars: WelcomeTemplateVars): RenderedEmail {
  const chrome = emailChrome(vars.locale);
  const isAr = isArabicLocale(vars.locale);
  const subject = isAr
    ? `حسابك جاهز — ${vars.school_name}`
    : `Your account is ready — ${vars.school_name}`;
  const title = isAr ? "حسابك جاهز" : "Your account is ready";
  const intro = isAr
    ? `تم إنشاء حساب لك على ${vars.school_name}. استخدم التفاصيل أدناه لتسجيل الدخول.`
    : `An account has been created for you on ${vars.school_name}. Use the details below to sign in.`;
  const securityNote = isAr
    ? "لأمانك، غيّر كلمة المرور بعد أول تسجيل دخول."
    : "For security, change your password after your first login.";

  const htmlBody = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:${EMAIL_BRAND.bodyText};">
      ${escapeHtml(intro)}
    </p>
    <p style="margin:0 0 8px;font-size:16px;line-height:1.5;color:${EMAIL_BRAND.bodyText};">
      <strong>${escapeHtml(chrome.labels.email)}:</strong> ${escapeHtml(vars.account_email)}
    </p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:${EMAIL_BRAND.bodyText};">
      <strong>${escapeHtml(chrome.labels.temporaryPassword)}:</strong> ${escapeHtml(vars.temporary_password)}
    </p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:${EMAIL_BRAND.bodyText};">
      ${escapeHtml(securityNote)}
    </p>
  `;

  const textBody = `${intro}

${chrome.labels.email}: ${vars.account_email}
${chrome.labels.temporaryPassword}: ${vars.temporary_password}

${securityNote}`;

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
