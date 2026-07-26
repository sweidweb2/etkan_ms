import type { MessageKey } from "@/lib/i18n/messages/en";

export const ar = {
  "brand.name": "إتقان",
  "brand.description": "نظام إدارة المدارس",

  "nav.home": "الرئيسية",
  "nav.login": "تسجيل الدخول",
  "nav.register": "إنشاء حساب",
  "nav.dashboard": "لوحة التحكم",
  "nav.openMenu": "فتح القائمة",
  "nav.navigate": "التنقل في الموقع",
  "nav.language": "اللغة",

  "hero.title": "إدارة مدرسية منظمة بوضوح",
  "hero.subtitle":
    "الإدارة وشؤون الطلاب في مكان واحد—مصمم لعمل مدرستك اليومي.",
  "hero.ctaLogin": "تسجيل الدخول",
  "hero.ctaRegister": "إنشاء حساب",
  "hero.ctaDashboard": "الانتقال إلى لوحة التحكم",

  "auth.login.title": "تسجيل الدخول",
  "auth.login.description": "أدخل بياناتك للوصول إلى حسابك.",
  "auth.login.submit": "تسجيل الدخول",
  "auth.login.submitting": "جارٍ تسجيل الدخول…",
  "auth.login.noAccount": "ليس لديك حساب؟",
  "auth.login.signUpLink": "إنشاء حساب",

  "auth.signup.title": "إنشاء حساب",
  "auth.signup.description": "سجّل كطالب مع بيانات ملفك الشخصي.",
  "auth.signup.submit": "إنشاء حساب",
  "auth.signup.submitting": "جارٍ إنشاء الحساب…",
  "auth.signup.hasAccount": "لديك حساب بالفعل؟",
  "auth.signup.signInLink": "تسجيل الدخول",
  "auth.signup.backToSignIn": "العودة لتسجيل الدخول",

  "auth.field.email": "البريد الإلكتروني",
  "auth.field.password": "كلمة المرور",
  "auth.field.username": "اسم المستخدم",
  "auth.field.fullName": "الاسم الكامل",
  "auth.field.birthDate": "تاريخ الميلاد",
  "auth.field.phone": "الهاتف",
  "auth.field.confirmPassword": "تأكيد كلمة المرور",

  "auth.placeholder.email": "you@example.com",
  "auth.placeholder.username": "student_username",
  "auth.placeholder.fullName": "اسمك الكامل",
  "auth.placeholder.phone": "+961 ...",

  "auth.hint.username": "٣–٣٠ حرفًا، أحرف وأرقام وشرطة سفلية",
  "auth.hint.fullName": "٢–٨٠ حرفًا",
  "auth.hint.email": "بريد إلكتروني صالح، بحد أقصى ٢٥٤ حرفًا",
  "auth.hint.password": "٨–٧٢ حرفًا",
  "auth.hint.confirmPassword": "يجب أن تطابق كلمة المرور (٨–٧٢ حرفًا)",
  "auth.hint.phone": "اختياري، بحد أقصى ٢٠ حرفًا",
  "auth.hint.birthDate": "اختياري، لا يمكن أن يكون في المستقبل",

  "auth.loading": "جارٍ التحميل…",

  "maintenance.title": "وضع الصيانة",
  "maintenance.description":
    "التطبيق غير متاح مؤقتًا. يرجى المحاولة لاحقًا.",
  "maintenance.managerHint": "يمكن للمدير إيقافه من هنا:",
  "maintenance.settingsLink": "الإعدادات",

  "language.en": "EN",
  "language.ar": "ع",
} as const satisfies Record<MessageKey, string>;
