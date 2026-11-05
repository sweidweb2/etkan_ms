import type { EmailLocale } from "@/lib/email/templates/types";

export const EMAIL_CIRCULAR_CONTACT = "asweid657@gmail.com";

export function isArabicLocale(locale: EmailLocale): boolean {
  return locale === "ar";
}

export function emailChrome(locale: EmailLocale) {
  if (isArabicLocale(locale)) {
    return {
      circularHeading: "تعميم إداري من إتقان",
      salutation: "عزيزي طالب إتقان،",
      additionalInfo: "للمزيد من المعلومات، يمكن للطلاب التواصل عبر:",
      signerName: "علي سويد",
      signerTitle: "إدارة إتقان",
      refLabel: "المرجع:",
      contactEmail: EMAIL_CIRCULAR_CONTACT,
      ctaSignIn: "تسجيل الدخول",
      ctaOpenDetails: "عرض التفاصيل",
      labels: {
        email: "البريد الإلكتروني",
        temporaryPassword: "كلمة المرور المؤقتة",
        date: "التاريخ",
        when: "الموعد",
        amount: "المبلغ",
        due: "الاستحقاق",
        startDate: "تاريخ البدء",
        nextStep: "الخطوة التالية",
      },
    };
  }

  return {
    circularHeading: "Etkan Administrative Circular",
    salutation: "Dear Etkan Student,",
    additionalInfo: "For additional information, students can contact:",
    signerName: "Ali Sweid",
    signerTitle: "Etkan Administration",
    refLabel: "Ref.:",
    contactEmail: EMAIL_CIRCULAR_CONTACT,
    ctaSignIn: "Sign in",
    ctaOpenDetails: "Open details",
    labels: {
      email: "Email",
      temporaryPassword: "Temporary password",
      date: "Date",
      when: "When",
      amount: "Amount",
      due: "Due",
      startDate: "Start date",
      nextStep: "Next step",
    },
  };
}
