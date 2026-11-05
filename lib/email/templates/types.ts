export const EMAIL_TEMPLATE_IDS = [
  "welcome",
  "announcement",
  "reminder",
  "payment_reminder",
  "enrollment",
  "custom",
] as const;

export type EmailTemplateId = (typeof EMAIL_TEMPLATE_IDS)[number];

export const EMAIL_LOCALES = ["en", "ar"] as const;

export type EmailLocale = (typeof EMAIL_LOCALES)[number];

export type EmailSharedVars = {
  recipient_name: string;
  school_name: string;
  support_email: string;
  login_url: string;
  locale: EmailLocale;
  reference_code: string;
};

export type WelcomeTemplateVars = EmailSharedVars & {
  account_email: string;
  temporary_password: string;
};

export type AnnouncementTemplateVars = EmailSharedVars & {
  title: string;
  body: string;
  date?: string;
};

export type ReminderTemplateVars = EmailSharedVars & {
  item_name: string;
  due_at: string;
  consequence?: string;
  cta_url?: string;
};

export type PaymentReminderTemplateVars = EmailSharedVars & {
  amount: string;
  due_date: string;
  semester_label: string;
  contact_note?: string;
};

export type EnrollmentTemplateVars = EmailSharedVars & {
  semester_name: string;
  status: string;
  start_date: string;
  next_step: string;
};

export type CustomTemplateVars = EmailSharedVars & {
  subject: string;
  body: string;
  /** Trusted HTML from the full-customization Tiptap editor. */
  bodyHtml?: string;
};

export type EmailTemplateVarsById = {
  welcome: WelcomeTemplateVars;
  announcement: AnnouncementTemplateVars;
  reminder: ReminderTemplateVars;
  payment_reminder: PaymentReminderTemplateVars;
  enrollment: EnrollmentTemplateVars;
  custom: CustomTemplateVars;
};

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

export type EmailTemplateMeta = {
  id: EmailTemplateId;
  label: string;
  description: string;
};
